# BrightData-ConsumerIQ

## Local k3d setup
1) Install Docker Desktop and ensure it is running.
2) Install k3d (`choco install k3d`) and kubectl (`choco install kubernetes-cli`).
3) Create the cluster:
   - `k3d cluster create --config infra/k3d/k3d.yaml`
   - `k3d kubeconfig merge consumeriq-local --kubeconfig-switch-context`
4) Deploy core services:
   - `kubectl apply -k infra/k8s/postgres`
   - `kubectl apply -k infra/k8s/redis`
5) Build and load the backend image:
   - `docker build -t consumeriq-backend:local -f backend/Dockerfile .`
   - `k3d image import consumeriq-backend:local -c consumeriq-local`
6) Deploy backend API + worker:
   - `kubectl apply -k infra/k8s/backend`
7) Build and load the frontend image:
   - `docker build -t consumeriq-frontend:local -f frontend/Dockerfile frontend`
   - `k3d image import consumeriq-frontend:local -c consumeriq-local`
8) Deploy frontend:
   - `kubectl apply -k infra/k8s/frontend`
9) Deploy nginx gateway:
   - `kubectl apply -k infra/k8s/nginx`

## Access
- Frontend: `http://localhost:30080`
- API: `http://localhost:30080/api`

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