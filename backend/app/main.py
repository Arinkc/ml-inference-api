import time
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from .schemas import HouseFeatures, PredictionResponse
from .model import load_model, predict
from .cache import make_cache_key, get_cached, set_cache, get_cache_stats
from .metrics import (
    record_latency, get_percentiles,
    CACHE_HITS, CACHE_MISSES, ACTIVE_CONNECTIONS
)

app = FastAPI(title="ML Inference API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Prometheus metrics at /metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.on_event("startup")
async def startup():
    load_model()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=PredictionResponse)
def predict_price(features: HouseFeatures):
    start = time.perf_counter()
    feature_dict = features.model_dump()
    cache_key = make_cache_key(feature_dict)

    cached = get_cached(cache_key)
    if cached is not None:
        CACHE_HITS.inc()
        latency = (time.perf_counter() - start) * 1000
        record_latency(latency)
        return PredictionResponse(
            predicted_price=cached,
            cache_hit=True,
            latency_ms=round(latency, 2)
        )

    CACHE_MISSES.inc()
    price = predict(feature_dict)
    set_cache(cache_key, price)

    latency = (time.perf_counter() - start) * 1000
    record_latency(latency)
    return PredictionResponse(
        predicted_price=round(price, 2),
        cache_hit=False,
        latency_ms=round(latency, 2)
    )

@app.get("/stats")
def get_stats():
    return {
        "latency": get_percentiles(),
        "cache": get_cache_stats(),
    }

# WebSocket for live prediction feed
active_connections: list[WebSocket] = []

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    ACTIVE_CONNECTIONS.inc()
    try:
        while True:
            stats = {
                "latency": get_percentiles(),
                "cache": get_cache_stats(),
            }
            await websocket.send_text(json.dumps(stats))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        ACTIVE_CONNECTIONS.dec()