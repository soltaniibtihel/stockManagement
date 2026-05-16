import joblib
import os
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "stock_model.joblib")


def train_model(X: pd.DataFrame, y: pd.Series) -> tuple[Pipeline, dict]:
    """
    Build and fit a sklearn Pipeline (imputer → RandomForest).
    Returns (pipeline, metrics) where metrics contains r2, rmse, mae.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    if len(X) >= 10:
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
        "r2":   round(float(r2_score(y_test, y_pred)), 4),
        "rmse": round(float(mean_squared_error(y_test, y_pred) ** 0.5), 4),
        "mae":  round(float(mean_absolute_error(y_test, y_pred)), 4),
    }
    print(f"[MODEL] Trained on {X.shape[0]} rows | R²={metrics['r2']} RMSE={metrics['rmse']} MAE={metrics['mae']}")
    return pipeline, metrics


def save_model(pipeline: Pipeline) -> None:
    joblib.dump(pipeline, MODEL_PATH)
    print(f"[MODEL] Saved to {MODEL_PATH}")


def load_model() -> Pipeline:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"No trained model found at '{MODEL_PATH}'. "
            "Please call /train first."
        )
    pipeline = joblib.load(MODEL_PATH)
    print(f"[MODEL] Loaded from {MODEL_PATH}")
    return pipeline
