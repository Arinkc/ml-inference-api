import redis
import json
import os
import hashlib

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True,
)

CACHE_TTL = 3600  # 1 hour

def make_cache_key(features: dict) -> str:
    """Deterministic key from sorted feature dict."""
    serialized = json.dumps(features, sort_keys=True)
    return "prediction:" + hashlib.md5(serialized.encode()).hexdigest()

def get_cached(key: str):
    val = redis_client.get(key)
    return json.loads(val) if val else None

def set_cache(key: str, value: float):
    redis_client.setex(key, CACHE_TTL, json.dumps(value))

def get_cache_stats() -> dict:
    info = redis_client.info("stats")
    hits = info.get("keyspace_hits", 0)
    misses = info.get("keyspace_misses", 0)
    total = hits + misses
    return {
        "hits": hits,
        "misses": misses,
        "hit_rate": round(hits / total * 100, 1) if total > 0 else 0.0,
    }