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
   - `docker build -t consumeriq-go:local backend/go-service/`
   - `k3d image import consumeriq-go:local -c consumeriq-local`
7) Deploy backend (Python API + Celery worker + Go auth/forms service):
   - `kubectl apply -k infra/k8s/backend`
8) Build and load the frontend image:
   - `docker build -t consumeriq-frontend:local -f frontend/Dockerfile frontend`
   - `k3d image import consumeriq-frontend:local -c consumeriq-local`
9) Deploy frontend:
   - `kubectl apply -k infra/k8s/frontend`
10) Deploy nginx gateway (requires backend + frontend services to exist first):
    - `kubectl apply -k infra/k8s/nginx`
    - `kubectl rollout restart -n consumeriq deploy/consumeriq-nginx`

## Access
- Frontend: `http://localhost:30080`
- API (Python — AI/ML): `http://localhost:30080/api`
- Auth: `http://localhost:30080/auth`
- Forms (Go): `http://localhost:30080/go-api`

## Service responsibilities
| Service | Language | Handles |
|---|---|---|
| `consumeriq-api` | Python | GGUF inference, LlamaCPP, ReAct agent, embeddings |
| `consumeriq-worker` | Python | Celery background tasks (scraping, LLM jobs) |
| `consumeriq-go` | Go | Auth (register/login/logout), opaque session tokens, founder forms |
| `consumeriq-nginx` | NGINX | Reverse proxy, token validation via `auth_request` |

## Auth flow
1. `POST /auth/register` or `POST /auth/login` → returns an opaque session token
2. Pass the token as `Authorization: Bearer <token>` on all subsequent requests
3. NGINX validates the token against the Go service before proxying to Python — Python only ever sees `X-User-Id`, never raw tokens

## Troubleshooting
- If `postgres-0` is stuck in `ContainerCreating`, re-run:
   - `kubectl apply -k infra/k8s/postgres`
   - `kubectl get configmap -n consumeriq postgres-init`
- If nginx logs show `host not found in upstream`, re-run:
   - `kubectl apply -k infra/k8s/backend`
   - `kubectl apply -k infra/k8s/nginx`
   - `kubectl rollout restart -n consumeriq deploy/consumeriq-nginx`
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