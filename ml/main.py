from fastapi import FastAPI
from predict import predict

app = FastAPI()

@app.get("/predict")
def get_prediction(moving_avg: float, consumption: float):

    result = predict(moving_avg, consumption)

    return result
