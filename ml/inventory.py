"""
inventory.py — Moteur de planification des stocks · Med Oil
============================================================

Implémente les calculs suivants :

  Stock de sécurité   = Z × σ_demande_mensuelle × √(délai_appro_mois)
  Point de commande   = Stock sécurité + Demande journalière × Délai (jours)
  Qté max (DV)        = (Durée de vie jours / 30) × Demande mensuelle moyenne
  Seuil de production = Point de commande × 1.5

Glossaire
---------
DV            : Durée de Vie (shelf life) de la matière première
ROP           : Reorder Point — point de commande automatique
Mouvement d'achat : ordre d'approvisionnement déclenché quand stock ≤ ROP
Lancement production : déclenchement de la production interne
"""

from __future__ import annotations

import math
from datetime import date, timedelta

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Tableau de service → coefficient Z
# ---------------------------------------------------------------------------
_Z_TABLE: dict[float, float] = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33,
}
_DEFAULT_SERVICE_LEVEL = 0.95

# Durée de vie par défaut si non renseignée (365 jours = 1 an)
DEFAULT_SHELF_LIFE_DAYS: float = 365.0
# Délai d'appro par défaut si non renseigné (30 jours)
DEFAULT_LEAD_TIME_DAYS: float = 30.0
# Délai de production par défaut (14 jours)
DEFAULT_PROD_LEAD_TIME_DAYS: float = 14.0


# ===========================================================================
# 1. STOCK DE SÉCURITÉ
# ===========================================================================

def compute_safety_stock(
    monthly_demands: list[float],
    lead_time_days: float,
    service_level: float = _DEFAULT_SERVICE_LEVEL,
) -> float:
    """
    Calcule le stock de sécurité statistique.

    Formule :
        SS = Z × σ_demande_mensuelle × √(délai_appro_en_mois)

    Args:
        monthly_demands : historique de demandes mensuelles
        lead_time_days  : délai d'approvisionnement en jours
        service_level   : taux de service cible (0.90 / 0.95 / 0.99)

    Returns:
        stock de sécurité (même unité que la demande)
    """
    if len(monthly_demands) < 2:
        avg = float(np.mean(monthly_demands)) if monthly_demands else 0.0
        # Fallback conservateur : 30 % de la demande moyenne
        return round(avg * 0.30, 2)

    z = _Z_TABLE.get(service_level, _Z_TABLE[_DEFAULT_SERVICE_LEVEL])
    sigma = float(np.std(monthly_demands, ddof=1))
    lead_time_months = lead_time_days / 30.0

    ss = z * sigma * math.sqrt(lead_time_months)
    return round(max(0.0, ss), 2)


# ===========================================================================
# 2. POINT DE COMMANDE (ROP)
# ===========================================================================

def compute_reorder_point(
    avg_monthly_demand: float,
    lead_time_days: float,
    safety_stock: float,
) -> float:
    """
    Point de commande automatique (Reorder Point).

    Formule :
        ROP = Stock sécurité + (Demande journalière × Délai en jours)

    Déclencheur :
        Quand stock_actuel ≤ ROP → lancer un MOUVEMENT D'ACHAT immédiatement.

    Args:
        avg_monthly_demand : demande mensuelle moyenne (historique ou prédite)
        lead_time_days     : délai fournisseur en jours
        safety_stock       : stock de sécurité calculé

    Returns:
        seuil de déclenchement d'achat
    """
    avg_daily_demand = avg_monthly_demand / 30.0
    rop = safety_stock + avg_daily_demand * lead_time_days
    return round(rop, 2)


# ===========================================================================
# 3. QUANTITÉ MAXIMALE SELON DURÉE DE VIE
# ===========================================================================

