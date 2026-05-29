# House Price Predictor — ML Inference API

A production-grade ML inference platform serving real-time house price predictions at sub-3ms P95 latency. Built with FastAPI, Redis, Docker, and React — deployed on AWS EC2 with GitHub Actions CI/CD.

**Live stats from load testing:** 600+ requests · 2.15ms P95 · 4.52ms P99 · ~70% cache hit rate

---

## Architecture
React Dashboard (WebSocket)
↓
FastAPI Server
↓
Redis Cache ←→ scikit-learn Model
↓
AWS EC2 (Docker Compose)
**Request flow:** Every prediction checks Redis first using an MD5 cache key. Cache hit → returns in <1ms. Cache miss → runs model inference (~2ms), stores result, returns price.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| ML Model | scikit-learn GradientBoosting |
| Cache | Redis 7 |
| Frontend | React + Recharts + WebSocket |
| Containerization | Docker + Docker Compose |
| Cloud | AWS EC2 (Ubuntu 24.04) |
| CI/CD | GitHub Actions |
| Metrics | Prometheus client (P50/P95/P99) |

---

## Performance

| Metric | Value |
|---|---|
| P50 latency | 1.87ms |
| P95 latency | 2.15ms |
| P99 latency | 4.52ms |
| Requests served | 600+ |
| Cache hit rate | ~70% |
| Redundant compute eliminated | ~70% |

---

## Project Structure
ml-inference-api/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI routes + WebSocket
│   │   ├── model.py       # Model loading + inference
│   │   ├── cache.py       # Redis cache logic
│   │   ├── metrics.py     # P95/P99 latency tracking
│   │   └── schemas.py     # Pydantic request/response models
│   ├── model_training/
│   │   └── train.py       # Train + serialize model
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Dashboard + live charts
│   │   └── index.css
│   ├── nginx-frontend.conf
│   └── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── deploy.yml     # CI/CD pipeline
└── load_test.py           # Traffic generator
---

## Running Locally

**Prerequisites:** Docker, Docker Compose

```bash
git clone https://github.com/YOUR_USERNAME/ml-inference-api.git
cd ml-inference-api
docker compose up --build
```

- Dashboard: http://localhost
- API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Metrics: http://localhost:8000/metrics
- Stats: http://localhost:8000/stats

---

## API Reference

### `POST /predict`

```json
// Request
{
  "sqft": 2000,
  "bedrooms": 3,
  "bathrooms": 2,
  "age_years": 10,
  "garage": 1,
  "neighborhood": 3
}

// Response
{
  "predicted_price": 548051.83,
  "cache_hit": true,
  "latency_ms": 1.07,
  "model_version": "1.0.0"
}
```

### `GET /stats`
Returns real-time P50/P95/P99 latency and Redis cache hit rate.

### `GET /health`
Health check for load balancer / CI/CD pipeline.

### `WS /ws/live`
WebSocket endpoint — pushes updated latency stats every 2 seconds.

---

## Deployment (AWS EC2)

**Requirements:** EC2 instance (t3.micro+), ports 22/80/8000 open, Docker installed.

```bash
# Copy project to EC2
rsync -avz --exclude='.git' \
  -e "ssh -i your-key.pem" \
  ./ ubuntu@YOUR_EC2_IP:/home/ubuntu/ml-inference-api/

# SSH in and start
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
cd ml-inference-api
docker compose up --build -d
```

**CI/CD via GitHub Actions** — add these secrets to your repo:

| Secret | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` file |

Every push to `main` automatically deploys to EC2.

---

## Caching Strategy

Cache keys are MD5 hashes of the sorted input feature dict. This means:
- Same inputs → same key → instant cache hit, model skipped entirely
- Different inputs → cache miss → model runs, result stored for next time
- TTL: 1 hour per entry

This eliminated ~70% of redundant model computation across 600+ requests.

---

## Load Testing

```bash
# Run 600 requests against live server
python load_test.py
```

Results visible at `/stats` endpoint after the run.

---

## Resume Bullets

> Built a real-time ML inference API serving 600+ predictions at **2.15ms P95 latency** on AWS EC2, with Redis caching eliminating ~70% of redundant model calls.

> Shipped full stack (FastAPI + Redis + React) via **Docker Compose and GitHub Actions CI/CD**; built live WebSocket dashboard streaming P95/P99 latency metrics.