"""
main.py — API REST · Med Oil ML Stock Prediction
=================================================

Endpoints
---------
POST /train                → Entraîner le modèle sur données historiques Excel
POST /product-metadata     → Charger les métadonnées produits (DV, délais, stock)

GET  /inventory-plan       → Plan complet : prévisions + mouvements d'achat + lancement production
GET  /reorder-alerts       → Alertes urgentes (produits à commander immédiatement)
GET  /predict-year         → Prévision 12 mois (rétro-compatibilité)
GET  /health               → Statut API
"""

from __future__ import annotations

import os
import re
from datetime import date, timedelta

import httpx
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml.preprocessing import (
    load_and_clean_data,
    aggregate_monthly,
    load_product_metadata,
    save_product_metadata,
    load_saved_metadata,
)
from ml.features  import build_features
from ml.model     import (
    train_model, save_model, load_model,
    compare_rf_xgb,
    train_prophet_models, save_prophet_models, load_prophet_models,
    prophet_predict_horizon, _USE_PROPHET,
)
from ml.predict   import predict_next_year, predict_horizon, predict_with_pipeline
from ml.inventory import (
    compute_safety_stock,
    compute_reorder_point,
    compute_order_plan,
    compute_production_trigger,
    DEFAULT_SHELF_LIFE_DAYS,
    DEFAULT_LEAD_TIME_DAYS,
    DEFAULT_PROD_LEAD_TIME_DAYS,
)
from ml.utils import save_upload, format_error

