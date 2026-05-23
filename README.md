# BrightData-ConsumerIQ

## Local k3d setup

### 1 — Prerequisites
- Docker Desktop running
- `choco install k3d kubernetes-cli` (or equivalent)

### 2 — Create cluster + registry
```
k3d registry create consumeriq-registry --port 5001
k3d cluster create --config infra/k3d/k3d.yaml
k3d kubeconfig merge consumeriq-local --kubeconfig-switch-context
```

### 3 — Deploy core services
```
kubectl apply -k infra/k8s/postgres
kubectl apply -k infra/k8s/redis
```

### 4 — Build and push all images
Push uses `localhost:5001` (host-side port). Pods pull via `k3d-consumeriq-registry:5000` (Docker-network name — already set in the k8s manifests).
```
# Python backend
docker build -t localhost:5001/consumeriq-backend:local -f backend/Dockerfile .
docker push localhost:5001/consumeriq-backend:local

# Go service
cd backend/go-service && go mod tidy && cd ../..
docker build -t localhost:5001/consumeriq-go:local backend/go-service/
docker push localhost:5001/consumeriq-go:local

# Frontend
docker build -t localhost:5001/consumeriq-frontend:local -f frontend/Dockerfile frontend/
docker push localhost:5001/consumeriq-frontend:local

# Inference — LLM (Llama 3.2 3B)
docker build -t localhost:5001/consumeriq-inference:local -f inference/Dockerfile .
docker push localhost:5001/consumeriq-inference:local

# Inference — Embeddings (multilingual MiniLM L12)
docker build -t localhost:5001/consumeriq-embeddings:local -f inference/embeddings.Dockerfile .
docker push localhost:5001/consumeriq-embeddings:local

# Inference — Translator (Qwen 3.5 0.8B)
docker build -t localhost:5001/consumeriq-translator:local -f inference/translator.Dockerfile .
docker push localhost:5001/consumeriq-translator:local
```

### 5 — Create backend secrets
```
cp infra/k8s/backend/.env.example infra/k8s/backend/.env
# fill in SCRAPINGBEE_API_KEY in infra/k8s/backend/.env
kubectl create secret generic consumeriq-scrapingbee -n consumeriq --from-env-file=infra/k8s/backend/.env --dry-run=client -o yaml | kubectl apply -f -
```

### 6 — Deploy everything
```
kubectl apply -k infra/k8s/inference
kubectl apply -k infra/k8s/backend
kubectl apply -k infra/k8s/frontend
kubectl apply -k infra/k8s/nginx
```

## Access
- Frontend: `http://localhost:30080`
- API (Python — AI/ML): `http://localhost:30080/api`
- Auth: `http://localhost:30080/auth`
- Forms (Go): `http://localhost:30080/go-api`

## Services
| Service | Language | Handles |
|---|---|---|
| `consumeriq-api` | Python | FastAPI — REST endpoints, task dispatch |
| `consumeriq-worker-inference` | Python / Celery | `inference` queue — ReAct agent tasks (concurrency 1) |
| `consumeriq-worker-inference` | Python / Celery | `synthesis` queue — LLM batch synthesis (concurrency 1, lower priority) |
| `consumeriq-worker-scraping` | Python / Celery | `scraping` queue — ScrapingBee API calls (concurrency 4) |
| `consumeriq-inference` | llama.cpp server | LLM completions — Llama 3.2 3B GGUF |
| `consumeriq-embeddings` | llama.cpp server | Embedding vectors — multilingual MiniLM L12 GGUF |
| `consumeriq-translator` | llama.cpp server | CJK → English translation — Qwen 3.5 0.8B GGUF |
| `consumeriq-go` | Go | Auth, opaque session tokens, founder form submission |
| `consumeriq-go-worker` | Go / asynq | `background` queue — pipeline orchestration |
| `consumeriq-nginx` | NGINX | Reverse proxy, `auth_request` token validation |

## Worker queues
| Queue | Processed by | Task types | Priority |
|---|---|---|---|
| `inference` | `consumeriq-worker-inference` | `runAgentTask` | HIGH — drained first |
| `synthesis` | `consumeriq-worker-inference` | `processLlmInsights` | LOW — drained after inference |
| `scraping` | `consumeriq-worker-scraping` | `scrapeMarketSignals`, `scrapeMarketplacePage`, `scrapeMarketplacePageBatch`, `scrapeMarketplaceDiscovery`, `scrapeSocialPage`, `scrapeSocialDiscovery` | — |
| `background` | `consumeriq-go-worker` | `background:form_received` | — |

**Pipeline triggered on founder form submit:**
```
POST /go-api/founder-form/submit
  → Go enqueues background:form_received
    → go-worker checks inference queue depth (limit: 10)
    → go-worker calls POST /api/scrape-market-signals  (→ scraping queue)
    → go-worker calls POST /api/scan-market/{category} (→ synthesis queue)
```

**Scraping endpoints (all return 202 Accepted):**
```
POST /api/marketplace-scrape        → scraping queue → scrapeMarketplacePage
POST /api/marketplace-batch-scrape  → scraping queue → scrapeMarketplacePageBatch
POST /api/marketplace-discovery     → scraping queue → scrapeMarketplaceDiscovery
POST /api/social-scrape             → scraping queue → scrapeSocialPage
POST /api/social-discovery          → scraping queue → scrapeSocialDiscovery
GET  /api/task-status/{task_id}     → poll for result
```

## Backpressure
- Python API `/api/agent/run` rejects with `503` when the `inference` queue depth ≥ 5.
- Go worker skips `triggerInference` when the `inference` Redis list length ≥ 10.

## Auth flow
1. `POST /go-api/founder-form/submit` — registers + submits onboarding form, returns opaque session token
2. `POST /auth/login` — returns opaque session token for existing users
3. Pass the token as `Authorization: Bearer <token>` on all subsequent requests
4. NGINX validates the token via `auth_request` before proxying — Python only ever sees `X-User-Id`, never raw tokens

## Troubleshooting
- If `postgres-0` is stuck in `ContainerCreating`, re-run `kubectl apply -k infra/k8s/postgres`
- Inference pods take 60–90 s to become Ready (model load time) — `kubectl get pods -n consumeriq -w`
- If nginx logs show `host not found in upstream`, re-run:
  ```
  kubectl apply -k infra/k8s/backend
  kubectl apply -k infra/k8s/nginx
  kubectl rollout restart -n consumeriq deploy/consumeriq-nginx
  ```
- Worker not picking up jobs: check the correct queue name is set
  - Inference/synthesis worker: `kubectl logs -n consumeriq deploy/consumeriq-worker-inference`
  - Scraping worker: `kubectl logs -n consumeriq deploy/consumeriq-worker-scraping`
  - Go worker: `kubectl logs -n consumeriq deploy/consumeriq-go-worker`

## How to stop
```
# Stop workloads, keep cluster
kubectl delete -k infra/k8s/nginx
kubectl delete -k infra/k8s/frontend
kubectl delete -k infra/k8s/inference
kubectl delete -k infra/k8s/backend
kubectl delete -k infra/k8s/redis
kubectl delete -k infra/k8s/postgres

# Stop cluster
k3d cluster stop consumeriq-local

# Delete everything
k3d cluster delete consumeriq-local
k3d registry delete consumeriq-registry
```
