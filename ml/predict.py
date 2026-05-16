import pandas as pd
from ml.model import load_model


def predict_demand(input_features: dict) -> dict:
    """
    Load the saved model and return predicted demand and recommended stock.

    Args:
        input_features: dict with keys matching the trained feature columns
                        (month, day_of_week, moving_avg, consumption,
                         optionally product_encoded).

    Returns:
        {"predicted_demand": float, "recommended_stock": float}
    """
    pipeline = load_model()

    feature_names = pipeline.feature_names_in_ if hasattr(pipeline, "feature_names_in_") else None
    if feature_names is None:
        # Derive from the imputer step
        feature_names = pipeline.named_steps["imputer"].feature_names_in_

    row = {col: input_features.get(col, 0) for col in feature_names}
    X = pd.DataFrame([row])

    print(f"[PREDICT] Input features: {row}")

    prediction = float(pipeline.predict(X)[0])
    prediction = max(0.0, round(prediction, 4))

    recommended = round(prediction * 1.3, 4)

    print(f"[PREDICT] predicted_demand={prediction}, recommended_stock={recommended}")

    return {
        "predicted_demand": prediction,
        "recommended_stock": recommended,
    }
