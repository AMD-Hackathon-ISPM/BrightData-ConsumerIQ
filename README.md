# ConsumerIQ

AI-powered consumer intelligence platform for founders launching e-commerce products. Live BrightData scraping → local Llama 3.2 3B synthesis → GPT dashboard generation → persistent knowledge graph memory via Cognee.

For the deep technical writeup (3-layer LLM pipeline, GPU-in-k3d workaround, recency-weighted pgvector, Cognee integration), see [ForHackathon.md](ForHackathon.md).

## Architecture

| Layer | Service | Language | Role |
|---|---|---|---|
| Frontend | `consumeriq-frontend` | React / Vite / TS | Onboarding flow, dashboard, agent chat |
| Gateway | `consumeriq-nginx` | NGINX | Reverse proxy, `auth_request` token validation |
| Auth / Orchestration | `consumeriq-go` | Go | Auth, opaque session tokens, founder form ingestion |
| Orchestration worker | `consumeriq-go-worker` | Go / asynq | `background` queue — form-received fan-out |
| API | `consumeriq-api` | Python / FastAPI | REST endpoints, task dispatch, admin endpoints |
| Inference worker | `consumeriq-worker-inference` | Python / Celery | `inference` + `synthesis` queues |
| Scraping worker | `consumeriq-worker-scraping` | Python / Celery | `scraping` queue (concurrency 4) |
| LLM | `consumeriq-inference` | llama-cpp-python | Llama 3.2 3B GGUF — GPU |
| Embeddings | `consumeriq-embeddings` | FastAPI + fastembed | Multilingual MiniLM L12 — OpenAI-compatible `/v1/embeddings` |
| Translator | `consumeriq-translator` | llama-cpp-python | Qwen 3.5 0.8B GGUF — GPU (CJK → EN) |
| Store | PostgreSQL + Redis | — | Persistence + task queues + pipeline state |
| Memory | Cognee | — | Persistent knowledge graph (env-gated, default off) |

### Pipeline (founder form → dashboard)

```
POST /go-api/founder-form/submit
  └─ Go writes form_pipeline:{formId} to Redis, enqueues asynq form_received
     └─ go-worker calls POST /api/scrape-market-signals  → scraping queue
        ├─ Layer 0: Llama generates 6 keywords from product brief
        ├─ BrightData scrapes up to 50 signals (marketplace + social)
        ├─ Signals embedded (BGE) + inserted into marketSignals (pgvector)
        ├─ [optional] Cognee ingests signals into knowledge graph
        └─ dispatches processLlmInsights → synthesis queue
           ├─ Layer 1: Llama omni-prompt → gtm/finance/security/extractedData
           ├─ Layer 2: GPT omni-prompt → marketOverview/demandPulse/competitorMirror/launchCompass
           ├─ [optional] Cognee ingests dashboard entities into graph
           └─ writes categoryInsights row, sets inference_stage=completed
```

The frontend polls `/api/form-pipeline/{formId}` every 3 s. Five granular stages are surfaced (`pending → analyzing → cross_referencing → completed | failed`); the "Open dashboard" button stays disabled until `completed` is verified with non-empty `dashboardData`. No timeout escape, no mock-data fallback — see [ForHackathon.md §4](ForHackathon.md).

---

## Local Setup (GPU)

### Prerequisites

- Docker Desktop running with WSL2 backend
- NVIDIA GPU with CUDA 12.1-compatible drivers installed on host
- `k3d` and `kubectl` installed (`choco install k3d kubernetes-cli`)

> **GPU note:** Docker Desktop on Windows uses WSL2 GPU paravirtualization (`/dev/dxg`), not native CUDA device files. The NVIDIA k8s device plugin cannot see this, so inference and translator run as plain Docker containers outside k3d (on the same Docker network) with `--gpus all`. k8s routes to them via static Endpoints.

### 1 — Create registry + cluster

```powershell
k3d registry create consumeriq-registry --port 5001
k3d cluster create --config infra/k3d/k3d.yaml
k3d kubeconfig merge consumeriq-local --kubeconfig-switch-context
```

### 2 — Deploy core services

```powershell
kubectl apply -k infra/k8s/postgres
kubectl apply -k infra/k8s/redis
```

### 3 — Build images

> **Note:** Inference images must use project root `.` as build context (model files live in `models/` at the repo root).