# ---------------------------------------------------------------------------
app = FastAPI(
    title="Med Oil — ML Stock Prediction API",
    description=(
        "Prévision de la demande et planification des stocks pour matières premières. "
        "Intègre : prévision récursive LightGBM, point de commande automatique (ROP), "
        "contrainte durée de vie (DV), mouvement d'achat et lancement de production."
    ),
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================================
# POST /train
# ===========================================================================

@app.post("/train")
async def train(file: UploadFile = File(...)):
    """
    Entraîner le modèle ML sur des données historiques Excel.

    **Format Excel attendu :**
    | date | quantite (ou qte / solde / qty) | article (optionnel) |

    Le pipeline :
    1. Nettoie et normalise les colonnes
    2. Agrège en totaux mensuels
    3. Construit les features lag / rolling / saisonnières
    4. Entraîne LightGBM (ou RandomForest en fallback)
    5. Sauvegarde le modèle + contexte de prévision
    """
    tmp_path = None
    try:
        print(f"\n{'='*60}")
        print(f"[TRAIN] Fichier : {file.filename}")

        tmp_path = await save_upload(file)

        df      = load_and_clean_data(tmp_path)
        monthly = aggregate_monthly(df)
        X, y    = build_features(monthly)

        pipeline, metrics = train_model(X, y)

        has_product = "product_code" in monthly.columns
        context     = _build_context(monthly, has_product)

        save_model(pipeline, context)

        return {
            "status":        "success",
            "message":       (
                f"Modèle entraîné sur {metrics['rows_trained']} points mensuels "
                f"({df['date'].min().date()} → {df['date'].max().date()})."
            ),
            "file":           file.filename,
            "rows_raw":       len(df),
            "rows_monthly":   metrics["rows_trained"],
            "model_type":     metrics["model_type"],
            "metrics":        {
                "r2":   metrics["r2"],
                "rmse": metrics["rmse"],
                "mae":  metrics["mae"],
            },
            "date_range": {
                "from": str(df["date"].min().date()),
                "to":   str(df["date"].max().date()),
            },
        }

    except Exception as e:
        err = format_error(e)
        print(f"[TRAIN] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ===========================================================================
# POST /train-compare  (LightGBM vs Prophet)
# ===========================================================================

@app.post("/train-compare")
async def train_compare(file: UploadFile = File(...)):
    """
    Entraîne **les deux modèles** (LightGBM + Prophet) sur le même fichier Excel
    et retourne les métriques côte à côte pour comparaison académique.

    **Format Excel attendu :** identique à /train
    | date | quantite | article (optionnel) |

    **Réponse :**
    ```json
    {
      "lightgbm": { "r2": 0.92, "rmse": 312.4, "mae": 241.1 },
      "prophet":  { "r2": 0.87, "rmse": 389.2, "mae": 298.7 },
      "winner":   "lightgbm",
      "rows_raw": 900,
      "date_range": { "from": "2022-01-01", "to": "2024-12-01" }
    }
    ```
    """
    tmp_path = None
    try:
        print(f"\n{'='*60}")
        print(f"[COMPARE] Fichier : {file.filename}")

        tmp_path = await save_upload(file)

        df      = load_and_clean_data(tmp_path)
        monthly = aggregate_monthly(df)

        # ── 1. LightGBM / RandomForest ──────────────────────────────────
        X, y = build_features(monthly)
        lgbm_pipeline, lgbm_metrics = train_model(X, y)
        save_model(lgbm_pipeline, _build_context_from_monthly(monthly))

        # ── 2. Prophet ───────────────────────────────────────────────────
        if not _USE_PROPHET:
            prophet_result = {
                "available": False,
                "error": "Prophet non installé — pip install prophet",
            }
        else:
            prophet_models, prophet_metrics = train_prophet_models(monthly)
            save_prophet_models(prophet_models)
            prophet_result = {
                "available":    True,
                "r2":           prophet_metrics["r2"],
                "rmse":         prophet_metrics["rmse"],
                "mae":          prophet_metrics["mae"],
                "model_type":   "Prophet",
                "rows_trained": prophet_metrics["rows_trained"],
                "n_products":   prophet_metrics.get("n_products", 1),
            }

        # ── 3. Comparaison ───────────────────────────────────────────────
        lgbm_r2    = lgbm_metrics["r2"]
        prophet_r2 = prophet_result.get("r2", -999) if prophet_result.get("available") else -999
        winner = "lightgbm" if lgbm_r2 >= prophet_r2 else "prophet"

        return {
            "status":  "success",
            "file":    file.filename,
            "rows_raw": len(df),
            "date_range": {
                "from": str(df["date"].min().date()),
                "to":   str(df["date"].max().date()),
            },
            "lightgbm": {
                "available":    True,
                "r2":           lgbm_metrics["r2"],
                "rmse":         lgbm_metrics["rmse"],
                "mae":          lgbm_metrics["mae"],
                "model_type":   lgbm_metrics["model_type"],
                "rows_trained": lgbm_metrics["rows_trained"],
            },
            "prophet": prophet_result,
            "winner": winner,
            "interpretation": {
                "r2":   "Plus proche de 1.0 = meilleur",
                "rmse": "Plus bas = meilleur (erreur quadratique moyenne)",
                "mae":  "Plus bas = meilleur (erreur absolue moyenne)",
            },
        }

    except Exception as e:
        err = format_error(e)
        print(f"[COMPARE] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ===========================================================================
# POST /compare-rf-xgb  (Random Forest vs XGBoost)
# ===========================================================================

@app.post("/compare-rf-xgb")
async def compare_rf_xgb_endpoint(file: UploadFile = File(...)):
    """
    Entraîne **Random Forest** et **XGBoost** sur les mêmes données historiques
    et retourne leurs métriques côte à côte pour comparaison académique.

    **Différence entre les deux modèles :**
    - **Random Forest** : Bagging — N arbres entraînés indépendamment en parallèle,
      résultat = moyenne des prédictions. Robuste et interprétable.
    - **XGBoost** : Gradient Boosting régularisé — arbres construits séquentiellement,
      chaque arbre corrige les erreurs du précédent. Régularisation L1+L2.

    **Le meilleur modèle (R² le plus élevé) est sauvegardé comme modèle actif.**
    Il sera utilisé par les endpoints /predict-year et /inventory-plan.

    **Format Excel attendu :**
    | date | quantite | article (optionnel) |

    **Réponse :**
    ```json
    {
      "random_forest": { "r2": 0.88, "rmse": 340.1, "mae": 260.5 },
      "xgboost":       { "r2": 0.93, "rmse": 289.7, "mae": 221.3 },
      "winner": "xgboost",
      "winner_saved": true
    }
    ```
    """
    tmp_path = None
    try:
        print(f"\n{'='*60}")
        print(f"[COMPARE RF/XGB] Fichier : {file.filename}")

        tmp_path = await save_upload(file)

        # 1. Chargement et prétraitement des données
        df      = load_and_clean_data(tmp_path)
        monthly = aggregate_monthly(df)
        X, y    = build_features(monthly)

        # 2. Entraînement et comparaison RF vs XGBoost
        result  = compare_rf_xgb(X, y)
        rf_m    = result["rf_metrics"]
        xgb_m   = result["xgb_metrics"]

        # 3. Construction du contexte de prévision (historique + périodes)
        context = _build_context_from_monthly(monthly)

        # 4. Génération des prévisions sur 12 mois pour chaque modèle séparément
        #    → predict_with_pipeline utilise le pipeline donné sans toucher au disque
        rf_predictions  = predict_with_pipeline(result["rf_pipeline"],  context, horizon_months=12)
        xgb_predictions = predict_with_pipeline(result["xgb_pipeline"], context, horizon_months=12)

        # 5. Sauvegarde du meilleur modèle comme modèle actif
        save_model(result["best_pipeline"], context)

        return {
            "status":       "success",
            "file":         file.filename,
            "rows_raw":     len(df),
            "rows_monthly": int(len(X)),
            "date_range": {
                "from": str(df["date"].min().date()),
                "to":   str(df["date"].max().date()),
            },
            "random_forest": {
                "r2":           rf_m["r2"],
                "rmse":         rf_m["rmse"],
                "mae":          rf_m["mae"],
                "rows_trained": rf_m["rows_trained"],
                "model_type":   rf_m["model_type"],
                "predictions":  rf_predictions,   # 12 mois de prévisions RF
            },
            "xgboost": {
                "r2":           xgb_m["r2"],
                "rmse":         xgb_m["rmse"],
                "mae":          xgb_m["mae"],
                "rows_trained": xgb_m["rows_trained"],
                "model_type":   xgb_m["model_type"],
                "predictions":  xgb_predictions,  # 12 mois de prévisions XGBoost
            },
            "winner":       result["winner"],
            "winner_saved": True,
            "interpretation": {
                "r2":   "Plus proche de 1.0 = meilleur (qualité de la prédiction)",
                "rmse": "Plus bas = meilleur (erreur quadratique moyenne en unités)",
                "mae":  "Plus bas = meilleur (erreur absolue moyenne en unités)",
            },
        }

    except Exception as e:
        err = format_error(e)
        print(f"[COMPARE RF/XGB] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/predict-year-prophet")
async def predict_year_prophet(
    product_code: str | None = Query(default=None, description="Code produit (optionnel)"),
):
    """
    Prévision 12 mois avec le modèle **Prophet** (modèle de comparaison).
    Nécessite un appel préalable à POST /train-compare.
    """
    try:
        prophet_models = load_prophet_models()
        predictions = prophet_predict_horizon(
            prophet_models,
            horizon_months=12,
            product_code=product_code,
        )
        total = sum(p["predicted_quantity"] for p in predictions)
        return {
            "model":        "Prophet",
            "product_code": product_code,
            "predictions":  predictions,
            "total_demand": round(total, 2),
            "recommended_stock": round(total * 1.3, 2),
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=format_error(e))


def _build_context_from_monthly(monthly_df) -> dict:
    """Helper — reconstruit le context dict à partir du monthly_df."""
    has_product = "product_code" in monthly_df.columns
    return _build_context(monthly_df, has_product)


# ===========================================================================
# POST /product-metadata
# ===========================================================================

@app.post("/product-metadata")
async def upload_product_metadata(file: UploadFile = File(...)):
    """
    Charger les métadonnées des matières premières.

    **Format Excel attendu (colonnes flexibles) :**

    | product_code | shelf_life_days | lead_time_days | current_stock | min_order_qty | production_lead_time_days |
    |---|---|---|---|---|---|
    | P001 | 180 | 30 | 500 | 100 | 14 |

    **Description des colonnes :**
    - `product_code`              : Code / référence de la matière première *(obligatoire)*
    - `shelf_life_days`           : Durée de vie en jours (ex. 180 = 6 mois)
    - `lead_time_days`            : Délai fournisseur en jours
    - `current_stock`             : Stock actuel disponible
    - `min_order_qty`             : Quantité minimale de commande
    - `production_lead_time_days` : Délai de production interne en jours

    Toutes les colonnes sauf `product_code` sont optionnelles (valeurs par défaut appliquées).
    """
    tmp_path = None
    try:
        print(f"\n{'='*60}")
        print(f"[META] Fichier : {file.filename}")

        tmp_path = await save_upload(file)
        meta_df  = load_product_metadata(tmp_path)
        save_product_metadata(meta_df)

        products_summary = []
        for code, row in meta_df.iterrows():
            products_summary.append({
                "product_code":              code,
                "shelf_life_days":           row["shelf_life_days"],
                "lead_time_days":            row["lead_time_days"],
                "current_stock":             row["current_stock"],
                "min_order_qty":             row["min_order_qty"],
                "production_lead_time_days": row["production_lead_time_days"],
            })

        return {
            "status":           "success",
            "products_loaded":  len(meta_df),
            "file":             file.filename,
            "products":         products_summary,
        }

    except Exception as e:
        err = format_error(e)
        print(f"[META] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ===========================================================================
# GET /inventory-plan
# ===========================================================================

@app.get("/inventory-plan")
def inventory_plan(
    horizon_months: int = Query(
        default=6,
        ge=3,
        le=12,
        description="Horizon de prévision en mois (3 à 12).",
    ),
    product_code: str | None = Query(
        default=None,
        description="Code produit optionnel. Si omis, retourne le plan pour tous les produits.",
    ),
    service_level: float = Query(
        default=0.95,
        description="Taux de service cible pour le stock de sécurité (0.90 / 0.95 / 0.99).",
    ),
):
    """
    **Plan d'inventaire complet sur l'horizon choisi (3 à 12 mois).**

    Pour chaque matière première, retourne :

    - **Prévision de demande** mensuelle (modèle LightGBM)
    - **Stock de sécurité** (méthode statistique, taux de service 95 % par défaut)
    - **Point de commande (ROP)** — seuil de déclenchement automatique
    - **Mouvement d'achat** :
        - Quantité à commander
        - Contrainte durée de vie (pas de surcommande)
        - Date de livraison estimée
        - Urgence
    - **Lancement de production** — date et indicateur d'urgence
    - **Projection mensuelle du stock** après réception de la commande
    - **Statut** : CRITIQUE / COMMANDER_MAINTENANT / PLANIFIER / OK

    ---
    **Calculs clés :**
    ```
    Stock sécurité  = Z × σ_demande × √(délai_appro_mois)
    Point commande  = Stock sécurité + demande_journalière × délai_jours
    Qté max (DV)    = (durée_vie_jours / 30) × demande_mensuelle_moyenne
    Seuil prod.     = Point commande × 1.5
    ```
    """
    try:
        print(f"\n{'='*60}")
        print(f"[INVENTORY-PLAN] horizon={horizon_months}m  product={product_code!r}  SL={service_level}")

        # --- Prévisions ML ------------------------------------------------
        forecast = predict_horizon(
            horizon_months=horizon_months,
            product_code=product_code,
        )
        raw_by_product = forecast["raw_by_product"]  # {code: [float, ...]}

        # --- Contexte modèle (historique → stats de base) -----------------
        _, context    = load_model()
        seed_data     = context["seed_data"]          # {code: [float, ...]}
        has_product   = context["has_product"]

        # --- Métadonnées produits -----------------------------------------
        meta_df = load_saved_metadata()   # peut être None

        # --- Construction du plan par produit -----------------------------
        products_plan = []
        today         = date.today()

        for key, monthly_preds in raw_by_product.items():
            history = seed_data.get(key, [])
            if not history:
                continue

            avg_monthly = float(np.mean(history)) if history else 0.0

            # Récupération des métadonnées (ou valeurs par défaut)
            meta = _get_product_meta(meta_df, key)

            # Calculs stock
            ss  = compute_safety_stock(history, meta["lead_time_days"], service_level)
            rop = compute_reorder_point(avg_monthly, meta["lead_time_days"], ss)

            # Plan de commande
            order_plan = compute_order_plan(
                product_code     = key if key else "GLOBAL",
                forecast_monthly = monthly_preds,
                current_stock    = meta["current_stock"],
                safety_stock     = ss,
                reorder_point    = rop,
                shelf_life_days  = meta["shelf_life_days"],
                avg_monthly_demand = avg_monthly,
                lead_time_days   = meta["lead_time_days"],
                min_order_qty    = meta["min_order_qty"],
                today            = today,
            )

            # Déclencheur production
            prod_trigger = compute_production_trigger(
                current_stock              = meta["current_stock"],
                reorder_point              = rop,
                production_lead_time_days  = meta["production_lead_time_days"],
                avg_monthly_demand         = avg_monthly,
                today                      = today,
            )

            # Prévision mensuelle par produit (labels lisibles)
            start_period     = context["last_period"] + 1
            monthly_forecast = [
                {
                    "month":            (start_period + i).strftime("%Y-%m"),
                    "predicted_demand": round(monthly_preds[i], 2),
                }
                for i in range(len(monthly_preds))
            ]

            products_plan.append({
                **order_plan,
                "lancement_production": prod_trigger,
                "monthly_forecast":     monthly_forecast,
                "shelf_life_days":      meta["shelf_life_days"],
                "metadata_source":      "uploaded" if meta_df is not None and key in meta_df.index else "default",
            })

        # --- Résumé global ------------------------------------------------
        statuts = [p["status"] for p in products_plan]
        summary = {
            "total_products":         len(products_plan),
            "CRITIQUE":               statuts.count("CRITIQUE"),
            "COMMANDER_MAINTENANT":   statuts.count("COMMANDER_MAINTENANT"),
            "PLANIFIER":              statuts.count("PLANIFIER"),
            "OK":                     statuts.count("OK"),
            "total_forecast_demand":  round(forecast["total_demand"], 2),
            "horizon_months":         horizon_months,
            "service_level":          service_level,
            "generated_at":           str(today),
        }

        print(f"[INVENTORY-PLAN] {len(products_plan)} produits traités | "
              f"Critique={summary['CRITIQUE']} | Urgent={summary['COMMANDER_MAINTENANT']}")

        return {
            "summary":      summary,
            "forecast":     {
                "horizon_months":    horizon_months,
                "start_period":      forecast["start_period"],
                "total_demand":      forecast["total_demand"],
                "monthly_breakdown": forecast["monthly_breakdown"],
            },
            "products":     products_plan,
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        err = format_error(e)
        print(f"[INVENTORY-PLAN] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)


# ===========================================================================
# GET /reorder-alerts
# ===========================================================================

@app.get("/reorder-alerts")
def reorder_alerts(
    service_level: float = Query(
        default=0.95,
        description="Taux de service pour le calcul du stock de sécurité.",
    ),
):
    """
    **Alertes de réapprovisionnement urgent.**

    Retourne uniquement les produits avec statut **CRITIQUE** ou **COMMANDER_MAINTENANT**.

    Utilisé pour déclencher automatiquement les mouvements d'achat sans attendre
    le plan complet d'inventaire.

    Chaque alerte contient :
    - Statut et urgence
    - Quantité à commander immédiatement
    - Date de livraison estimée
    - Indication si lancement de production requis
    """
    try:
        print(f"\n{'='*60}")
        print(f"[REORDER-ALERTS] SL={service_level}")

        _, context  = load_model()
        seed_data   = context["seed_data"]
        meta_df     = load_saved_metadata()
        today       = date.today()

        alerts = []

        for key, history in seed_data.items():
            if not history:
                continue

            avg_monthly = float(np.mean(history))
            meta        = _get_product_meta(meta_df, key)

            ss  = compute_safety_stock(history, meta["lead_time_days"], service_level)
            rop = compute_reorder_point(avg_monthly, meta["lead_time_days"], ss)

            current = meta["current_stock"]

            if current > rop:
                continue   # pas d'alerte

            status  = "CRITIQUE" if current < ss else "COMMANDER_MAINTENANT"
            urgency = "IMMÉDIAT" if status == "CRITIQUE" else "URGENT"

            # Quantité minimale à commander (couvre le délai + stock sécurité)
            lead_demand = (avg_monthly / 30.0) * meta["lead_time_days"]
            qty_min     = max(lead_demand + ss - current, meta["min_order_qty"])
            qty_min     = min(qty_min, _get_max_dv(meta, avg_monthly))

            delivery = today + timedelta(days=int(meta["lead_time_days"]))

            prod_trigger = compute_production_trigger(
                current_stock             = current,
                reorder_point             = rop,
                production_lead_time_days = meta["production_lead_time_days"],
                avg_monthly_demand        = avg_monthly,
                today                     = today,
            )

            alerts.append({
                "product_code":           key if key else "GLOBAL",
                "status":                 status,
                "urgency":                urgency,
                "current_stock":          round(current, 2),
                "safety_stock":           round(ss, 2),
                "reorder_point":          round(rop, 2),
                "mouvement_achat": {
                    "type":               "MOUVEMENT D'ACHAT",
                    "quantity_to_order":  round(qty_min, 2),
                    "estimated_delivery": str(delivery),
                    "lead_time_days":     meta["lead_time_days"],
                    "trigger_now":        True,
                },
                "lancement_production": prod_trigger,
            })

        # Tri : CRITIQUE en premier
        alerts.sort(key=lambda a: (0 if a["status"] == "CRITIQUE" else 1))

        print(f"[REORDER-ALERTS] {len(alerts)} alertes générées")

        return {
            "total_alerts":           len(alerts),
            "critique":               sum(1 for a in alerts if a["status"] == "CRITIQUE"),
            "commander_maintenant":   sum(1 for a in alerts if a["status"] == "COMMANDER_MAINTENANT"),
            "generated_at":           str(today),
            "alerts":                 alerts,
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        err = format_error(e)
        print(f"[REORDER-ALERTS] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)


# ===========================================================================
# GET /predict-year  (rétro-compatibilité)
# ===========================================================================

@app.get("/predict-year")
def predict_year(
    product_code: str | None = Query(
        default=None,
        description="Code produit optionnel. Si omis, retourne la demande totale.",
    )
):
    """
    Prédire la demande totale pour les 12 prochains mois.

    *(Endpoint conservé pour compatibilité — privilégier /inventory-plan)*
    """
    try:
        print(f"\n{'='*60}")
        print(f"[PREDICT-YEAR] product_code={product_code!r}")
        return predict_next_year(product_code=product_code)

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        err = format_error(e)
        print(f"[PREDICT-YEAR] ERREUR :\n{err}")
        raise HTTPException(status_code=422, detail=err)


# ===========================================================================
# POST /chat  — Assistant conversationnel en langage naturel
# ===========================================================================

JAVA_API_URL = os.getenv("JAVA_API_URL", "http://localhost:8080")

class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat(body: ChatRequest):
    """
    Chatbot en langage naturel pour interroger les stocks, produits et prévisions.
    Répond en français aux questions des responsables.
    """
    msg = body.message.strip()
    msg_lower = _normalize(msg)

    try:
        response_text = await _dispatch_intent(msg_lower)
    except httpx.ConnectError:
        response_text = (
            "⚠️ Je ne peux pas accéder à la base de données pour le moment "
            "(le serveur Java semble indisponible). Vérifiez que le backend tourne sur le port 8080."
        )
    except Exception as e:
        response_text = f"Désolé, une erreur inattendue est survenue : {str(e)[:120]}"

    return {"response": response_text}


def _normalize(text: str) -> str:
    """Minuscule + suppression accents courants pour matching robuste."""
    replacements = {
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "à": "a", "â": "a", "ô": "o", "î": "i",
        "ù": "u", "û": "u", "ç": "c", "œ": "oe",
    }
    t = text.lower()
    for src, dst in replacements.items():
        t = t.replace(src, dst)
    return t


async def _dispatch_intent(msg: str) -> str:
    # Aide
    if any(w in msg for w in ["aide", "help", "que peux", "quoi faire", "fonctions", "capacite"]):
        return _help_text()

    # Alertes / ruptures
    if any(w in msg for w in ["alerte", "rupture", "critique", "urgent", "reappro", "commander maintenant"]):
        return await _alerts_response()

    # Plan d'inventaire
    if any(w in msg for w in ["plan inventaire", "plan d'inventaire", "planification", "plan stock"]):
        return await _inventory_plan_response()

    # Prévision ML
    if any(w in msg for w in ["prevision", "forecast", "prevoir", "prediction", "demande prevue", "demande future"]):
        return await _forecast_response(msg)

    # Tous les stocks
    if any(w in msg for w in ["tous les stocks", "liste des stocks", "liste stock", "stock total",
                               "tous les produits en stock", "inventaire complet"]):
        return await _all_stocks_response()

    # Liste des produits
    if any(w in msg for w in ["liste des produits", "tous les produits", "catalogue", "produits disponibles"]):
        return await _products_list_response()

    # Stock d'un produit spécifique (combien, quantité, stock de X)
    if any(w in msg for w in ["combien", "quantite", "stock de", "stock du", "disponible", "en stock"]):
        return await _product_stock_response(msg)

    # Mouvements récents
    if any(w in msg for w in ["mouvement", "recent", "dernier", "transaction"]):
        return await _movements_response()

    # Entrepôts
    if any(w in msg for w in ["entrepot", "entrepots", "warehouse", "depot"]):
        return await _warehouses_response()

    # Fallback
    return (
        "Je n'ai pas bien compris votre question. Voici ce que je sais faire :\n\n"
        + _help_text()
    )


def _help_text() -> str:
    return (
        "🤖 **Assistant Med Oil** — Exemples de questions :\n\n"
        "• « Combien y a-t-il d'huile d'olive en stock ? »\n"
        "• « Quel est le stock disponible de produit X ? »\n"
        "• « Liste tous les stocks »\n"
        "• « Y a-t-il des alertes de rupture ? »\n"
        "• « Montre-moi la prévision de demande »\n"
        "• « Donne-moi le plan d'inventaire »\n"
        "• « Liste des produits »\n"
        "• « Quels sont les derniers mouvements ? »\n"
        "• « Liste les entrepôts »"
    )


async def _fetch_java(path: str) -> list | dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{JAVA_API_URL}/api{path}")
        r.raise_for_status()
        return r.json()


async def _product_stock_response(msg: str) -> str:
    stocks = await _fetch_java("/stocks")
    if not stocks:
        return "Aucun stock enregistré dans la base de données."

    # Extraire le nom du produit cherché depuis le message original
    keywords = _extract_search_keywords(msg)

    if not keywords:
        return await _all_stocks_response()

    # Chercher dans les stocks
    matched = []
    for s in stocks:
        product_name = _normalize(str(s.get("product", {}).get("name", "") or ""))
        product_ref  = _normalize(str(s.get("product", {}).get("reference", "") or s.get("product", {}).get("code", "") or ""))
        if any(kw in product_name or kw in product_ref for kw in keywords):
            matched.append(s)

    if not matched:
        # Retourner tous les stocks avec suggestion
        lines = [f"Aucun produit trouvé pour « {', '.join(keywords)} ». Stocks disponibles :\n"]
        for s in stocks[:10]:
            name = s.get("product", {}).get("name", "N/A")
            qty  = s.get("quantityAvailable", 0)
            wh   = s.get("warehouse", {}).get("name", "?")
            lines.append(f"• {name} → {qty:,.0f} unités ({wh})")
        if len(stocks) > 10:
            lines.append(f"… et {len(stocks)-10} autres produits")
        return "\n".join(lines)

    lines = [f"📦 Stock trouvé ({len(matched)} résultat(s)) :\n"]
    for s in matched:
        name = s.get("product", {}).get("name", "N/A")
        qty  = s.get("quantityAvailable", 0)
        wh   = s.get("warehouse", {}).get("name", "?")
        lines.append(f"• **{name}** : {qty:,.0f} unités — Entrepôt : {wh}")
    return "\n".join(lines)


async def _all_stocks_response() -> str:
    stocks = await _fetch_java("/stocks")
    if not stocks:
        return "Aucun stock enregistré."

    total = sum(s.get("quantityAvailable", 0) for s in stocks)
    lines = [f"📦 **{len(stocks)} lignes de stock** | Total : {total:,.0f} unités\n"]
    for s in stocks[:15]:
        name = s.get("product", {}).get("name", "N/A")
        qty  = s.get("quantityAvailable", 0)
        wh   = s.get("warehouse", {}).get("name", "?")
        lines.append(f"• {name} : {qty:,.0f} unités ({wh})")
    if len(stocks) > 15:
        lines.append(f"… et {len(stocks)-15} autres lignes")
    return "\n".join(lines)


async def _products_list_response() -> str:
    products = await _fetch_java("/products")
    if not products:
        return "Aucun produit enregistré."
    lines = [f"🗂️ **{len(products)} produit(s) enregistré(s)** :\n"]
    for p in products[:20]:
        name = p.get("name", "N/A")
        ref  = p.get("reference", p.get("code", ""))
        cat  = p.get("category", {}).get("name", "") if isinstance(p.get("category"), dict) else ""
        line = f"• {name}"
        if ref:
            line += f" (réf. {ref})"
        if cat:
            line += f" — {cat}"
        lines.append(line)
    if len(products) > 20:
        lines.append(f"… et {len(products)-20} autres produits")
    return "\n".join(lines)


async def _alerts_response() -> str:
    try:
        data = reorder_alerts()
    except FileNotFoundError:
        return "⚠️ Aucun modèle ML entraîné. Entraînez le modèle d'abord pour obtenir des alertes."
    except Exception as e:
        return f"⚠️ Erreur lors du calcul des alertes : {str(e)[:100]}"

    total    = data.get("total_alerts", 0)
    critique = data.get("critique", 0)
    urgent   = data.get("commander_maintenant", 0)
    alerts   = data.get("alerts", [])

    if total == 0:
        return "✅ Aucune alerte de rupture de stock. Tous les niveaux sont satisfaisants."

    lines = [f"🚨 **{total} alerte(s)** — {critique} CRITIQUE(S), {urgent} URGENT(ES)\n"]
    for a in alerts[:8]:
        status   = a.get("status", "")
        code     = a.get("product_code", "?")
        current  = a.get("current_stock", 0)
        rop      = a.get("reorder_point", 0)
        icon     = "🔴" if status == "CRITIQUE" else "🟡"
        order    = a.get("mouvement_achat", {}).get("quantity_to_order", 0)
        delivery = a.get("mouvement_achat", {}).get("estimated_delivery", "?")
        lines.append(
            f"{icon} **{code}** — Stock : {current:,.0f} | ROP : {rop:,.0f} | "
            f"À commander : {order:,.0f} | Livraison : {delivery}"
        )
    if total > 8:
        lines.append(f"… et {total-8} autre(s) alerte(s)")
    return "\n".join(lines)


async def _forecast_response(msg: str) -> str:
    keywords     = _extract_search_keywords(msg)
    product_code = keywords[0] if keywords else None

    try:
        data = predict_next_year(product_code=product_code)
    except FileNotFoundError:
        return "⚠️ Aucun modèle ML entraîné. Importez un fichier Excel historique pour obtenir des prévisions."
    except Exception as e:
        return f"⚠️ Erreur lors de la prévision : {str(e)[:100]}"

    year      = data.get("forecast_year", "?")
    demand    = data.get("predicted_demand_next_year", 0)
    rec_stock = data.get("recommended_stock_next_year", 0)
    breakdown = data.get("monthly_breakdown", [])

    lines = [
        f"📈 **Prévision de demande — {year}**\n",
        f"• Demande annuelle prévue : **{demand:,.0f} unités**",
        f"• Stock recommandé : **{rec_stock:,.0f} unités**",
    ]
    if breakdown:
        lines.append("\n📅 Répartition mensuelle :")
        for m in breakdown[:6]:
            lines.append(f"  {m.get('month','?')} → {m.get('predicted_demand',0):,.0f}")
        if len(breakdown) > 6:
            lines.append(f"  … {len(breakdown)-6} autres mois")
    return "\n".join(lines)


async def _inventory_plan_response() -> str:
    try:
        data = inventory_plan(horizon_months=6)
    except FileNotFoundError:
        return "⚠️ Aucun modèle entraîné pour le plan d'inventaire."
    except Exception as e:
        return f"⚠️ Erreur lors du plan d'inventaire : {str(e)[:100]}"

    summary  = data.get("summary", {})
    products = data.get("products", [])

    lines = [
        f"📋 **Plan d'inventaire — {summary.get('horizon_months', 6)} mois**\n",
        f"• Produits analysés : {summary.get('total_products', 0)}",
        f"• 🔴 Critiques : {summary.get('CRITIQUE', 0)}",
        f"• 🟡 À commander : {summary.get('COMMANDER_MAINTENANT', 0)}",
        f"• 🟠 À planifier : {summary.get('PLANIFIER', 0)}",
        f"• ✅ OK : {summary.get('OK', 0)}",
        f"• Demande totale prévue : {summary.get('total_forecast_demand', 0):,.0f} unités",
    ]
    critiques = [p for p in products if p.get("status") in ("CRITIQUE", "COMMANDER_MAINTENANT")]
    if critiques:
        lines.append("\n⚠️ Actions urgentes :")
        for p in critiques[:5]:
            code = p.get("product_code", "?")
            qty  = p.get("mouvement_achat", {}).get("quantity_to_order", 0)
            status = p.get("status", "")
            lines.append(f"  {'🔴' if status == 'CRITIQUE' else '🟡'} {code} — commander {qty:,.0f} unités")
    return "\n".join(lines)


async def _movements_response() -> str:
    movements = await _fetch_java("/product-movements")
    if not isinstance(movements, list) or not movements:
        return "Aucun mouvement de stock enregistré."

    sorted_mv = sorted(movements, key=lambda m: m.get("id", 0), reverse=True)[:8]
    lines = [f"🔄 **{len(movements)} mouvement(s)** — 8 derniers :\n"]
    type_labels = {"SO": "Vente", "PO": "Achat", "TR": "Transfert", "TSS": "Trans. Stock", "VNP": "Vente", "WO": "Ordre"}
    for m in sorted_mv:
        label = type_labels.get(m.get("type", ""), m.get("type", "Mouvement"))
        product = m.get("product", {}).get("name", f"#{m.get('id', '?')}")
        qty = m.get("quantity", 0)
        d   = m.get("date", "")[:10] if m.get("date") else "récent"
        lines.append(f"• {label} — {product} : {qty:,.0f} unités ({d})")
    return "\n".join(lines)


async def _warehouses_response() -> str:
    warehouses = await _fetch_java("/warehouses")
    if not isinstance(warehouses, list) or not warehouses:
        return "Aucun entrepôt enregistré."
    lines = [f"🏭 **{len(warehouses)} entrepôt(s)** :\n"]
    for w in warehouses:
        name     = w.get("name", "N/A")
        location = w.get("location", w.get("address", ""))
        lines.append(f"• {name}" + (f" — {location}" if location else ""))
    return "\n".join(lines)


def _extract_search_keywords(msg: str) -> list[str]:
    """
    Extrait les mots-clés de recherche après les mots déclencheurs.
    Ex: "combien y a-t-il d'huile d'olive" → ["huile", "olive"]
    """
    # Supprimer les mots courants non significatifs
    stop = {
        "combien", "y", "a", "il", "de", "du", "des", "le", "la", "les", "l",
        "en", "stock", "disponible", "quantite", "quel", "est", "sont", "pour",
        "d", "qu", "ce", "que", "qui", "t", "un", "une", "au", "aux",
        "montre", "donne", "affiche", "voir", "moi", "liste", "tous",
    }
    # Extraire les tokens alphanumérique
    tokens = re.findall(r"[a-z0-9]+", msg)
    keywords = [t for t in tokens if t not in stop and len(t) > 2]
    return keywords


# ===========================================================================
# GET /health
# ===========================================================================

@app.get("/health")
def health():
    """Statut de l'API et disponibilité du modèle."""
    from ml.model import MODEL_PATH, CONTEXT_PATH
    from ml.preprocessing import METADATA_PATH

    return {
        "status":          "ok",
        "version":         "3.0.0",
        "model_trained":   os.path.exists(MODEL_PATH),
        "metadata_loaded": os.path.exists(METADATA_PATH),
    }


# ===========================================================================
# Helpers internes
# ===========================================================================

def _build_context(monthly, has_product: bool) -> dict:
    """Construit le contexte de prévision sauvegardé avec le modèle."""
    import pandas as pd

    last_period = monthly["year_month"].max()
    base_period = monthly["year_month"].min()

    seed_data: dict[str, list[float]] = {}
    encoder:   dict[str, int]         = {}

    if has_product:
        for code, grp in monthly.groupby("product_code"):
            grp = grp.sort_values("year_month")
            seed_data[str(code)] = grp["quantity"].tolist()
            enc = int(grp["product_encoded"].iloc[0])
            encoder[str(code)] = enc
    else:
        seed_data[""] = monthly.sort_values("year_month")["quantity"].tolist()

    context = {
        "has_product":     has_product,
        "base_period":     base_period,
        "last_period":     last_period,
        "seed_data":       seed_data,
        "product_encoder": encoder,
    }
    print(f"[CONTEXT] Produits : {list(seed_data.keys())[:10]}")
    print(f"[CONTEXT] Prévision à partir de : {last_period}")
    return context


def _get_product_meta(meta_df, product_code: str) -> dict:
    """
    Retourne les métadonnées d'un produit depuis le DataFrame chargé,
    ou des valeurs par défaut si le produit n'est pas présent.
    """
    defaults = {
        "shelf_life_days":           DEFAULT_SHELF_LIFE_DAYS,
        "lead_time_days":            DEFAULT_LEAD_TIME_DAYS,
        "current_stock":             0.0,
        "min_order_qty":             0.0,
        "production_lead_time_days": DEFAULT_PROD_LEAD_TIME_DAYS,
    }
    if meta_df is None or product_code not in meta_df.index:
        return defaults

    row = meta_df.loc[product_code]
    return {k: float(row.get(k, defaults[k])) for k in defaults}


def _get_max_dv(meta: dict, avg_monthly: float) -> float:
    """Quantité maximale selon la durée de vie (DV)."""
    return (meta["shelf_life_days"] / 30.0) * avg_monthly
