"""
predict.py — Prévision de la demande · Med Oil
===============================================

Fonctions publiques
-------------------
predict_next_year(product_code)            → prévision 12 mois (rétro-compat)
predict_horizon(horizon_months, product_code) → prévision N mois (3 ≤ N ≤ 12)

Stratégie : prévision récursive mensuelle.
  Chaque mois prédit est réinjecté comme lag pour le mois suivant.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml.model    import load_model
from ml.features import build_prediction_row


# ===========================================================================
# API publique
# ===========================================================================

def predict_with_pipeline(
    pipeline,
    context: dict,
    horizon_months: int = 12,
) -> list[dict]:
    """
    Génère des prévisions mensuelles avec un pipeline donné, sans toucher
    au modèle sauvegardé sur disque.

    Utilisé par POST /compare-rf-xgb pour obtenir les prédictions de
    Random Forest et de XGBoost séparément sur le même horizon.

    Args:
        pipeline       : pipeline sklearn entraîné (imputer + estimateur)
        context        : dict de contexte (seed_data, base_period, last_period, ...)
        horizon_months : nombre de mois à prédire (3–12)

    Returns:
        Liste de { "month": "YYYY-MM", "predicted_demand": float }
        triée chronologiquement, agrégée sur tous les produits.
    """
    horizon_months = max(3, min(12, int(horizon_months)))

    has_product     = context["has_product"]
    base_period     = context["base_period"]
    last_period     = context["last_period"]
    seed_data       = context["seed_data"]
    product_encoder = context["product_encoder"]

    # Somme des prédictions sur tous les produits (même logique que predict_horizon)
    combined = [0.0] * horizon_months

    for key, history in seed_data.items():
        p_enc = product_encoder.get(key) if has_product else None
        preds = _forecast_n_months(
            pipeline, history, base_period, last_period, p_enc, horizon_months
        )
        for i, p in enumerate(preds):
            combined[i] += p

    start_period = last_period + 1
    return [
        {
            "month":            (start_period + i).strftime("%Y-%m"),
            "predicted_demand": round(combined[i], 2),
        }
        for i in range(horizon_months)
    ]


def predict_next_year(product_code: str | None = None) -> dict:
    """
    Prédire la demande totale pour les 12 prochains mois.

    Conservé pour compatibilité avec l'endpoint /predict-year existant.
    Délègue à predict_horizon(12).
    """
    result = predict_horizon(horizon_months=12, product_code=product_code)

    # Format de réponse rétro-compatible
    total     = result["total_demand"]
    rec_stock = round(total * 1.3, 2)

    return {
        "predicted_demand_next_year":  total,
        "recommended_stock_next_year": rec_stock,
        "monthly_breakdown":           result["monthly_breakdown"],
        "forecast_year":               result["forecast_year"],
        "product_code":                product_code,
    }


def predict_horizon(
    horizon_months: int = 6,
    product_code: str | None = None,
) -> dict:
    """
    Prédire la demande mensuelle sur un horizon de 3 à 12 mois.

    Args:
        horizon_months : nombre de mois à prédire (clamped entre 3 et 12)
        product_code   : code produit (optionnel).
                         Si None et données multi-produits → somme globale.

    Returns:
        {
            horizon_months       : int,
            start_period         : "YYYY-MM",
            forecast_year        : int,
            total_demand         : float,
            monthly_breakdown    : [{"month": "YYYY-MM", "predicted_demand": float}, ...],
            per_product          : {code: [{"month", "predicted_demand"}, ...]} | {},
            raw_by_product       : {code: [float, ...]}   ← utilisé par inventory engine,
        }
    """
    horizon_months = max(3, min(12, int(horizon_months)))

    print(f"\n{'='*60}")
    print(f"[PREDICT-HORIZON] horizon={horizon_months}m  product={product_code!r}")

    pipeline, context = load_model()

    has_product  = context["has_product"]
    base_period  = context["base_period"]
    last_period  = context["last_period"]
    seed_data    = context["seed_data"]

    product_keys = _resolve_product_keys(product_code, has_product, context)

    # --- Prévision par produit (ou globale) --------------------------------
    raw_by_product: dict[str, list[float]] = {}
    for key in product_keys:
        history = seed_data.get(key, [])
        p_enc   = context["product_encoder"].get(key) if has_product else None
        preds   = _forecast_n_months(
            pipeline, history, base_period, last_period, p_enc, horizon_months
        )
        raw_by_product[key] = preds

    # --- Agrégation mensuelle (somme tous produits) -------------------------
    combined = [
        sum(raw_by_product[k][i] for k in raw_by_product)
        for i in range(horizon_months)
    ]

    start_period = last_period + 1
    monthly_breakdown = [
        {
            "month":            (start_period + i).strftime("%Y-%m"),
            "predicted_demand": round(combined[i], 2),
        }
        for i in range(horizon_months)
    ]

    total        = round(sum(combined), 2)
    forecast_year = (last_period + 1).year if last_period.month == 12 else last_period.year + 1

    # Détail par produit (uniquement si multi-produits)
    per_product: dict[str, list[dict]] = {}
    if has_product and len(product_keys) > 1:
        for key in product_keys:
            per_product[key] = [
                {
                    "month":            (start_period + i).strftime("%Y-%m"),
                    "predicted_demand": round(raw_by_product[key][i], 2),
                }
                for i in range(horizon_months)
            ]

    print(f"[PREDICT-HORIZON] Demande totale {horizon_months}m : {total}")

    return {
        "horizon_months":    horizon_months,
        "start_period":      str(start_period),
        "forecast_year":     forecast_year,
        "total_demand":      total,
        "monthly_breakdown": monthly_breakdown,
        "per_product":       per_product,
        "raw_by_product":    raw_by_product,     # consommé par inventory engine
    }


# ===========================================================================
# Helpers internes
# ===========================================================================

def _resolve_product_keys(
    product_code: str | None,
    has_product: bool,
    context: dict,
) -> list[str]:
    """Retourne la liste de clés produits à traiter."""
    if not has_product:
        return [""]
    if product_code:
        if product_code not in context["seed_data"]:
            raise ValueError(
                f"Produit '{product_code}' inconnu du modèle. "
                f"Produits disponibles : {list(context['seed_data'].keys())}"
            )
        return [product_code]
    return list(context["seed_data"].keys())


def _forecast_n_months(
    pipeline,
    history: list[float],
    base_period: pd.Period,
    last_period: pd.Period,
    product_encoded: int | None,
    n_months: int,
) -> list[float]:
    """
    Prévision récursive sur n_months.

    Chaque mois prédit est réinjecté comme lag pour le suivant.
    Les prédictions négatives sont clampées à 0.
    """
    window      = list(history)   # fenêtre glissante mutable
    predictions: list[float] = []

    for i in range(n_months):
        target     = last_period + (i + 1)
        seed_frame = pd.DataFrame({"quantity": window})
        row        = build_prediction_row(seed_frame, target, base_period, product_encoded)

        pred = max(0.0, float(pipeline.predict(row)[0]))
        predictions.append(round(pred, 4))
        window.append(pred)   # réinjection lag

    return predictions