```powershell
# Python backend
docker build -t localhost:5001/consumeriq-backend:local -f backend/Dockerfile .
docker push localhost:5001/consumeriq-backend:local

# Go service
cd backend/go-service; go mod tidy; cd ../..
docker build -t localhost:5001/consumeriq-go:local backend/go-service/
docker push localhost:5001/consumeriq-go:local

# Frontend
docker build -t localhost:5001/consumeriq-frontend:local -f frontend/Dockerfile frontend/
docker push localhost:5001/consumeriq-frontend:local

# LLM — Llama 3.2 3B (build context = repo root, model at models/Llama3.23B.gguf)
docker build -t localhost:5001/consumeriq-inference:local -f inference/Dockerfile .
docker push localhost:5001/consumeriq-inference:local

# Embeddings — multilingual MiniLM L12
docker build -t localhost:5001/consumeriq-embeddings:local -f inference/embeddings.Dockerfile .
docker push localhost:5001/consumeriq-embeddings:local

# Translator — Qwen 3.5 0.8B (build context = repo root, model at models/Qwen3.50.8B.gguf)
docker build -t localhost:5001/consumeriq-translator:local -f inference/translator.Dockerfile .
docker push localhost:5001/consumeriq-translator:local
```

### 4 — Start GPU inference containers (outside k3d)

A single script starts the containers, discovers their IPs, and wires the k8s Endpoints automatically:

```powershell
.\scripts\start-gpu-inference.ps1
```

Pass `-Rebuild` to also rebuild and push the images before starting:

```powershell
.\scripts\start-gpu-inference.ps1 -Rebuild
```

The script starts `ciq-inference-gpu` and `ciq-translator-gpu` on the `k3d-consumeriq-local` Docker network with `--gpus all`, then applies k8s Endpoints pointing to their IPs so the existing `consumeriq-inference` and `consumeriq-translator` ClusterIP services route to them.

### 5 — Create backend secrets

```powershell
cp infra/k8s/backend/.env.example infra/k8s/backend/.env
# Fill in BRIGHTDATA_API_TOKEN (required)
# Optionally fill in SCRAPINGBEE_API_KEY for Google SERP fallback
kubectl create secret generic consumeriq-api-keys -n consumeriq `
  --from-env-file=infra/k8s/backend/.env `
  --dry-run=client -o yaml | kubectl apply -f -
```

### 6 — Deploy everything

```powershell
kubectl apply -k infra/k8s/inference   # deploys services + embeddings only (inference/translator use Docker containers above)
kubectl apply -k infra/k8s/backend
kubectl apply -k infra/k8s/frontend
kubectl apply -k infra/k8s/nginx
```

Watch until all pods are Running:

```powershell
kubectl get pods -n consumeriq -w
```

---

## Access

| Endpoint | URL |
|---|---|
| Frontend | `http://localhost:30080` |
| Python API | `http://localhost:30080/api` |
| Auth / Go API | `http://localhost:30080/auth` and `http://localhost:30080/go-api` |

---

## Environment Variables

See [infra/k8s/backend/.env.example](infra/k8s/backend/.env.example) for the complete list with inline docs. Highlights:

**Required**

| Variable | Description |
|---|---|
| `BRIGHTDATA_API_TOKEN` | BrightData API key for marketplace + social scraping |
| `OPENAI_API_KEY` | OpenAI key for Layer 2 dashboard generation (and Cognee, when enabled) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Go service session token signing key |

**Pipeline tuning**

| Variable | Default | Description |
|---|---|---|
| `PIPELINE_MAX_SIGNALS` | `50` | Cap on signals stored per scrape run |
| `PIPELINE_MARKETPLACE_RECORD_LIMIT` | `100` | Records pulled per marketplace per keyword |
| `PIPELINE_SKIP_MARKETPLACES` | `lazada` | CSV of marketplaces to skip |
| `SIGNAL_RECENCY_WEIGHT` | `0.005` | Penalty per day added to pgvector distance |

**Daily cron jobs** — all default `false` so dev runs don't burn credits

| Variable | Cron | Description |
|---|---|---|
| `DAILY_REFRESH_ENABLED` | 02:00 UTC | Re-scrape market signals for every user |
| `COMPLIANCE_SCRAPE_ENABLED` | 03:00 UTC | LLM generates 5 compliance keywords per user, scrapes them via SERP |
| `SIGNAL_TTL_ENABLED` + `SIGNAL_TTL_MONTHS=4` | 01:00 UTC | DELETE marketSignals rows older than the cutoff |

**Cognee memory** — env-gated knowledge graph layer

| Variable | Default | Description |
|---|---|---|
| `COGNEE_ENABLED` | `false` | Master switch — ingests every scrape + dashboard into a graph; adds `memory_search` tool to ReAct agent |
| `COGNEE_USE_LOCAL_INFERENCE` | `false` | When `true`, Cognee uses local Llama + embeddings instead of OpenAI |
| `COGNEE_LLM_MODEL` | `gpt-4o-mini` | Cloud-mode entity-extraction model |

