"""
generate_data.py — Générateur de données synthétiques · Med Oil
================================================================

Génère 5 ans de données fictives RÉALISTES au format exact des données
Med Oil réelles (même structure de colonnes, mêmes unités, même bruit).

Usage :
    python -m ml.generate_data                    # génère dans ml/data/
    python -m ml.generate_data --years 3          # 3 ans seulement
    python -m ml.generate_data --products 3       # 3 produits

Sorties :
    ml/data/synthetic_historical.xlsx    ← données 5 ans  (pour /train)
    ml/data/synthetic_metadata.xlsx      ← métadonnées    (pour /product-metadata)
"""

from __future__ import annotations

import argparse
import os
import sys
import warnings
from datetime import date, timedelta

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Catalogue de produits Med Oil (calibré sur les vraies données)
# ---------------------------------------------------------------------------
PRODUCTS = [
    {
        "code":          "AFA050F002",
        "name":          "HUILE DE FRITURE 5L",
        "category":      "H_cond",
        "base_monthly":  185_000,    # unités/mois (calibré sur données réelles)
        "shelf_life_days":     365,
        "lead_time_days":       30,
        "current_stock":   210_000,
        "min_order_qty":    50_000,
        "prod_lead_days":       14,
        "prix_revient":       20.50,
    },
    {
        "code":          "AFA025F001",
        "name":          "HUILE VÉGÉTALE 2.5L",
        "category":      "H_cond",
        "base_monthly":  120_000,
        "shelf_life_days":     365,
        "lead_time_days":       28,
        "current_stock":   95_000,
        "min_order_qty":    30_000,
        "prod_lead_days":       14,
        "prix_revient":       11.20,
    },
    {
        "code":          "AFB010H003",
        "name":          "HUILE D'OLIVE 1L",
        "category":      "H_olive",
        "base_monthly":   55_000,
        "shelf_life_days":     540,
        "lead_time_days":       45,
        "current_stock":   40_000,
        "min_order_qty":    10_000,
        "prod_lead_days":       21,
        "prix_revient":       38.90,
    },
    {
        "code":          "AFC005M004",
        "name":          "MARGARINE 500G",
        "category":      "Margarine",
        "base_monthly":   42_000,
        "shelf_life_days":     180,
        "lead_time_days":       21,
        "current_stock":   18_000,   # stock bas → alerte intéressante
        "min_order_qty":    10_000,
        "prod_lead_days":       10,
        "prix_revient":        8.75,
    },
    {
        "code":          "AFD001B005",
        "name":          "BEURRE 1KG",
        "category":      "Beurre",
        "base_monthly":   28_000,
        "shelf_life_days":      90,  # durée de vie courte → contrainte DV forte
        "lead_time_days":       14,
        "current_stock":    3_500,   # stock très bas → CRITIQUE
        "min_order_qty":     5_000,
        "prod_lead_days":        7,
        "prix_revient":       22.30,
    },
]

# ---------------------------------------------------------------------------
# Saisonnalité mensuelle (marché tunisien huiles alimentaires)
# Ramadan effect (mars/avril) + été (juil/août)
# ---------------------------------------------------------------------------
SEASONAL = {
    1: 0.88,  2: 0.82,  3: 1.05,   # Ramadan souvent mars/avril
    4: 1.12,  5: 0.98,  6: 1.05,
    7: 1.22,  8: 1.28,  9: 1.08,   # pic estival
    10: 0.95, 11: 0.90, 12: 0.97,
}

# Facteur de croissance annuelle
YEARLY_GROWTH = 0.048   # +4.8 % / an


# ===========================================================================
# Génération des données historiques
# ===========================================================================

