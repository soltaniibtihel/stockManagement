"""Launch the ML API server from the project root."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("ml.main:app", host="0.0.0.0", port=8001, reload=True)
