import joblib
import os
import warnings
import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

try:
    import lightgbm as lgb
    _USE_LGBM = True
except ImportError:
    from sklearn.ensemble import RandomForestRegressor
    _USE_LGBM = False

try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from prophet import Prophet
    _USE_PROPHET = True
except ImportError:
    _USE_PROPHET = False

try:
    from xgboost import XGBRegressor
    _USE_XGBOOST = True
except ImportError:
    _USE_XGBOOST = False

MODEL_DIR          = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH         = os.path.join(MODEL_DIR, "stock_model.joblib")
CONTEXT_PATH       = os.path.join(MODEL_DIR, "model_context.joblib")
PROPHET_MODEL_PATH = os.path.join(MODEL_DIR, "prophet_models.joblib")


# ===========================================================================
# LightGBM / RandomForest pipeline  (modèle principal)
# ===========================================================================

def _build_pipeline() -> Pipeline:
    if _USE_LGBM:
        estimator = lgb.LGBMRegressor(
            n_estimators=500,
            learning_rate=0.05,
            num_leaves=63,
            min_child_samples=5,
            random_state=42,
            verbose=-1,
        )
        print("[MODEL] Using LightGBM")
    else:
        from sklearn.ensemble import RandomForestRegressor
        estimator = RandomForestRegressor(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        print("[MODEL] LightGBM not installed — using RandomForest")

    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model",   estimator),
    ])


