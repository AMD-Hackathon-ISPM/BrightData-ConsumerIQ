# Infra

## k3d
- Create cluster:
  - `k3d cluster create --config infra/k3d/k3d.yaml`
- Delete cluster:
  - `k3d cluster delete consumeriq-local`

## Kubernetes manifests
- PostgreSQL (pgvector):
  - `kubectl apply -k infra/k8s/postgres`
- Redis:
  - `kubectl apply -k infra/k8s/redis`
