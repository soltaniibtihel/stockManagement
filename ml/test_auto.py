"""
test_auto.py — Test automatique complet · Med Oil ML
=====================================================

Lance le serveur FastAPI, génère les données synthétiques, appelle tous les
endpoints et affiche les résultats de façon lisible.

Usage :
    python -m ml.test_auto                       # test complet 5 ans / 5 produits
    python -m ml.test_auto --years 3             # 3 ans de données
    python -m ml.test_auto --horizon 9           # plan 9 mois
    python -m ml.test_auto --no-server           # si uvicorn tourne déjà
    python -m ml.test_auto --port 8001           # port personnalisé

Ce que le script fait automatiquement :
  1. Génère 5 ans de données fictives (Excel)
  2. Génère le fichier métadonnées produits (Excel)
  3. Lance uvicorn en arrière-plan
  4. POST /train          → entraîne le modèle
  5. POST /product-metadata → charge DV, délais, stocks
  6. GET  /inventory-plan → plan complet (3-12 mois)
  7. GET  /reorder-alerts → alertes urgentes
  8. Affiche tout de façon structurée et lisible
  9. Arrête le serveur
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import textwrap
from pathlib import Path

# Force UTF-8 output on Windows (cmd / PowerShell)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
VENV_PY    = BASE_DIR / "venv" / "Scripts" / "python.exe"
SYS_PY     = sys.executable

# Utiliser le Python du venv si disponible, sinon le Python courant
PYTHON_EXE = str(VENV_PY) if VENV_PY.exists() else SYS_PY

HIST_FILE  = DATA_DIR / "synthetic_historical.xlsx"
META_FILE  = DATA_DIR / "synthetic_metadata.xlsx"

# Couleurs terminal (désactivé sur Windows sans VT)
_USE_COLOR = sys.platform != "win32" or os.environ.get("TERM")

def _c(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text

GREEN  = lambda t: _c(t, "92")
RED    = lambda t: _c(t, "91")
YELLOW = lambda t: _c(t, "93")
CYAN   = lambda t: _c(t, "96")
BOLD   = lambda t: _c(t, "1")
DIM    = lambda t: _c(t, "2")


# ===========================================================================
# ÉTAPE 0 — Génération des données
# ===========================================================================

def step_generate(years: int, products: int) -> tuple[Path, Path]:
    """Génère les fichiers Excel de test."""
    sep()
    print(BOLD("ÉTAPE 0 · Génération des données synthétiques"))
    print(f"         {years} ans × {products} produits")
    print()

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Import direct du générateur (pas de HTTP nécessaire)
    sys.path.insert(0, str(BASE_DIR.parent))
    from ml.generate_data import generate_historical, generate_metadata, save_to_excel

    df_hist = generate_historical(n_years=years, n_products=products)
    save_to_excel(df_hist, str(HIST_FILE))

    df_meta = generate_metadata(n_products=products)
    save_to_excel(df_meta, str(META_FILE))

    ok(f"Historique : {HIST_FILE.name}  ({len(df_hist):,} lignes)")
    ok(f"Métadonnées: {META_FILE.name}  ({len(df_meta)} produits)")
    return HIST_FILE, META_FILE


# ===========================================================================
# ÉTAPE 1 — Démarrage du serveur
# ===========================================================================

def step_start_server(port: int) -> subprocess.Popen | None:
    """Lance uvicorn en sous-process. Retourne None si déjà en cours."""
    sep()
    print(BOLD(f"ÉTAPE 1 · Démarrage du serveur  (port {port})"))
    print()

    # Vérifier si le serveur tourne déjà
    try:
        r = requests.get(f"http://127.0.0.1:{port}/health", timeout=2)
        if r.status_code == 200:
            ok("Serveur déjà en cours d'exécution — skip")
            return None
    except requests.exceptions.ConnectionError:
        pass

    project_root = str(BASE_DIR.parent)
    cmd = [
        PYTHON_EXE, "-m", "uvicorn",
        "ml.main:app",
        "--host", "127.0.0.1",
        "--port", str(port),
        "--log-level", "warning",
    ]
    print(DIM(f"  Commande : {' '.join(cmd)}"))

    proc = subprocess.Popen(
        cmd,
        cwd=project_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Attendre que le serveur soit prêt (max 30 s)
    deadline = time.time() + 30
    while time.time() < deadline:
        time.sleep(0.8)
        try:
            r = requests.get(f"http://127.0.0.1:{port}/health", timeout=2)
            if r.status_code == 200:
                ok("Serveur démarré ✓")
                return proc
        except requests.exceptions.ConnectionError:
            pass
        print("  ... en attente", end="\r")

    proc.terminate()
    err("Impossible de démarrer le serveur après 30 s")
    stderr_out = proc.stderr.read().decode(errors="ignore")
    print(DIM(stderr_out[-2000:]))
    sys.exit(1)


# ===========================================================================
# ÉTAPE 2 — POST /train
# ===========================================================================

def step_train(base_url: str, hist_file: Path) -> dict:
    sep()
    print(BOLD("ÉTAPE 2 · Entraînement du modèle  →  POST /train"))
    print()

    with open(hist_file, "rb") as f:
        r = requests.post(
            f"{base_url}/train",
            files={"file": (hist_file.name, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            timeout=600,   # 10 min — gros fichier Excel
        )

    data = _check(r, "Train")

    ok(f"Modèle : {data.get('model_type', '?')}")
    ok(f"Lignes brutes : {data.get('rows_raw', '?'):,}")
    ok(f"Points mensuels : {data.get('rows_monthly', '?'):,}")
    ok(f"Période : {data['date_range']['from']} → {data['date_range']['to']}")
    metrics = data.get("metrics", {})
    ok(f"R²={metrics.get('r2','?')}  RMSE={metrics.get('rmse','?')}  MAE={metrics.get('mae','?')}")
    return data


# ===========================================================================
# ÉTAPE 3 — POST /product-metadata
# ===========================================================================

def step_metadata(base_url: str, meta_file: Path) -> dict:
    sep()
    print(BOLD("ÉTAPE 3 · Métadonnées produits  →  POST /product-metadata"))
    print()

    with open(meta_file, "rb") as f:
        r = requests.post(
            f"{base_url}/product-metadata",
            files={"file": (meta_file.name, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            timeout=30,
        )

    data = _check(r, "Metadata")

    ok(f"Produits chargés : {data['products_loaded']}")
    print()
    _print_table(
        ["Code", "DV (j)", "Délai (j)", "Stock actuel", "Qté min"],
        [
            [
                p["product_code"],
                p["shelf_life_days"],
                p["lead_time_days"],
                f"{p['current_stock']:,.0f}",
                f"{p['min_order_qty']:,.0f}",
            ]
            for p in data["products"]
        ],
    )
    return data


# ===========================================================================
# ÉTAPE 4 — GET /inventory-plan
# ===========================================================================

def step_inventory_plan(base_url: str, horizon: int) -> dict:
    sep()
    print(BOLD(f"ÉTAPE 4 · Plan d'inventaire  →  GET /inventory-plan?horizon_months={horizon}"))
    print()

    r = requests.get(
        f"{base_url}/inventory-plan",
        params={"horizon_months": horizon},
        timeout=60,
    )
    data = _check(r, "Inventory Plan")

    # --- Résumé ---
    summary = data["summary"]
    print(BOLD("  ┌─ Résumé global ──────────────────────────────────────┐"))
    print(f"  │  Horizon          : {summary['horizon_months']} mois")
    print(f"  │  Demande totale   : {summary['total_forecast_demand']:>12,.0f} unités")
    print(f"  │  Produits OK      : {summary['OK']}")
    print(f"  │  À planifier      : {summary['PLANIFIER']}")
    print(f"  │  Commander maint. : {YELLOW(str(summary['COMMANDER_MAINTENANT']))}")
    print(f"  │  CRITIQUES        : {RED(str(summary['CRITIQUE']))}")
    print(f"  │  Généré le        : {summary['generated_at']}")
    print(BOLD("  └──────────────────────────────────────────────────────┘"))

    # --- Prévisions mensuelles globales ---
    print()
    print(BOLD("  ▶ Prévision mensuelle (tous produits) :"))
    forecast = data["forecast"]["monthly_breakdown"]
    rows_f   = [[r["month"], f"{r['predicted_demand']:,.0f}"] for r in forecast]
    _print_table(["Mois", "Demande prédite"], rows_f, indent=4)

    # --- Détail par produit ---
    print()
    print(BOLD("  ▶ Détail par produit :"))
    print()

    for prod in data["products"]:
        _print_product_plan(prod)

    return data


def _print_product_plan(prod: dict) -> None:
    code      = prod["product_code"]
    status    = prod["status"]
    ma        = prod["mouvement_achat"]
    pt        = prod["lancement_production"]

    status_fmt = {
        "CRITIQUE":            RED(BOLD("🔴 CRITIQUE")),
        "COMMANDER_MAINTENANT": YELLOW(BOLD("🟡 COMMANDER MAINTENANT")),
        "PLANIFIER":            CYAN("🔵 PLANIFIER"),
        "OK":                   GREEN("🟢 OK"),
    }.get(status, status)

    print(f"  ┌─ {BOLD(code)} ─── {status_fmt}")
    print(f"  │  Stock actuel       : {prod['current_stock']:>12,.0f}")
    print(f"  │  Stock de sécurité  : {prod['safety_stock']:>12,.0f}")
    print(f"  │  Point de commande  : {prod['reorder_point']:>12,.0f}")
    print(f"  │  Demande moy/mois   : {prod['avg_monthly_demand']:>12,.0f}")
    print(f"  │  Prévision ({prod['horizon_months']}m)     : {prod['total_forecast_demand']:>12,.0f}")
    print(f"  │  Durée de vie       : {ma.get('shelf_life_days', '?')} jours")
    print(f"  │")
    qty_str      = "{:,.0f}".format(ma["quantity_to_order"])
    max_dv_str   = "{:,.0f}".format(ma["max_qty_dv"])
    print(f"  │  ── MOUVEMENT D'ACHAT ──────────────────────────────")
    print(f"  │  Quantité à commander  : {BOLD(qty_str)}")
    print(f"  │  Qté max (DV)          : {max_dv_str}")
    print(f"  │  Mois couverts         : {ma['covers_months']}")
    print(f"  │  Délai fournisseur     : {ma['lead_time_days']} jours")
    print(f"  │  Livraison estimée     : {BOLD(ma['estimated_delivery'])}")
    print(f"  │  Urgence               : {_urgency_fmt(ma['urgency'])}")
    print(f"  │  Déclencher maintenant : {RED('OUI') if ma['trigger_now'] else GREEN('NON')}")
    print(f"  │")
    print(f"  │  ── LANCEMENT PRODUCTION ───────────────────────────")
    prod_flag = RED("OUI — LANCER MAINTENANT") if pt["should_launch_now"] else f"NON (dans {pt['days_until_launch']}j)"
    print(f"  │  Lancer maintenant      : {prod_flag}")
    print(f"  │  Date estimée           : {pt['launch_date_estimated']}")
    print(f"  │  Délai de production    : {pt['production_lead_time_days']} jours")
    print(f"  │")
    print(f"  │  ── PROJECTION STOCK ({prod['horizon_months']} mois) ──────────────────")
    timeline = prod.get("stock_timeline", [])
    rows_t   = [[t["month"], f"{t['predicted_demand']:,.0f}", f"{t['projected_stock']:,.0f}", t["alert"]]
                for t in timeline]
    _print_table(["Mois", "Demande", "Stock proj.", "Alerte"], rows_t, indent=4)
    print()


# ===========================================================================
# ÉTAPE 5 — GET /reorder-alerts
# ===========================================================================

def step_reorder_alerts(base_url: str) -> dict:
    sep()
    print(BOLD("ÉTAPE 5 · Alertes de réapprovisionnement  →  GET /reorder-alerts"))
    print()

    r = requests.get(f"{base_url}/reorder-alerts", timeout=30)
    data = _check(r, "Reorder Alerts")

    total = data["total_alerts"]
    if total == 0:
        ok("Aucune alerte — tous les stocks sont suffisants")
        return data

    print(f"  {RED(f'{total} alerte(s) urgente(s)')} "
          f"[Critique={data['critique']}  Urgent={data['commander_maintenant']}]")
    print()

    for a in data["alerts"]:
        code   = a["product_code"]
        status = a["status"]
        ma     = a["mouvement_achat"]
        pt     = a["lancement_production"]

        status_fmt = RED(BOLD("🔴 CRITIQUE")) if status == "CRITIQUE" else YELLOW(BOLD("🟡 COMMANDER MAINTENANT"))
        print(f"  ► {BOLD(code)} — {status_fmt}")
        print(f"    Stock actuel     : {a['current_stock']:,.0f}")
        print(f"    Stock sécurité   : {a['safety_stock']:,.0f}")
        print(f"    Point commande   : {a['reorder_point']:,.0f}")
        qty_alert = "{:,.0f}".format(ma["quantity_to_order"])
        print(f"    → Commander      : {BOLD(qty_alert)} unités")
        print(f"    → Livraison      : {ma['estimated_delivery']}")
        if pt["should_launch_now"]:
            print(f"    → Production     : {RED('LANCER MAINTENANT')}")
        print()

    return data


# ===========================================================================
# UTILITAIRES
# ===========================================================================

def _check(r: requests.Response, label: str) -> dict:
    if r.status_code != 200:
        err(f"{label} → HTTP {r.status_code}")
        try:
            detail = r.json().get("detail", r.text)
        except Exception:
            detail = r.text
        print(RED(textwrap.indent(str(detail)[:1000], "  ")))
        sys.exit(1)
    return r.json()


def _print_table(headers: list[str], rows: list[list], indent: int = 2) -> None:
    pad    = " " * indent
    widths = [max(len(str(h)), max((len(str(r[i])) for r in rows), default=0))
              for i, h in enumerate(headers)]
    sep_   = pad + "+-" + "-+-".join("-" * w for w in widths) + "-+"
    fmt    = pad + "| " + " | ".join(f"{{:<{w}}}" for w in widths) + " |"
    print(sep_)
    print(fmt.format(*headers))
    print(sep_)
    for row in rows:
        print(fmt.format(*[str(v) for v in row]))
    print(sep_)


def _urgency_fmt(urgency: str) -> str:
    if "IMMÉDIAT" in urgency:
        return RED(urgency)
    if "URGENT" in urgency:
        return YELLOW(urgency)
    return urgency


def sep():
    print()
    print(DIM("─" * 65))


def ok(msg: str):
    print(f"  {GREEN('✓')} {msg}")


def err(msg: str):
    print(f"  {RED('✗')} {msg}")


# ===========================================================================
# MODE DIRECT — Pipeline ML sans serveur HTTP
# ===========================================================================

def run_direct(years: int, products: int, horizon: int) -> None:
    """
    Teste tout le pipeline ML directement (import Python), sans serveur HTTP.
    Plus rapide et sans problème de timeout réseau.
    """
    import numpy as np
    sys.path.insert(0, str(BASE_DIR.parent))

    from ml.preprocessing import (
        load_and_clean_data, aggregate_monthly,
        load_product_metadata, save_product_metadata,
    )
    from ml.features  import build_features
    from ml.model     import train_model, save_model, load_model
    from ml.predict   import predict_horizon as _predict_horizon
    from ml.inventory import (
        compute_safety_stock, compute_reorder_point,
        compute_order_plan, compute_production_trigger,
    )

    # --- 0 : Génération données ----------------------------------------
    hist_file, meta_file = step_generate(years, products)

    # --- 1 : Chargement et nettoyage -----------------------------------
    sep()
    print(BOLD("ÉTAPE 1 · Chargement et nettoyage des données"))
    print()

    df = load_and_clean_data(str(hist_file))
    ok(f"Lignes brutes : {len(df):,}")
    ok(f"Période : {df['date'].min().date()} → {df['date'].max().date()}")

    monthly = aggregate_monthly(df)
    ok(f"Points mensuels : {len(monthly):,}")
    has_prod = "product_code" in monthly.columns
    if has_prod:
        ok(f"Produits détectés : {monthly['product_code'].nunique()}")

    # --- 2 : Features & entraînement -----------------------------------
    sep()
    print(BOLD("ÉTAPE 2 · Entraînement du modèle"))
    print()

    X, y = build_features(monthly)
    ok(f"Features : {X.shape[1]} colonnes, {len(X)} lignes (post-lag)")

    pipeline, metrics = train_model(X, y)
    ok(f"Modèle   : {metrics['model_type']}")
    ok(f"R²={metrics['r2']}  RMSE={metrics['rmse']}  MAE={metrics['mae']}")

    # Sauvegarde du modèle
    last_p  = monthly["year_month"].max()
    base_p  = monthly["year_month"].min()
    seed_data: dict = {}
    encoder:   dict = {}
    if has_prod:
        for code, grp in monthly.groupby("product_code"):
            grp = grp.sort_values("year_month")
            seed_data[str(code)] = grp["quantity"].tolist()
            encoder[str(code)] = int(grp["product_encoded"].iloc[0])
    else:
        seed_data[""] = monthly.sort_values("year_month")["quantity"].tolist()

    context = {
        "has_product": has_prod, "base_period": base_p,
        "last_period": last_p, "seed_data": seed_data,
        "product_encoder": encoder,
    }
    save_model(pipeline, context)
    ok("Modèle sauvegardé")

    # --- 3 : Métadonnées -----------------------------------------------
    sep()
    print(BOLD("ÉTAPE 3 · Chargement métadonnées produits"))
    print()

    meta_df = load_product_metadata(str(meta_file))
    save_product_metadata(meta_df)
    ok(f"Produits chargés : {len(meta_df)}")
    _print_table(
        ["Code", "DV (j)", "Délai (j)", "Stock actuel", "Qté min"],
        [
            [idx,
             int(row["shelf_life_days"]),
             int(row["lead_time_days"]),
             f"{row['current_stock']:,.0f}",
             f"{row['min_order_qty']:,.0f}"]
            for idx, row in meta_df.iterrows()
        ],
    )

    # --- 4 : Prévisions et plan d'inventaire ----------------------------
    sep()
    print(BOLD(f"ÉTAPE 4 · Plan d'inventaire  (horizon {horizon} mois)"))
    print()

    forecast = _predict_horizon(horizon_months=horizon)
    ok(f"Demande totale prévue ({horizon}m) : {forecast['total_demand']:,.0f} unités")
    print()
    print(BOLD("  Prévision mensuelle globale :"))
    _print_table(
        ["Mois", "Demande prédite"],
        [[r["month"], f"{r['predicted_demand']:,.0f}"]
         for r in forecast["monthly_breakdown"]],
        indent=4,
    )

    today = __import__("datetime").date.today()
    raw   = forecast["raw_by_product"]

    defaults = {
        "shelf_life_days": 365.0, "lead_time_days": 30.0,
        "current_stock": 0.0, "min_order_qty": 0.0,
        "production_lead_time_days": 14.0,
    }

    all_plans = []
    for key, preds in raw.items():
        hist = seed_data.get(key, [])
        if not hist:
            continue
        avg_m = float(np.mean(hist))
        if meta_df is not None and key in meta_df.index:
            row_m = meta_df.loc[key]
            meta  = {k: float(row_m.get(k, defaults[k])) for k in defaults}
        else:
            meta = defaults.copy()

        ss  = compute_safety_stock(hist, meta["lead_time_days"])
        rop = compute_reorder_point(avg_m, meta["lead_time_days"], ss)
        plan = compute_order_plan(
            product_code=key or "GLOBAL",
            forecast_monthly=preds,
            current_stock=meta["current_stock"],
            safety_stock=ss,
            reorder_point=rop,
            shelf_life_days=meta["shelf_life_days"],
            avg_monthly_demand=avg_m,
            lead_time_days=meta["lead_time_days"],
            min_order_qty=meta["min_order_qty"],
            today=today,
        )
        pt = compute_production_trigger(
            current_stock=meta["current_stock"],
            reorder_point=rop,
            production_lead_time_days=meta["production_lead_time_days"],
            avg_monthly_demand=avg_m,
            today=today,
        )
        plan["lancement_production"] = pt
        all_plans.append(plan)

    # Résumé
    statuts = [p["status"] for p in all_plans]
    print()
    print(BOLD("  Résumé :"))
    print(f"  Produits OK               : {statuts.count('OK')}")
    print(f"  A planifier               : {statuts.count('PLANIFIER')}")
    print(f"  Commander maintenant      : {YELLOW(str(statuts.count('COMMANDER_MAINTENANT')))}")
    print(f"  CRITIQUE                  : {RED(str(statuts.count('CRITIQUE')))}")

    # Détail produit par produit
    for plan in all_plans:
        _print_product_plan(plan)

    # --- 5 : Alertes urgentes ------------------------------------------
    sep()
    print(BOLD("ÉTAPE 5 · Alertes de réapprovisionnement"))
    print()

    alerts = [p for p in all_plans if p["status"] in ("CRITIQUE", "COMMANDER_MAINTENANT")]
    if not alerts:
        ok("Aucune alerte urgente — tous les stocks sont suffisants")
    else:
        print(f"  {RED(str(len(alerts)))} alerte(s) urgente(s) !")
        for a in alerts:
            ma = a["mouvement_achat"]
            status_fmt = RED(BOLD("CRITIQUE")) if a["status"] == "CRITIQUE" else YELLOW(BOLD("COMMANDER MAINTENANT"))
            qty_a = "{:,.0f}".format(ma["quantity_to_order"])
            print(f"\n  [{status_fmt}] {BOLD(a['product_code'])}")
            print(f"    Stock actuel   : {a['current_stock']:,.0f}")
            print(f"    Stock securite : {a['safety_stock']:,.0f}")
            print(f"    ROP            : {a['reorder_point']:,.0f}")
            print(f"    -> Commander   : {BOLD(qty_a)} unites")
            print(f"    -> Livraison   : {ma['estimated_delivery']}")
            pt_a = a["lancement_production"]
            if pt_a["should_launch_now"]:
                print(f"    -> Production  : {RED('LANCER MAINTENANT')}")

    sep()
    print()
    print(BOLD(GREEN("  OK TOUS LES TESTS REUSSIS (mode direct)")))
    print()


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    parser = argparse.ArgumentParser(description="Test automatique Med Oil ML")
    parser.add_argument("--years",     type=int, default=5,    help="Annees de donnees (defaut: 5)")
    parser.add_argument("--products",  type=int, default=5,    help="Nombre de produits (defaut: 5)")
    parser.add_argument("--horizon",   type=int, default=6,    help="Horizon prevision en mois (defaut: 6)")
    parser.add_argument("--port",      type=int, default=8000, help="Port du serveur (defaut: 8000)")
    parser.add_argument("--no-server", action="store_true",    help="Ne pas demarrer le serveur")
    parser.add_argument("--direct",    action="store_true",    help="Mode direct (sans HTTP, recommande)")
    args = parser.parse_args()

    print()
    print(BOLD("=" * 65))
    print(BOLD("  MED OIL - TEST AUTOMATIQUE COMPLET"))
    print(BOLD(f"  {args.years} ans - {args.products} produits - horizon {args.horizon} mois"))
    print(BOLD("=" * 65))

    # Mode direct : test sans serveur HTTP
    if args.direct:
        run_direct(args.years, args.products, args.horizon)
        return

    # ── Mode HTTP ────────────────────────────────────────────────────
    base_url = f"http://127.0.0.1:{args.port}"

    # 0 — Génération des données
    hist_file, meta_file = step_generate(args.years, args.products)

    # 1 — Démarrage serveur
    proc = None
    if not args.no_server:
        proc = step_start_server(args.port)
    else:
        sep()
        print(BOLD("ETAPE 1 - Serveur"))
        ok("--no-server : serveur suppose deja actif")

    try:
        step_train(base_url, hist_file)
        step_metadata(base_url, meta_file)
        step_inventory_plan(base_url, args.horizon)
        step_reorder_alerts(base_url)

        sep()
        print()
        print(BOLD(GREEN("  OK TOUS LES TESTS REUSSIS")))
        print()
        print(f"  Docs API : {base_url}/docs")
        print()

    finally:
        if proc is not None:
            proc.terminate()
            sep()
            print(BOLD("Serveur arrete."))
            print()


if __name__ == "__main__":
    main()