def compute_max_order_qty_dv(
    shelf_life_days: float,
    avg_monthly_demand: float,
) -> float:
    """
    Quantité maximale commandable sans dépasser la durée de vie du produit.

    Formule :
        Qté_max = (DV_jours / 30) × Demande_mensuelle_moyenne

    Garantit que tout le stock commandé sera consommé avant péremption.

    Args:
        shelf_life_days    : durée de vie de la matière première (jours)
        avg_monthly_demand : demande mensuelle moyenne

    Returns:
        quantité maximale par commande
    """
    shelf_life_months = shelf_life_days / 30.0
    return round(shelf_life_months * avg_monthly_demand, 2)


# ===========================================================================
# 4. PLAN DE COMMANDE COMPLET (MOUVEMENT D'ACHAT)
# ===========================================================================

def compute_order_plan(
    product_code: str,
    forecast_monthly: list[float],
    current_stock: float,
    safety_stock: float,
    reorder_point: float,
    shelf_life_days: float,
    avg_monthly_demand: float,
    lead_time_days: float,
    min_order_qty: float = 0.0,
    today: date | None = None,
) -> dict:
    """
    Génère le plan de commande complet pour un produit.

    Retourne :
        - statut du stock (CRITIQUE / COMMANDER_MAINTENANT / PLANIFIER / OK)
        - mouvement d'achat (quantité, date de livraison, urgence)
        - projection mensuelle du stock après réception

    Logique de statut
    -----------------
    CRITIQUE            → stock < stock sécurité   (action immédiate)
    COMMANDER_MAINTENANT → stock ≤ ROP              (achat à déclencher)
    PLANIFIER           → stock suffisant maintenant mais rupture prévue
    OK                  → stock couvre tout l'horizon

    Contrainte DV
    -------------
    La quantité commandée est plafonnée à :
        Qté_max = (DV_jours / 30) × Demande_mensuelle_moyenne
    pour ne jamais commander plus que ce qui peut être consommé avant péremption.
    """
    if today is None:
        today = date.today()

    horizon = len(forecast_monthly)
    total_forecast = sum(forecast_monthly)
    max_order_dv = compute_max_order_qty_dv(shelf_life_days, avg_monthly_demand)

    # --- Statut -----------------------------------------------------------
    if current_stock < safety_stock:
        status  = "CRITIQUE"
        urgency = "IMMÉDIAT — Stock en dessous du seuil de sécurité"
    elif current_stock <= reorder_point:
        status  = "COMMANDER_MAINTENANT"
        urgency = "URGENT — Point de commande atteint"
    else:
        status  = "OK"
        urgency = "Normal"
        running = current_stock
        for i, demand in enumerate(forecast_monthly):
            running -= demand
            if running <= reorder_point:
                status  = "PLANIFIER"
                urgency = f"Planifier commande dans {i + 1} mois"
                break

    # --- Quantité à commander --------------------------------------------
    # Besoin net = prévision + stock sécurité − stock actuel
    net_need      = total_forecast + safety_stock - current_stock
    qty_to_order  = max(net_need, 0.0)
    qty_to_order  = min(qty_to_order, max_order_dv)      # contrainte DV
    qty_to_order  = max(qty_to_order, min_order_qty)     # quantité minimum
    qty_to_order  = round(qty_to_order, 2)

    # Nombre de mois couverts par la commande (après réception)
    covers_months = _count_covered_months(
        forecast_monthly, current_stock + qty_to_order - safety_stock
    )

    # Date de livraison estimée
    delivery_date = today + timedelta(days=int(lead_time_days))

    # --- Projection mensuelle post-commande ------------------------------
    timeline = _build_stock_timeline(
        forecast_monthly,
        starting_stock=current_stock + qty_to_order,
        safety_stock=safety_stock,
        reorder_point=reorder_point,
        today=today,
    )

    return {
        "product_code":          product_code,
        "status":                status,
        "current_stock":         round(current_stock, 2),
        "safety_stock":          round(safety_stock, 2),
        "reorder_point":         round(reorder_point, 2),
        "avg_monthly_demand":    round(avg_monthly_demand, 2),
        "total_forecast_demand": round(total_forecast, 2),
        "horizon_months":        horizon,

        # ----------------------------------------------------------------
        # MOUVEMENT D'ACHAT — Purchase Order automatique
        # ----------------------------------------------------------------
        "mouvement_achat": {
            "type":               "MOUVEMENT D'ACHAT",
            "quantity_to_order":  qty_to_order,
            "max_qty_dv":         round(max_order_dv, 2),
            "covers_months":      covers_months,
            "shelf_life_days":    shelf_life_days,
            "lead_time_days":     lead_time_days,
            "estimated_delivery": str(delivery_date),
            "urgency":            urgency,
            "trigger_now":        status in ("CRITIQUE", "COMMANDER_MAINTENANT"),
        },

        # Projection mensuelle du stock
        "stock_timeline": timeline,
    }


