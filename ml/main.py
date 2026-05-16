import os
import traceback

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml.preprocessing import load_and_clean_data
from ml.features import build_features
from ml.model import train_model, save_model
from ml.predict import predict_demand
from ml.utils import save_upload, format_error

app = FastAPI(title="Med Oil — ML Stock Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# /train
# ---------------------------------------------------------------------------

@app.post("/train")
async def train(file: UploadFile = File(...)):
    tmp_path = None
    try:
        print(f"\n{'='*60}")
        print(f"[TRAIN] Received file: {file.filename}")
        print(f"[TRAIN] Content-type: {file.content_type}")

        tmp_path = await save_upload(file)

        df = load_and_clean_data(tmp_path)
        print(f"[TRAIN] DataFrame shape after cleaning: {df.shape}")
        print(f"[TRAIN] Columns: {list(df.columns)}")

        X, y = build_features(df)
        print(f"[TRAIN] Feature matrix shape: {X.shape}")

        pipeline, metrics = train_model(X, y)
        save_model(pipeline)

        return {
            "status": "success",
            "message": f"Model trained successfully on {X.shape[0]} rows.",
            "file": file.filename,
            "rows_used": X.shape[0],
            "features": list(X.columns),
            "metrics": metrics,
        }

    except Exception as e:
        err = format_error(e)
        print(f"[TRAIN] ERROR:\n{err}")
        raise HTTPException(status_code=422, detail=err)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ---------------------------------------------------------------------------
# /predict
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    month: int = 1
    day_of_week: int = 0
    moving_avg: float = 0.0
    consumption: float = 0.0
    product_encoded: int | None = None


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        print(f"\n{'='*60}")
        print(f"[PREDICT] Input: {req.model_dump()}")

        features = req.model_dump(exclude_none=True)
        result = predict_demand(features)
        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        err = format_error(e)
        print(f"[PREDICT] ERROR:\n{err}")
        raise HTTPException(status_code=422, detail=err)


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}
