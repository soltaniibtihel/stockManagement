import pickle
import numpy as np

def predict(moving_avg, consumption):

    with open("models/model.pkl", "rb") as f:
        model = pickle.load(f)

    prediction = model.predict([[moving_avg, consumption]])[0]

    # Simple business logic
    recommended_stock = prediction * 1.3

    return {
        "predicted_demand": round(prediction, 2),
        "recommended_stock": round(recommended_stock, 2)
    }