def train_model(X: pd.DataFrame, y: pd.Series) -> tuple[Pipeline, dict]:
    """
    Fit the pipeline and return (pipeline, metrics).
    metrics = {r2, rmse, mae, model_type, rows_trained}
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    pipeline = _build_pipeline()

    if len(X) >= 20:
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        pipeline.fit(X_tr, y_tr)
        y_pred = pipeline.predict(X_te)
        _y_te = y_te
    else:
        pipeline.fit(X, y)
        y_pred = pipeline.predict(X)
        _y_te = y

    metrics = {
        "r2":           round(float(r2_score(_y_te, y_pred)), 4),
        "rmse":         round(float(mean_squared_error(_y_te, y_pred) ** 0.5), 4),
        "mae":          round(float(mean_absolute_error(_y_te, y_pred)), 4),
        "model_type":   "LightGBM" if _USE_LGBM else "RandomForest",
        "rows_trained": int(len(X)),
    }
    print(
        f"[MODEL] {metrics['model_type']} trained on {metrics['rows_trained']} monthly rows | "
        f"R²={metrics['r2']}  RMSE={metrics['rmse']}  MAE={metrics['mae']}"
    )
    return pipeline, metrics


# ===========================================================================
# Random Forest vs XGBoost — construction et comparaison
# ===========================================================================

def _build_pipeline_for(model_type: str) -> Pipeline:
    """
    Construit un Pipeline scikit-learn pour le modèle demandé.

    Structure :
        SimpleImputer(strategy="median")  →  Estimateur choisi

    Modèles supportés :
      "random_forest"
          Méthode  : Bagging — entraîne N arbres indépendants sur des
                     sous-échantillons aléatoires, puis moyenne leurs prédictions.
          Forces   : robuste, pas de normalisation requise, peu de réglages.

      "xgboost"
          Méthode  : Gradient Boosting régularisé — construit les arbres en
                     séquence (chaque arbre corrige les erreurs du précédent).
          Forces   : régularisation L1 (reg_alpha) + L2 (reg_lambda) qui limitent
                     le surapprentissage ; souvent plus précis sur séries temporelles.

    Args:
        model_type : "random_forest" | "xgboost"

    Raises:
        ImportError si XGBoost n'est pas installé
        ValueError  si model_type invalide
    """
    from sklearn.ensemble import RandomForestRegressor

    model_type = model_type.lower()

    if model_type == "random_forest":
        estimator = RandomForestRegressor(
            n_estimators=300,      # nombre d'arbres dans la forêt
            max_depth=12,          # profondeur maximale par arbre
            min_samples_leaf=2,    # min. échantillons par feuille (régularisation)
            random_state=42,
            n_jobs=-1,             # parallélisation sur tous les cœurs CPU
        )
        print("[MODEL] Pipeline → RANDOM FOREST")

    elif model_type == "xgboost":
        if not _USE_XGBOOST:
            raise ImportError(
                "XGBoost non installé. Exécutez : pip install xgboost>=2.0.0"
            )
        estimator = XGBRegressor(
            n_estimators=400,       # nombre d'itérations de boosting
            learning_rate=0.05,     # taux d'apprentissage (shrinkage entre arbres)
            max_depth=6,            # profondeur max par arbre
            subsample=0.8,          # fraction des lignes utilisées par arbre
            colsample_bytree=0.8,   # fraction des colonnes utilisées par arbre
            reg_alpha=0.1,          # régularisation L1 (Lasso)
            reg_lambda=1.0,         # régularisation L2 (Ridge)
            random_state=42,
            n_jobs=-1,
            verbosity=0,            # désactive les logs verbeux XGBoost
        )
        print("[MODEL] Pipeline → XGBOOST")

    else:
        raise ValueError(
            f"model_type '{model_type}' invalide pour cette fonction. "
            f"Valeurs acceptées : 'random_forest', 'xgboost'"
        )

    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model",   estimator),
    ])


def _fit_and_evaluate(
    pipeline: Pipeline,
    X: pd.DataFrame,
    y: pd.Series,
) -> tuple[Pipeline, dict]:
    """
    Entraîne un pipeline et calcule ses métriques sur un jeu de test.

    Stratégie :
      - Si ≥ 20 échantillons : split 80 % / 20 % (validation hold-out)
      - Sinon               : évaluation sur les données d'entraînement

    Métriques :
      r2   : proportion de variance expliquée (1.0 = parfait)
      rmse : racine de l'erreur quadratique moyenne (même unité que y)
      mae  : erreur absolue moyenne (plus robuste aux outliers)

    Returns:
        (pipeline_entraîné, metrics_dict)
    """
    if len(X) >= 20:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
    else:
        pipeline.fit(X, y)
        y_pred = pipeline.predict(X)
        y_test = y

    metrics = {
        "r2":           round(float(r2_score(y_test, y_pred)), 4),
        "rmse":         round(float(mean_squared_error(y_test, y_pred) ** 0.5), 4),
        "mae":          round(float(mean_absolute_error(y_test, y_pred)), 4),
        "rows_trained": int(len(X)),
    }
    return pipeline, metrics


def compare_rf_xgb(X: pd.DataFrame, y: pd.Series) -> dict:
    """
    Entraîne Random Forest ET XGBoost sur les mêmes données et compare
    leurs métriques côte à côte.

    Les deux modèles partagent exactement la même partition train/test
    (random_state=42) pour garantir une comparaison équitable.

    Processus :
      1. Construit et entraîne RandomForestRegressor
      2. Construit et entraîne XGBRegressor
      3. Compare les R² → déclare le gagnant
      4. Retourne les métriques des deux modèles + le meilleur pipeline

    Args:
        X : matrice de features partagée (lag, rolling, temporelles)
        y : cible partagée (quantité mensuelle)

    Returns:
        {
          "rf_metrics"    : { r2, rmse, mae, rows_trained, model_type },
          "xgb_metrics"   : { r2, rmse, mae, rows_trained, model_type },
          "winner"        : "random_forest" | "xgboost",
          "best_pipeline" : Pipeline du modèle ayant le R² le plus élevé
        }
    """
    print(f"\n[COMPARE RF/XGB] Comparaison sur {len(X)} lignes mensuelles")
    print(f"[COMPARE RF/XGB] {'─' * 50}")

    # Étape 1 : Random Forest
    rf_pipeline, rf_metrics = _fit_and_evaluate(
        _build_pipeline_for("random_forest"), X, y
    )
    rf_metrics["model_type"] = "RANDOM FOREST"
    print(
        f"[COMPARE RF/XGB] RF  → R²={rf_metrics['r2']}  "
        f"RMSE={rf_metrics['rmse']}  MAE={rf_metrics['mae']}"
    )

    # Étape 2 : XGBoost
    xgb_pipeline, xgb_metrics = _fit_and_evaluate(
        _build_pipeline_for("xgboost"), X, y
    )
    xgb_metrics["model_type"] = "XGBOOST"
    print(
        f"[COMPARE RF/XGB] XGB → R²={xgb_metrics['r2']}  "
        f"RMSE={xgb_metrics['rmse']}  MAE={xgb_metrics['mae']}"
    )

    # Étape 3 : Sélection du gagnant (critère : R² maximum)
    winner = "xgboost" if xgb_metrics["r2"] >= rf_metrics["r2"] else "random_forest"
    best_pipeline = xgb_pipeline if winner == "xgboost" else rf_pipeline
    print(f"[COMPARE RF/XGB] Gagnant → {winner.upper()}")
    print(f"[COMPARE RF/XGB] {'─' * 50}")

    return {
        "rf_metrics":    rf_metrics,
        "xgb_metrics":   xgb_metrics,
        "rf_pipeline":   rf_pipeline,    # pipeline RF entraîné (pour générer ses prévisions)
        "xgb_pipeline":  xgb_pipeline,   # pipeline XGB entraîné (pour générer ses prévisions)
        "winner":        winner,
        "best_pipeline": best_pipeline,
    }


def save_model(pipeline: Pipeline, context: dict) -> None:
    """Save pipeline and prediction context side by side."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    joblib.dump(context, CONTEXT_PATH)
    print(f"[MODEL] Saved → {MODEL_PATH}")
    print(f"[MODEL] Context saved → {CONTEXT_PATH}")


