import requests
import random
import time

URL = "http://54.234.33.53:8000/predict"
count = 0

print("Sending 600 requests...")
for _ in range(600):
    payload = {
        "sqft": random.randint(800, 4500),
        "bedrooms": random.randint(1, 6),
        "bathrooms": random.randint(1, 4),
        "age_years": random.randint(0, 60),
        "garage": random.randint(0, 3),
        "neighborhood": random.randint(1, 4),
    }
    r = requests.post(URL, json=payload)
    data = r.json()
    count += 1
    if count % 100 == 0:
        print(f"  {count} requests | latency: {data['latency_ms']}ms | cache: {'HIT' if data['cache_hit'] else 'MISS'}")
    time.sleep(0.05)

print(f"\nDone! Run: curl http://localhost:8000/stats")