# ===========================================================================
# 5. DÉCLENCHEUR DE LANCEMENT DE PRODUCTION
# ===========================================================================

def compute_production_trigger(
    current_stock: float,
    reorder_point: float,
    production_lead_time_days: float,
    avg_monthly_demand: float,
    today: date | None = None,
) -> dict:
    """
    Calcule le seuil et la date de lancement de production.

    Seuil de production = ROP × 1.5

    Logique :
        Si stock_actuel ≤ seuil → lancement de production immédiat.
        Sinon → calcul de la date optimale de lancement en tenant compte
                du délai de production (pour que la production soit prête
                quand le stock atteindra le ROP).

    Args:
        current_stock              : stock actuel du produit
        reorder_point              : ROP calculé
        production_lead_time_days  : durée du cycle de production (jours)
        avg_monthly_demand         : demande mensuelle moyenne
        today                      : date de référence (défaut : aujourd'hui)

    Returns:
        dict avec trigger_point, should_launch_now, launch_date_estimated
    """
    if today is None:
        today = date.today()

    trigger_point    = round(reorder_point * 1.5, 2)
    should_launch_now = current_stock <= trigger_point

    if should_launch_now:
        launch_date  = today
        days_until   = 0
    else:
        avg_daily = avg_monthly_demand / 30.0 if avg_monthly_demand > 0 else 1.0
        # Jours avant que le stock atteigne le seuil
        days_to_trigger = (current_stock - trigger_point) / avg_daily
        # Lancer la production suffisamment tôt pour qu'elle soit prête à temps
        days_until  = max(0.0, days_to_trigger - production_lead_time_days)
        launch_date = today + timedelta(days=int(days_until))

    return {
        "trigger_point":             trigger_point,
        "should_launch_now":         should_launch_now,
        "launch_date_estimated":     str(launch_date),
        "days_until_launch":         int(days_until) if not should_launch_now else 0,
        "production_lead_time_days": production_lead_time_days,
    }


# ===========================================================================
# Helpers internes
# ===========================================================================

def _count_covered_months(forecast_monthly: list[float], available: float) -> int:
    """Compte combien de mois le stock disponible peut couvrir."""
    covered = 0
    for demand in forecast_monthly:
        if available >= demand:
            available -= demand
            covered += 1
        else:
            break
    return covered


def _build_stock_timeline(
    forecast_monthly: list[float],
    starting_stock: float,
    safety_stock: float,
    reorder_point: float,
    today: date,
) -> list[dict]:
    """
    Projection mensuelle du stock sur l'horizon de prévision,
    après réception de la commande recommandée.
    """
    timeline = []
    running  = starting_stock
    base     = pd.Period(today, "M")

    for i, demand in enumerate(forecast_monthly):
        running -= demand
        running  = max(0.0, running)
        period   = base + (i + 1)

        if running < safety_stock:
            alert = "⚠ En dessous du stock sécurité"
        elif running <= reorder_point:
            alert = "🔴 Point de commande atteint"
        else:
            alert = "✅ OK"

        timeline.append({
            "month":            period.strftime("%Y-%m"),
            "predicted_demand": round(demand, 2),
            "projected_stock":  round(running, 2),
            "alert":            alert,
        })

    return timeline