def generate_historical(
    n_years: int = 5,
    n_products: int = 5,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Génère n_years × n_products × ~300 transactions/mois de données fictives.

    Structure identique au fichier réel Med Oil (séparateur ;).

    Colonnes générées :
      Code article | Date | Desc Art | Ecart qté emp. | Solde | ...
    """
    rng   = np.random.default_rng(seed)
    prods = PRODUCTS[:n_products]

    end_date   = date.today().replace(day=1) - timedelta(days=1)   # fin = mois dernier
    start_date = end_date.replace(year=end_date.year - n_years, month=1, day=1)

    print(f"[GEN] Generation {n_years} ans | {n_products} produits")
    print(f"[GEN] Periode : {start_date} -> {end_date}")

    all_rows: list[dict] = []

    for prod in prods:
        base_monthly = prod["base_monthly"]
        code         = prod["code"]
        name         = prod["name"]
        prix         = prod["prix_revient"]

        # Stock initial simulé
        running_solde = base_monthly * 1.5

        current = start_date
        while current <= end_date:
            # Facteurs de la journée
            year_offset    = current.year - start_date.year
            seasonal_f     = SEASONAL[current.month]
            trend_f        = (1 + YEARLY_GROWTH) ** year_offset

            # Demande journalière théorique
            daily_base     = base_monthly / 30.0 * seasonal_f * trend_f

            # Pas de livraison le vendredi/samedi (week-end tunisien)
            if current.weekday() in (4, 5):
                current += timedelta(days=1)
                continue

            # Nombre de transactions ce jour (Poisson)
            n_tx = max(1, int(rng.poisson(8)))

            # Répartition de la demande journalière entre transactions
            weights = rng.dirichlet(np.ones(n_tx))
            tx_qtys = (weights * daily_base * rng.lognormal(0, 0.15)).astype(int)
            tx_qtys = np.maximum(tx_qtys, 1)

            for i, qty in enumerate(tx_qtys):
                running_solde -= qty
                running_solde  = max(running_solde, 0)

                # Restocking automatique quand le solde descend trop bas
                if running_solde < base_monthly * 0.5:
                    restock       = int(base_monthly * rng.uniform(0.8, 1.2))
                    running_solde += restock

                all_rows.append({
                    "Code article":    code,
                    "Ligne prod.":     "3014",
                    "Date":            current.strftime("%d/%m/%Y"),
                    "Desc Art":        name,
                    "Type trans":      "ISS-SO",
                    "Qte":             qty,             # positif = quantité consommée
                    "Ecart qte emp":   -qty,            # négatif pour fidélité au format réel
                    "Solde":           round(running_solde, 2),
                    "cout de revient": prix,
                    "Tot amt":         round(qty * prix, 3),
                    "Unité de mesure": "UN",
                    "TYPE ARTICLE":    prod["category"],
                })

            current += timedelta(days=1)

    df = pd.DataFrame(all_rows)
    print(f"[GEN] Lignes générées : {len(df):,}")
    print(f"[GEN] Produits : {df['Code article'].unique().tolist()}")
    _print_monthly_summary(df)
    return df


def _print_monthly_summary(df: pd.DataFrame) -> None:
    """Affiche un résumé mensuel par produit."""
    df2       = df.copy()
    df2["qty_abs"] = df2["Qte"]   # colonne positive générée
    df2["date_p"]  = pd.to_datetime(df2["Date"], format="%d/%m/%Y")
    df2["month"]   = df2["date_p"].dt.to_period("M")

    monthly = (
        df2.groupby(["Code article", "month"])["qty_abs"]
        .sum()
        .reset_index()
    )
    print("\n[GEN] Aperçu mensuel (3 premiers mois / produit) :")
    for code in df2["Code article"].unique():
        subset = monthly[monthly["Code article"] == code].head(3)
        vals   = ", ".join(f"{r['month']}={r['qty_abs']:,.0f}" for _, r in subset.iterrows())
        print(f"       {code}: {vals}")


# ===========================================================================
# Génération des métadonnées produits
# ===========================================================================

def generate_metadata(n_products: int = 5) -> pd.DataFrame:
    """
    Génère le fichier métadonnées avec DV, délais, stocks actuels.

    Structure compatible avec POST /product-metadata.
    """
    prods = PRODUCTS[:n_products]
    rows  = []
    for p in prods:
        rows.append({
            "product_code":              p["code"],
            "shelf_life_days":           p["shelf_life_days"],
            "lead_time_days":            p["lead_time_days"],
            "current_stock":             p["current_stock"],
            "min_order_qty":             p["min_order_qty"],
            "production_lead_time_days": p["prod_lead_days"],
        })
    return pd.DataFrame(rows)


# ===========================================================================
# Sauvegarde
# ===========================================================================

def save_to_excel(df: pd.DataFrame, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_excel(path, index=False, engine="openpyxl")
    size_kb = os.path.getsize(path) / 1024
    print(f"[GEN] OK Sauvegarde : {path}  ({size_kb:.1f} Ko, {len(df):,} lignes)")


# ===========================================================================
# Entrypoint
# ===========================================================================

def main():
    parser = argparse.ArgumentParser(description="Générateur de données synthétiques Med Oil")
    parser.add_argument("--years",    type=int, default=5, help="Nombre d'années (défaut: 5)")
    parser.add_argument("--products", type=int, default=5, help="Nombre de produits (défaut: 5)")
    parser.add_argument("--seed",     type=int, default=42, help="Graine aléatoire")
    parser.add_argument("--outdir",   type=str, default="ml/data", help="Répertoire de sortie")
    args = parser.parse_args()

    print("=" * 60)
    print("  MED OIL - Generateur de donnees synthetiques")
    print("=" * 60)

    # Données historiques
    df_hist = generate_historical(
        n_years=args.years,
        n_products=args.products,
        seed=args.seed,
    )

    hist_path = os.path.join(args.outdir, "synthetic_historical.xlsx")
    save_to_excel(df_hist, hist_path)

    # Métadonnées
    df_meta = generate_metadata(n_products=args.products)
    meta_path = os.path.join(args.outdir, "synthetic_metadata.xlsx")
    save_to_excel(df_meta, meta_path)

    print("\n[GEN] Fichiers prêts pour le test :")
    print(f"       Historique : {hist_path}")
    print(f"       Métadonnées: {meta_path}")
    print("=" * 60)

    return hist_path, meta_path


if __name__ == "__main__":
    main()
