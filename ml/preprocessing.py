import unicodedata
import pandas as pd


def _normalize(name: str) -> str:
    """Lowercase, strip accents, replace spaces/special chars with underscores."""
    name = unicodedata.normalize("NFD", str(name))
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    name = name.lower().strip()
    name = "".join(c if c.isalnum() else "_" for c in name)
    name = "_".join(part for part in name.split("_") if part)
    return name


_COLUMN_PATTERNS = {
    "date": ["date"],
    "quantity": ["qte", "quantite", "solde", "quantity", "qty"],
    "product_code": ["article", "product", "code", "produit", "ref"],
}


def _detect_column(normalized_columns: list[str], keywords: list[str]) -> str | None:
    """Return the first column name that contains any keyword."""
    for col in normalized_columns:
        for kw in keywords:
            if kw in col:
                return col
    return None


def load_and_clean_data(file_path: str) -> pd.DataFrame:
    """
    Load an Excel file, normalize columns, auto-detect key columns,
    convert types, and return a clean DataFrame ready for feature engineering.

    Raises:
        ValueError: with a descriptive message when required columns cannot be
                    found or the cleaned DataFrame is empty.
    """
    print(f"[PREPROCESS] Reading file: {file_path}")
    df = pd.read_excel(file_path, engine="openpyxl")
    print(f"[PREPROCESS] Raw shape: {df.shape}")
    print(f"[PREPROCESS] Raw columns: {list(df.columns)}")

    # Normalize column names
    original_cols = list(df.columns)
    normalized_cols = [_normalize(c) for c in original_cols]
    df.columns = normalized_cols
    print(f"[PREPROCESS] Normalized columns: {normalized_cols}")

    # Auto-detect key columns
    detected: dict[str, str] = {}
    for target, keywords in _COLUMN_PATTERNS.items():
        match = _detect_column(normalized_cols, keywords)
        if match:
            detected[target] = match
        else:
            print(f"[PREPROCESS] WARNING: no column detected for '{target}' (keywords: {keywords})")

    print(f"[PREPROCESS] Detected column mapping: {detected}")

    if "date" not in detected:
        raise ValueError(
            f"Could not detect a 'date' column. "
            f"Available columns: {normalized_cols}. "
            f"Expected one containing: {_COLUMN_PATTERNS['date']}"
        )
    if "quantity" not in detected:
        raise ValueError(
            f"Could not detect a 'quantity' column. "
            f"Available columns: {normalized_cols}. "
            f"Expected one containing: {_COLUMN_PATTERNS['quantity']}"
        )

    # Rename to canonical names
    rename_map = {v: k for k, v in detected.items()}
    df = df.rename(columns=rename_map)
    print(f"[PREPROCESS] Renamed columns: {list(df.columns)}")

    # Type conversions
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")

    before = len(df)
    df = df.dropna(subset=["date", "quantity"])
    df = df[df["quantity"] >= 0]
    after = len(df)
    print(f"[PREPROCESS] Dropped {before - after} invalid rows ({before} → {after})")

    if df.empty:
        raise Exception("DataFrame is empty after preprocessing")

    df = df.sort_values("date").reset_index(drop=True)

    print(f"[PREPROCESS] Final shape: {df.shape}")
    print(f"[PREPROCESS] Sample rows:\n{df.head(5).to_string()}")

    return df
