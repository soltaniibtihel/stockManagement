import pickle
import numpy as np

# Global variable to hold the model in memory
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            with open("models/model.pkl", "rb") as f:
                _model = pickle.load(f)
        except FileNotFoundError:
            print("Error: models/model.pkl not found. Please run train.py first.")
    return _model

def reload_model():
    # Forces the model to be loaded fresh from disk on next prediction
    global _model
    _model = None
    get_model()

def predict(moving_avg, consumption, lag_1, day_of_week, month, is_weekend, is_month_end, rolling_std):
    model = get_model()
    
    if model is None:
        return {"error": "Model not initialized"}

    # Full Input vector: 8 features
    features = [[moving_avg, consumption, lag_1, day_of_week, month, is_weekend, is_month_end, rolling_std]]
    prediction = model.predict(features)[0]

    return {
        "predicted_demand": round(prediction, 2)
    }