**Admin / cron auth**

| Variable | Description |
|---|---|
| `ADMIN_API_TOKEN` | Required for `/api/admin/*` endpoints and the three CronJobs (must match the `consumeriq-admin` Secret value) |

---

## Bright Data Integration

Scraping uses Bright Data's Web Scraper API for structured marketplace and social data.

**Category → marketplace routing** (`CATEGORY_MARKETPLACES` in `backend/redis/worker.py`):

| Category keywords | Marketplaces queried |
|---|---|
| fashion, apparel, clothing, bags, accessories | Amazon, Etsy, Lazada, Tokopedia |
| beauty, skincare, cosmetics, makeup | Amazon, Walmart, Lazada |
| electronics, tech, gadgets, phone, laptop | Amazon, Walmart, Lazada, Tokopedia |
| home, furniture, kitchen, decor | Amazon, Walmart, Etsy |
| handmade, craft, art, jewelry | Etsy, Amazon |
| sports, fitness, outdoor, camping, toys, games | Amazon, Walmart |
| grocery, food, health, supplements, pet, automotive, tools | Amazon, Walmart |
| *(default)* | Amazon, Google Shopping |

Scraping is capped at **1 000 signals per pipeline run** to control Bright Data credit usage.

**Supported discovery endpoints:**

| Marketplace | BrightData dataset |
|---|---|
| Amazon | `amazon.products.discover_keyword` |
| Etsy | `etsy.products.discover_keyword` |
| Walmart | `walmart.products.discover_keyword` |
| Lazada | `lazada.products.discover_keyword` |
| Tokopedia | `tokopedia.products.discover_keyword` |
| Google Shopping | `google.shopping.discover_keyword` |

**Direct Bright Data API endpoints (synchronous):**

```
GET  /api/brightdata/endpoints
GET  /api/brightdata/schemas
POST /api/brightdata/scrape
POST /api/brightdata/scrape/{endpoint_key}
GET  /api/brightdata/snapshots/{snapshot_id}/progress
POST /api/brightdata/snapshots/{snapshot_id}/download
```

---

## Worker Queues

| Queue | Worker | Tasks | Priority |
|---|---|---|---|
| `inference` | `consumeriq-worker-inference` | `runAgentTask`, `runPersonaDecodeTask` | HIGH |
| `synthesis` | `consumeriq-worker-inference` | `processLlmInsights`, `ingestSignalsIntoMemory`, `ingestDashboardIntoMemory` | MEDIUM |
| `scraping` | `consumeriq-worker-scraping` | `scrapeMarketSignals`, `refreshUserMarketSignals`, `scrapeComplianceSignals`, marketplace/social tasks | LOW |
| `background` | `consumeriq-go-worker` | `background:form_received` | — |

**Backpressure** (enable with `BACKPRESSURE_ENABLED=true`):
- Python API `/api/agent/run` and `/api/persona-decode` return `503` when `inference` queue depth ≥ `INFERENCE_QUEUE_LIMIT`

## Daily Automation (CronJobs)

Three Kubernetes CronJobs ship with the cluster, all idle by default. Each runs a `curl` container that hits an admin endpoint on the FastAPI service. The endpoint short-circuits with `{"status": "skipped"}` unless the corresponding env flag is `true`.

| CronJob | Schedule | Endpoint | Env flag |
|---|---|---|---|
| `consumeriq-prune-signals` | 01:00 UTC | `/api/admin/prune-old-signals` | `SIGNAL_TTL_ENABLED` |
| `consumeriq-daily-refresh` | 02:00 UTC | `/api/admin/trigger-daily-refresh` | `DAILY_REFRESH_ENABLED` |
| `consumeriq-compliance-scrape` | 03:00 UTC | `/api/admin/trigger-compliance-scrape` | `COMPLIANCE_SCRAPE_ENABLED` |

**To enable in production:**

```powershell
# 1. Create the admin token Secret
kubectl create secret generic consumeriq-admin -n consumeriq `
  --from-literal=ADMIN_API_TOKEN="$(openssl rand -hex 32)"

# 2. Flip the env flags in infra/k8s/backend/api-deployment.yaml
#    and worker-scraping-deployment.yaml from "false" to "true"

