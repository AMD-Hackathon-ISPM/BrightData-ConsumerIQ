# BrightData-ConsumerIQ

## Local k3d setup
1) Install Docker Desktop and ensure it is running.
2) Install k3d (`choco install k3d`) and kubectl (`choco install kubernetes-cli`).
3) Create the cluster:
   - `k3d cluster create --config infra/k3d/k3d.yaml`
   - `k3d kubeconfig merge consumeriq-local --kubeconfig-switch-context`
4) Deploy core services:
   - `kubectl apply -k infra/k8s/postgres`
   - `kubectl get configmap -n consumeriq postgres-init`
   - `kubectl apply -k infra/k8s/redis`
5) Build and load the Python backend image:
   - `docker build -t consumeriq-backend:local -f backend/Dockerfile .`
   - `k3d image import consumeriq-backend:local -c consumeriq-local`
6) Build and load the Go service image:
   - `cd backend/go-service && go mod tidy && cd ../..`
   - `docker build -t consumeriq-go:local backend/go-service/`
   - `k3d image import consumeriq-go:local -c consumeriq-local`
7) Create/update backend Kubernetes secrets from `infra/k8s/backend/.env`:
   - `cp infra/k8s/backend/.env.example infra/k8s/backend/.env` if the file does not exist yet
   - Fill in `SCRAPINGBEE_API_KEY` in `infra/k8s/backend/.env`
   - `kubectl create secret generic consumeriq-scrapingbee -n consumeriq --from-env-file=infra/k8s/backend/.env --dry-run=client -o yaml | kubectl apply -f -`
8) Deploy backend (Python API + all workers + Go service):
   - `kubectl apply -k infra/k8s/backend`
9) Build and load the frontend image:
   - `docker build -t consumeriq-frontend:local -f frontend/Dockerfile frontend`
   - `k3d image import consumeriq-frontend:local -c consumeriq-local`
10) Deploy frontend:
   - `kubectl apply -k infra/k8s/frontend`
11) Deploy nginx gateway (requires backend + frontend services to exist first):
    - `kubectl apply -k infra/k8s/nginx`
    - `kubectl rollout restart -n consumeriq deploy/consumeriq-nginx`

## Access
- Frontend: `http://localhost:30080`
- API (Python — AI/ML): `http://localhost:30080/api`
- Auth: `http://localhost:30080/auth`
- Forms (Go): `http://localhost:30080/go-api`

## Services
| Service | Language | Handles |
|---|---|---|
| `consumeriq-api` | Python | GGUF inference, LlamaCPP, ReAct agent, embeddings, scraping endpoints |
| `consumeriq-worker-inference` | Python / Celery | `inference` queue — ReAct agent tasks (concurrency 1) |
| `consumeriq-worker-inference` | Python / Celery | `synthesis` queue — LLM batch synthesis (concurrency 1, lower priority) |
| `consumeriq-worker-scraping` | Python / Celery | `scraping` queue — ScrapingBee API calls (concurrency 4) |
| `consumeriq-go` | Go | Auth, opaque session tokens, founder form submission |
| `consumeriq-go-worker` | Go / asynq | `background` queue — pipeline orchestration, dispatches to Python queues |
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
- This prevents queue pile-up and latency explosion on 4-core systems.

## Auth flow
1. `POST /go-api/founder-form/submit` — registers + submits onboarding form, returns opaque session token
2. `POST /auth/login` — returns opaque session token for existing users
3. Pass the token as `Authorization: Bearer <token>` on all subsequent requests
4. NGINX validates the token via `auth_request` before proxying — Python only ever sees `X-User-Id`, never raw tokens

## Troubleshooting
- If `postgres-0` is stuck in `ContainerCreating`, re-run:
   - `kubectl apply -k infra/k8s/postgres`
   - `kubectl get configmap -n consumeriq postgres-init`
- If nginx logs show `host not found in upstream`, re-run:
   - `kubectl create secret generic consumeriq-scrapingbee -n consumeriq --from-env-file=infra/k8s/backend/.env --dry-run=client -o yaml | kubectl apply -f -`
   - `kubectl apply -k infra/k8s/backend`
   - `kubectl apply -k infra/k8s/nginx`
   - `kubectl rollout restart -n consumeriq deploy/consumeriq-nginx`
- Worker not picking up jobs: check the correct queue name is set
   - Inference/synthesis worker: `kubectl logs -n consumeriq deploy/consumeriq-worker-inference`
   - Scraping worker: `kubectl logs -n consumeriq deploy/consumeriq-worker-scraping`
   - Go worker: `kubectl logs -n consumeriq deploy/consumeriq-go-worker`
- Go service not ready: check `kubectl logs -n consumeriq deploy/consumeriq-go`
  - Common cause: `REDIS_ADDR` or `DATABASE_URL` env var wrong, or `users` table not migrated yet

## How to stop
1) Stop just the workloads (keep cluster):
   - `kubectl delete -k infra/k8s/frontend`
   - `kubectl delete -k infra/k8s/backend`
   - `kubectl delete -k infra/k8s/redis`
   - `kubectl delete -k infra/k8s/postgres`
   - `kubectl delete -k infra/k8s/nginx`
2) Stop the whole cluster:
   - `k3d cluster stop consumeriq-local`
3) Delete the whole cluster:
   - `k3d cluster delete consumeriq-local`
