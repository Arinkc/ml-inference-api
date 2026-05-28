from prometheus_client import Histogram, Counter, Gauge
import time
import statistics
from collections import deque

# Prometheus metrics
REQUEST_LATENCY = Histogram(
    "prediction_latency_seconds",
    "Prediction request latency",
    buckets=[0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1.0]
)
REQUEST_COUNT = Counter("prediction_requests_total", "Total prediction requests")
CACHE_HITS = Counter("cache_hits_total", "Cache hits")
CACHE_MISSES = Counter("cache_misses_total", "Cache misses")
ACTIVE_CONNECTIONS = Gauge("websocket_connections_active", "Active WebSocket connections")

# In-memory rolling window for real-time P95/P99 display
_latencies = deque(maxlen=1000)

def record_latency(ms: float):
    REQUEST_LATENCY.observe(ms / 1000)
    REQUEST_COUNT.inc()
    _latencies.append(ms)

def get_percentiles() -> dict:
    if len(_latencies) < 2:
        return {"p50": 0, "p95": 0, "p99": 0, "count": len(_latencies)}
    sorted_l = sorted(_latencies)
    n = len(sorted_l)
    return {
        "p50": round(sorted_l[int(n * 0.50)], 2),
        "p95": round(sorted_l[int(n * 0.95)], 2),
        "p99": round(sorted_l[int(n * 0.99)], 2),
        "count": n,
    }