# 3. Reapply
kubectl apply -k infra/k8s/backend/
```

Inspect a manual run:
```powershell
kubectl create job --from=cronjob/consumeriq-daily-refresh manual-refresh-1 -n consumeriq
kubectl logs -n consumeriq job/manual-refresh-1
```

---

## Auth Flow

1. `POST /go-api/founder-form/submit` — registers + submits onboarding, returns opaque session token
2. `POST /auth/login` — returns session token for existing users
3. Pass `Authorization: Bearer <token>` on all subsequent requests
4. NGINX validates token via `auth_request` — Python services only receive `X-User-Id`, never raw tokens

---

## Troubleshooting

### Inference / translator not responding

These run as Docker containers outside k3d, not as k8s Deployments. Check them directly:

```powershell
docker ps --filter name=ciq-inference-gpu --filter name=ciq-translator-gpu
docker logs ciq-inference-gpu --tail 50
docker logs ciq-translator-gpu --tail 50
```

If a container exited, restart it:
```powershell
docker start ciq-inference-gpu
docker start ciq-translator-gpu
```

If k8s pods can't reach them, verify the Endpoints IPs are still correct (container IPs can change on restart):
```powershell
docker inspect ciq-inference-gpu --format "{{.NetworkSettings.Networks.\"k3d-consumeriq-local\".IPAddress}}"
docker inspect ciq-translator-gpu --format "{{.NetworkSettings.Networks.\"k3d-consumeriq-local\".IPAddress}}"
kubectl get endpoints -n consumeriq consumeriq-inference consumeriq-translator
```

Re-apply Endpoints if IPs changed (see step 4 of setup above).

### Pipeline returns 404 / stays Pending forever

The Go worker writes `form_pipeline:{formId}` to Redis immediately on form receipt. If the key is missing, Python returns `pending` rather than 404. If the frontend stays stuck:

```powershell
kubectl logs -n consumeriq deploy/consumeriq-go-worker
kubectl logs -n consumeriq deploy/consumeriq-worker-inference
```

### NGINX "host not found in upstream"

```powershell
kubectl apply -k infra/k8s/backend
kubectl apply -k infra/k8s/nginx
kubectl rollout restart -n consumeriq deploy/consumeriq-nginx
kubectl get pods -n consumeriq -w
```

### Workers not picking up jobs

```powershell
kubectl logs -n consumeriq deploy/consumeriq-worker-inference
kubectl logs -n consumeriq deploy/consumeriq-worker-scraping
kubectl logs -n consumeriq deploy/consumeriq-go-worker
```

### Postgres stuck in ContainerCreating

```powershell
kubectl apply -k infra/k8s/postgres
```

---

## Rebuilding Individual Services

```powershell
# After changing Python backend code:
docker build -t localhost:5001/consumeriq-backend:local -f backend/Dockerfile . && docker push localhost:5001/consumeriq-backend:local
kubectl rollout restart -n consumeriq deploy/consumeriq-api deploy/consumeriq-worker-inference deploy/consumeriq-worker-scraping

# After changing Go service code:
docker build -t localhost:5001/consumeriq-go:local backend/go-service/ && docker push localhost:5001/consumeriq-go:local
kubectl rollout restart -n consumeriq deploy/consumeriq-go deploy/consumeriq-go-worker

# After changing frontend code:
docker build -t localhost:5001/consumeriq-frontend:local -f frontend/Dockerfile frontend/ && docker push localhost:5001/consumeriq-frontend:local
kubectl rollout restart -n consumeriq deploy/consumeriq-frontend

# After changing inference or translator model / Dockerfile:
.\scripts\start-gpu-inference.ps1 -Rebuild
```

Apply a single manifest update without full rebuild:
```powershell
kubectl apply -f infra/k8s/{layer}/{service}-deployment.yaml
kubectl rollout restart -n consumeriq deploy/consumeriq-{serviceName}
```

---

## Stop / Cleanup

```powershell
# Stop GPU inference containers
docker stop ciq-inference-gpu ciq-translator-gpu

# Stop k8s workloads (keep cluster and data)
kubectl delete -k infra/k8s/nginx
kubectl delete -k infra/k8s/frontend
kubectl delete -k infra/k8s/inference
kubectl delete -k infra/k8s/backend
kubectl delete -k infra/k8s/redis
kubectl delete -k infra/k8s/postgres

# Pause cluster (preserves volumes)
k3d cluster stop consumeriq-local

# Restart cluster + GPU containers
k3d cluster start consumeriq-local
docker start ciq-inference-gpu ciq-translator-gpu

# Delete everything
docker rm -f ciq-inference-gpu ciq-translator-gpu
k3d cluster delete consumeriq-local
k3d registry delete consumeriq-registry
```
