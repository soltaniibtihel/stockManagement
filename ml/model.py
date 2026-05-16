import joblib
import os
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "stock_model.joblib")


def train_model(X: pd.DataFrame, y: pd.Series) -> Pipeline:
    """Build and fit a sklearn Pipeline (imputer → RandomForest)."""
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

    pipeline.fit(X, y)
    print(f"[MODEL] Trained on {X.shape[0]} rows with features: {list(X.columns)}")
    return pipeline


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
