import unicodedata
import joblib
import os
import pandas as pd

# Chemin de sauvegarde des métadonnées produits
_MODEL_DIR        = os.path.join(os.path.dirname(__file__), "models")
METADATA_PATH     = os.path.join(_MODEL_DIR, "product_metadata.joblib")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize(name: str) -> str:
    """Lowercase, strip accents, collapse non-alphanum to underscores."""
    name = unicodedata.normalize("NFD", str(name))
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    name = name.lower().strip()
    name = "".join(c if c.isalnum() else "_" for c in name)
    return "_".join(p for p in name.split("_") if p)


_COLUMN_PATTERNS = {
    "date":         ["date"],
    "quantity":     ["qte", "quantite", "solde", "quantity", "qty", "montant"],
    "product_code": ["article", "product", "code", "produit", "ref", "designation"],
}


def _detect_column(cols: list[str], keywords: list[str]) -> str | None:
    for col in cols:
        for kw in keywords:
            if kw in col:
                return col
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_and_clean_data(file_path: str) -> pd.DataFrame:
    """
    Load an Excel file, auto-detect columns, clean types, and return a
    row-level DataFrame with canonical columns: date, quantity, [product_code].
    """
    print(f"[PREPROCESS] Reading: {file_path}")

    # Support very large files by reading in one shot (openpyxl streams)
    df = pd.read_excel(file_path, engine="openpyxl")
    print(f"[PREPROCESS] Raw shape: {df.shape}")
    print(f"[PREPROCESS] Raw columns: {list(df.columns)}")

    # Normalize column names
    df.columns = [_normalize(c) for c in df.columns]
    norm_cols = list(df.columns)
    print(f"[PREPROCESS] Normalized columns: {norm_cols}")

    # Auto-detect key columns
    detected: dict[str, str] = {}
    for target, keywords in _COLUMN_PATTERNS.items():
        match = _detect_column(norm_cols, keywords)
        if match:
            detected[target] = match
        else:
            print(f"[PREPROCESS] WARNING: no match for '{target}' (tried: {keywords})")

    print(f"[PREPROCESS] Column mapping: {detected}")

    if "date" not in detected:
        raise ValueError(
            f"Cannot detect a date column. Columns found: {norm_cols}. "
            f"Expected one containing: {_COLUMN_PATTERNS['date']}"
        )
    if "quantity" not in detected:
        raise ValueError(
            f"Cannot detect a quantity column. Columns found: {norm_cols}. "
            f"Expected one containing: {_COLUMN_PATTERNS['quantity']}"
        )

    df = df.rename(columns={v: k for k, v in detected.items()})

    # Type conversion
    df["date"]     = pd.to_datetime(df["date"], errors="coerce")
    df["quantity"] = pd.to_numeric(
        df["quantity"].astype(str)
        .str.replace(r"\s", "", regex=True)   # retire les espaces (ex: "1 200")
        .str.replace(",", ".", regex=False),  # virgule décimale → point
        errors="coerce",
    )

    before = len(df)
    df = df.dropna(subset=["date", "quantity"])

    # Si la colonne contient majoritairement des négatifs (format réel Med Oil :
    # "Ecart qté emp." = consommation négative), on prend la valeur absolue.
    neg_ratio = (df["quantity"] < 0).mean()
    if neg_ratio > 0.5:
        print(f"[PREPROCESS] Colonne quantité majoritairement négative ({neg_ratio:.0%}) "
              f"→ valeur absolue appliquée (format consommation détecté)")
        df["quantity"] = df["quantity"].abs()

    df = df[df["quantity"] > 0]
    print(f"[PREPROCESS] Supprimé {before - len(df)} lignes invalides ({before} → {len(df)})")

    if df.empty:
        raise Exception("DataFrame is empty after preprocessing")

    df = df.sort_values("date").reset_index(drop=True)
    print(f"[PREPROCESS] Final shape: {df.shape}")
    print(f"[PREPROCESS] Date range: {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"[PREPROCESS] Sample:\n{df.head(3).to_string()}")
    return df


def aggregate_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate row-level data into monthly totals.

    Returns a DataFrame with columns:
        year_month (Period), year, month, quarter, quantity
        [product_code, product_encoded] — if product_code exists in df
    """
    df = df.copy()
    df["year_month"] = df["date"].dt.to_period("M")

    has_product = "product_code" in df.columns

    if has_product:
        df["product_code"] = df["product_code"].astype(str).str.strip().fillna("UNKNOWN")
        group_cols = ["year_month", "product_code"]
    else:
        group_cols = ["year_month"]

    monthly = (
        df.groupby(group_cols)["quantity"]
        .sum()
        .reset_index()
        .rename(columns={"quantity": "quantity"})
    )

    monthly["year"]    = monthly["year_month"].dt.year
    monthly["month"]   = monthly["year_month"].dt.month
    monthly["quarter"] = monthly["year_month"].dt.quarter

    if has_product:
        # Stable integer encoding (sorted alphabetically so it's reproducible)
        codes = sorted(monthly["product_code"].unique())
        code_map = {c: i for i, c in enumerate(codes)}
        monthly["product_encoded"] = monthly["product_code"].map(code_map)

    monthly = monthly.sort_values(
        ["product_code", "year_month"] if has_product else ["year_month"]
    ).reset_index(drop=True)

    print(f"[PREPROCESS] Monthly aggregate shape: {monthly.shape}")
    print(f"[PREPROCESS] Year range: {monthly['year'].min()} → {monthly['year'].max()}")
    if has_product:
        print(f"[PREPROCESS] Products detected: {len(monthly['product_code'].unique())}")

    return monthly


# ===========================================================================
# Métadonnées produits (durée de vie, délai appro, stock actuel…)
# ===========================================================================

# Patterns de détection des colonnes du fichier métadonnées
_META_PATTERNS: dict[str, list[str]] = {
    "product_code":              ["product_code", "code", "article", "produit", "ref", "designation"],
    "shelf_life_days":           ["shelf_life", "duree_vie", "dlc", "durée_vie", "duree", "vie", "shelf"],
    "lead_time_days":            ["lead_time", "delai", "lead", "approvisionnement", "fournisseur"],
    "current_stock":             ["current_stock", "stock_actuel", "stock", "inventaire", "existant", "disponible"],
    "min_order_qty":             ["min_order", "min_qty", "minimum", "qte_min", "commande_min", "lot_min"],
    "production_lead_time_days": ["prod_lead", "production_lead", "delai_prod", "lead_prod", "fabrication"],
}

# Valeurs par défaut si colonne absente du fichier Excel
_META_DEFAULTS: dict[str, float] = {
    "shelf_life_days":           365.0,   # 1 an
    "lead_time_days":            30.0,    # 1 mois
    "current_stock":             0.0,
    "min_order_qty":             0.0,
    "production_lead_time_days": 14.0,   # 2 semaines
}


def load_product_metadata(file_path: str) -> pd.DataFrame:
    """
    Charge un fichier Excel de métadonnées produits.

    Colonnes reconnues automatiquement (noms flexibles) :
      - product_code              : code / référence du produit
      - shelf_life_days           : durée de vie en jours  (ex. 180)
      - lead_time_days            : délai d'appro fournisseur en jours (ex. 30)
      - current_stock             : stock actuel (ex. 500)
      - min_order_qty             : quantité minimale de commande (ex. 100)
      - production_lead_time_days : délai de production interne en jours (ex. 14)

    Toutes les colonnes sauf product_code sont optionnelles ;
    des valeurs par défaut sont appliquées si absentes.

    Returns:
        DataFrame avec index = product_code et colonnes numériques nettoyées.
    """
    print(f"[META] Lecture : {file_path}")
    df = pd.read_excel(file_path, engine="openpyxl")
    print(f"[META] Forme brute : {df.shape}")
    print(f"[META] Colonnes brutes : {list(df.columns)}")

    # Normalisation des noms de colonnes
    df.columns = [_normalize(c) for c in df.columns]
    norm_cols  = list(df.columns)

    # Détection automatique
    detected: dict[str, str] = {}
    for target, keywords in _META_PATTERNS.items():
        match = _detect_column(norm_cols, keywords)
        if match:
            detected[target] = match

    print(f"[META] Mapping détecté : {detected}")

    if "product_code" not in detected:
        raise ValueError(
            f"Colonne 'product_code' introuvable dans les métadonnées. "
            f"Colonnes trouvées : {norm_cols}. "
            f"Noms acceptés : {_META_PATTERNS['product_code']}"
        )

    df = df.rename(columns={v: k for k, v in detected.items()})
    df["product_code"] = df["product_code"].astype(str).str.strip()

    # Appliquer les valeurs par défaut pour les colonnes manquantes
    for col, default in _META_DEFAULTS.items():
        if col not in df.columns:
            print(f"[META] Colonne '{col}' absente → défaut = {default}")
            df[col] = default
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(default)

    df = df.drop_duplicates(subset=["product_code"]).set_index("product_code")
    print(f"[META] {len(df)} produits chargés : {list(df.index[:10])}")
    return df


def save_product_metadata(meta_df: pd.DataFrame) -> None:
    """Persiste les métadonnées produits à côté du modèle ML."""
    os.makedirs(_MODEL_DIR, exist_ok=True)
    joblib.dump(meta_df, METADATA_PATH)
    print(f"[META] Sauvegardé → {METADATA_PATH}")


def load_saved_metadata() -> pd.DataFrame | None:
    """Charge les métadonnées sauvegardées. Retourne None si inexistantes."""
    if not os.path.exists(METADATA_PATH):
        return None
    meta = joblib.load(METADATA_PATH)
    print(f"[META] Chargé depuis {METADATA_PATH} ({len(meta)} produits)")
    return meta