def load_model() -> tuple[Pipeline, dict]:
    """Load pipeline and context. Raises FileNotFoundError if not trained yet."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "No trained model found. Call POST /train first."
        )
    pipeline = joblib.load(MODEL_PATH)
    context  = joblib.load(CONTEXT_PATH)
    print(f"[MODEL] Loaded from {MODEL_PATH}")
    return pipeline, context


# ===========================================================================
# Prophet  (modèle de comparaison)
# ===========================================================================

def train_prophet_models(monthly_df: pd.DataFrame) -> tuple[dict, dict]:
    """
    Entraîne un modèle Prophet par produit (ou un modèle global si pas de colonne
    product_code) et retourne (prophet_models_dict, aggregated_metrics).

    prophet_models_dict : { product_code: fitted Prophet } ou { "__all__": fitted Prophet }
    aggregated_metrics  : { r2, rmse, mae, model_type, rows_trained, n_products }
    """
    if not _USE_PROPHET:
        raise ImportError(
            "Prophet n'est pas installé. Exécutez : pip install prophet"
        )

    os.makedirs(MODEL_DIR, exist_ok=True)

    has_product = "product_code" in monthly_df.columns
    prophet_models: dict[str, object] = {}

    all_y_true: list[float] = []
    all_y_pred: list[float] = []

    def _fit_one(df_product: pd.DataFrame, code: str) -> None:
        """Prépare le DataFrame Prophet, fit, évalue en CV interne."""
        # Prophet attend les colonnes ds (date) et y (cible)
        prophet_df = pd.DataFrame({
            "ds": df_product["year_month"].dt.to_timestamp(),
            "y":  df_product["quantity"].values.astype(float),
        }).sort_values("ds").reset_index(drop=True)

        if len(prophet_df) < 4:
            print(f"[PROPHET] {code} : trop peu de points ({len(prophet_df)}), ignoré")
            return

        # Séparation train / test  (20 % des périodes les plus récentes)
        split = max(1, int(len(prophet_df) * 0.2))
        train_df = prophet_df.iloc[:-split]
        test_df  = prophet_df.iloc[-split:]

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False,
                seasonality_mode="multiplicative",
                changepoint_prior_scale=0.05,
            )
            m.fit(train_df)

        forecast = m.predict(test_df[["ds"]])
        y_pred_local = np.maximum(forecast["yhat"].values, 0)
        y_true_local = test_df["y"].values

        all_y_true.extend(y_true_local.tolist())
        all_y_pred.extend(y_pred_local.tolist())

        # Ré-entraîner sur toutes les données pour les prévisions futures
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m_full = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False,
                seasonality_mode="multiplicative",
                changepoint_prior_scale=0.05,
            )
            m_full.fit(prophet_df)

        prophet_models[code] = m_full
        print(f"[PROPHET] {code} : {len(prophet_df)} mois → modèle entraîné")

    if has_product:
        for code, grp in monthly_df.groupby("product_code"):
            _fit_one(grp, str(code))
    else:
        _fit_one(monthly_df, "__all__")

    if not all_y_true:
        raise ValueError("Aucun produit n'avait suffisamment de données pour Prophet.")

    y_true_arr = np.array(all_y_true)
    y_pred_arr = np.array(all_y_pred)

    metrics = {
        "r2":           round(float(r2_score(y_true_arr, y_pred_arr)), 4),
        "rmse":         round(float(mean_squared_error(y_true_arr, y_pred_arr) ** 0.5), 4),
        "mae":          round(float(mean_absolute_error(y_true_arr, y_pred_arr)), 4),
        "model_type":   "Prophet",
        "rows_trained": int(len(monthly_df)),
        "n_products":   len(prophet_models),
    }
    print(
        f"[PROPHET] {metrics['n_products']} produits | "
        f"R²={metrics['r2']}  RMSE={metrics['rmse']}  MAE={metrics['mae']}"
    )
    return prophet_models, metrics


def save_prophet_models(prophet_models: dict) -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(prophet_models, PROPHET_MODEL_PATH)
    print(f"[PROPHET] Sauvegardé → {PROPHET_MODEL_PATH}")


def load_prophet_models() -> dict:
    if not os.path.exists(PROPHET_MODEL_PATH):
        raise FileNotFoundError(
            "Aucun modèle Prophet trouvé. Appelez POST /train-compare d'abord."
        )
    return joblib.load(PROPHET_MODEL_PATH)


def prophet_predict_horizon(
    prophet_models: dict,
    horizon_months: int = 12,
    product_code: str | None = None,
) -> list[dict]:
    """
    Prévoir les `horizon_months` prochains mois avec les modèles Prophet.

    Retourne une liste de { period, predicted_quantity } triée chronologiquement.
    """
    if not _USE_PROPHET:
        raise ImportError("Prophet non installé.")

    # Sélectionner le bon modèle
    if product_code and product_code in prophet_models:
        models_to_use = {product_code: prophet_models[product_code]}
    elif "__all__" in prophet_models:
        models_to_use = {"__all__": prophet_models["__all__"]}
    else:
        # Agréger toutes les prévisions de tous les produits
        models_to_use = prophet_models

    from datetime import datetime
    import pandas as pd

    results_by_period: dict[str, float] = {}

    for code, m in models_to_use.items():
        future = m.make_future_dataframe(periods=horizon_months, freq="MS")
        forecast = m.predict(future)
        future_only = forecast.tail(horizon_months)

        for _, row in future_only.iterrows():
            period_str = row["ds"].strftime("%Y-%m")
            qty = max(0.0, float(row["yhat"]))
            results_by_period[period_str] = results_by_period.get(period_str, 0.0) + qty

    return [
        {"period": p, "predicted_quantity": round(q, 2)}
        for p, q in sorted(results_by_period.items())
    ]
