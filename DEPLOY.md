# ConsumerIQ — VPS Deploy (k3s, ARM64, cloud-LLM-only)

End-to-end guide for deploying ConsumerIQ to a single-node Linux VPS running k3s, with all images built natively on the VPS itself. Targets a real domain with HTTPS, an in-VPS Docker registry, persistent Postgres, and 100% cloud-routed LLMs (no local Llama, no GPU required).

This is **not** the local-dev setup ([README.md](README.md)) — different cluster (k3s vs k3d), different arch (ARM64 native build on the VPS), different LLM routing (no Llama anywhere on the host).

> **Reference deploy target**: Oracle Cloud Free Tier — Ampere A1 Flex shape with 4 OCPUs / 24 GB RAM / 47 GB disk on Ubuntu 22.04. Free forever, ARM64 (`aarch64`, Neoverse-N1). Every number in this doc is calibrated to that spec.

---

## 1. What you actually need

### VPS specs

| Spec | Minimum | Recommended | Why |
|---|---|---|---|
| Arch | `aarch64` or `x86_64` | either | k3s and our stack run on both |
| RAM | 8 GB | **16–24 GB** | Postgres + Cognee graph + headroom for parallel forms |
| vCPU | 2 | **4** | Embeddings on CPU is the only spike-y workload |
| Disk | 30 GB | **40+ GB** | k3s ~3 GB, docker layer cache grows, postgres data |
| GPU | none | none | **All LLM calls go to the cloud, no local model serving** |

> **Why no GPU and no local Llama?** Llama 3.2 3B on CPU (especially ARM Neoverse-N1) runs at 6–12 tok/s. Layer 1 of the dashboard pipeline alone (~900 output tokens) would take 75–150s on this hardware, plus it'd peg 3 of your 4 cores while running and starve everything else. Cloud routing turns this into a ~5s I/O-bound HTTP call. The local-Llama-on-GPU story is for the dev box you demo from, not the production VPS.

### Cloud LLM accounts

| Service | Why | Cost at hackathon scale |
|---|---|---|
| **AI/ML API** | Dashboard generation (Layer 1 + Layer 2), Persona Decode, Cognee entity extraction | ~$1–3/mo |
| **Featherless AI** | Advisor chat (reasoning model) | ~$1–5/mo |
| **Bright Data** | Marketplace scraping (Amazon, Walmart, Tokopedia) | ~$5–15/mo |
| **ScrapingBee** *(optional)* | Twitter via SERP + Google SERP fallback | free tier or ~$5/mo |
| **MailerSend** *(optional)* | Dashboard-ready emails | free tier (3K emails/mo) |

### Domain + DNS

Any registrar; an A record pointing at your VPS public IP. Wait for propagation (`dig consumeriq.example.com +short` returns the IP) before starting TLS.

### Local tooling

Just `ssh` and (optionally) `scp` for copying files in. Everything else runs on the VPS.

---

## 2. VPS bootstrap

SSH in as a sudo user.

### Update + base tools

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates gnupg ufw
```

### Firewall

```bash
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # Let's Encrypt HTTP-01 challenge
sudo ufw allow 443/tcp       # HTTPS
sudo ufw --force enable
sudo ufw status
```

Do **not** open 6443 (k8s API), 5432 (Postgres), 6379 (Redis), 5001 (local registry) — keep them VPS-internal.

### Install Docker (for building images)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # apply group change without re-login
docker info     # smoke test
```

### Install k3s (with traefik disabled — we ship our own NGINX)

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik --write-kubeconfig-mode 644" sh -

# Verify
sudo systemctl status k3s --no-pager
sudo k3s kubectl get nodes
```

Make `kubectl` work without `sudo`:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc
source ~/.bashrc
kubectl get nodes
```

### Run a local Docker registry on the VPS

This is the same pattern as the k3d local-dev flow — registry on `localhost:5001`, k3s pulls from there. No external image hosting needed.

```bash
docker run -d --name local-registry --restart=always \
  -p 127.0.0.1:5001:5000 \
  -v /var/lib/local-registry:/var/lib/registry \
  registry:2
docker ps --filter name=local-registry
```

Bound to `127.0.0.1` only (no external exposure). Volume-backed so the layer cache survives restarts.

### Tell k3s to trust the local registry

```bash
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null <<'EOF'
mirrors:
  "localhost:5001":
    endpoint:
      - "http://localhost:5001"
EOF
sudo systemctl restart k3s
```

---

## 3. Clone repo + DNS

```bash
cd ~
git clone https://github.com/YOUR-ORG/consumeriq.git    # or scp your local working copy up
cd consumeriq
```

In a separate browser tab, set the DNS A record `consumeriq.example.com → <VPS public IP>`. Wait for propagation:

```bash
dig consumeriq.example.com +short
# Should print the VPS IP
```

---

## 4. Apply the cloud-routing patch (REQUIRED)

The default code path has Layer 0 (`_generateScrapingKeywords`) and Layer 1 (`_runLlmInsights`) calling local Llama at `consumeriq-inference:8080`. On this VPS there's no Llama container, so these calls would `Connection refused` and the dashboard pipeline would crash at the `analyzing` stage.

You need both call sites cloud-routed via `OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_API_KEY` before building images. If you haven't applied the patch yet, see [the project's `feat/cloud-only-mode` branch] / ask the maintainer for the diff. The patch:

1. Adds `_runCloudLayer0Keywords` + `_runCloudLayer1Insights` (~30 lines, mirrors the existing `_runCloudPersonaDecode` pattern)
2. Swaps the call sites
3. Adds `LLM_LOCAL_ENABLED=false` env support so the fallback to Llama doesn't fire (which on CPU would hang for minutes)

Verify the patch is in:

```bash
grep -n "_runCloudLayer1Insights\|LLM_LOCAL_ENABLED" backend/redis/worker.py
# Both should show matches. If they don't, apply the patch first.
```

---

## 5. Build images natively on the VPS

ARM64 builds happen here directly — no buildx, no cross-compilation, no qemu emulation. The resulting images are native `linux/arm64` and run at full speed.

```bash
cd ~/consumeriq

# Backend (Python / FastAPI / Celery)
docker build -t localhost:5001/consumeriq-backend:latest -f backend/Dockerfile .
docker push localhost:5001/consumeriq-backend:latest

# Go service + worker
cd backend/go-service && go mod tidy && cd ../..
docker build -t localhost:5001/consumeriq-go:latest backend/go-service/
docker push localhost:5001/consumeriq-go:latest

# Frontend (Vite SPA + nginx)
docker build -t localhost:5001/consumeriq-frontend:latest -f frontend/Dockerfile frontend/
docker push localhost:5001/consumeriq-frontend:latest

# Embeddings (fastembed on CPU — the one local-compute service we keep)
docker build -t localhost:5001/consumeriq-embeddings:latest -f inference/embeddings.Dockerfile .
docker push localhost:5001/consumeriq-embeddings:latest
```

> **Skip `consumeriq-inference` and `consumeriq-translator` entirely** — we don't deploy them. Local Llama isn't running on this box and translation is only needed for CJK-source signals (which we filter out via the marketplace allowlist anyway).

### Rewrite manifest image refs

The manifests reference `k3d-consumeriq-registry:5000/...:local`. Point them at the local VPS registry instead:

```bash
find infra/k8s -name '*.yaml' -exec sed -i \
  -e 's|k3d-consumeriq-registry:5000|localhost:5001|g' \
  -e 's|:local|:latest|g' \
  {} +
```

Verify:

```bash
grep -rh "image:" infra/k8s/ | sort -u
# Every line should now be: image: localhost:5001/consumeriq-*:latest
```

---

## 6. Strip the inference manifests

We're not deploying the Llama + translator pods. Edit `infra/k8s/inference/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - embeddings-deployment.yaml
  - embeddings-service.yaml
  # inference-service.yaml — removed (no Llama)
  # translator-service.yaml — removed (no translator)
```

This way `kubectl apply -k infra/k8s/inference` only deploys the CPU-side embeddings server — no orphan `consumeriq-inference` Service waiting for an Endpoint that'll never exist.

---

## 7. Configure `.env`

Create `infra/k8s/backend/.env` on the VPS:

```env
# Database (in-cluster postgres)
DATABASE_URL=postgresql://consumeriq:consumeriq@postgres.consumeriq.svc.cluster.local:5432/consumeriq
REDIS_URL=redis://redis.consumeriq.svc.cluster.local:6379/0

# Public URL (used in dashboard-ready emails + admin endpoints)
APP_PUBLIC_URL=https://consumeriq.example.com

# Cloud LLM provider 1 — workhorse (Layer 0, Layer 1, Layer 2, Persona, Cognee)
OPENAI_BASE_URL=https://api.aimlapi.com/v1
OPENAI_MODEL=deepseek/deepseek-chat-v3.1
OPENAI_API_KEY=<aimlapi-key>

# Cloud LLM provider 2 — chat-only reasoning model
CHAT_BASE_URL=https://api.featherless.ai/v1
CHAT_MODEL=Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled
CHAT_API_KEY=<featherless-key>

# Disable the local-Llama fallback paths (we have no Llama)
LLM_LOCAL_ENABLED=false

# Bright Data
BRIGHTDATA_API_TOKEN=<brightdata-token>

# ScrapingBee (Twitter SERP + Google fallback) — optional
SCRAPINGBEE_API_KEY=<scrapingbee-key>

# Pipeline tuning
PIPELINE_ENABLED_MARKETPLACES=amazon,tokopedia,walmart
PIPELINE_SKIP_MARKETPLACES=google,google.shopping,lazada,tiktok,tiktok_shop,etsy
PIPELINE_SOCIAL_ENABLED=false
PIPELINE_TWITTER_ENABLED=true
PIPELINE_TWITTER_RESULTS_PER_KEYWORD=2
PIPELINE_TOTAL_BUDGET_SECONDS=600
PIPELINE_MAX_MARKETPLACES_PER_KEYWORD=2

# Cron flags — flip to true once you want them firing
DAILY_REFRESH_ENABLED=false
COMPLIANCE_SCRAPE_ENABLED=false
SIGNAL_TTL_ENABLED=false
SIGNAL_TTL_MONTHS=4

# Recency-rank weight (see ForHackathon.md §6)
SIGNAL_RECENCY_WEIGHT=0.005

# Backpressure on the 4-vCPU box — keep enabled in prod
BACKPRESSURE_ENABLED=true
INFERENCE_CONCURRENCY=2
INFERENCE_QUEUE_LIMIT=20

# Admin token (cron auth + /api/admin/* gating)
ADMIN_API_TOKEN=<run on VPS: openssl rand -hex 32>

# Email (optional but recommended)
MAILERSEND_API_KEY=<mailersend-key>
MAILERSEND_FROM_EMAIL=hello@consumeriq.example.com
MAILERSEND_FROM_NAME=ConsumerIQ

# Cognee — optional persistent graph memory
COGNEE_ENABLED=false

# Go service
JWT_SECRET=<run on VPS: openssl rand -hex 32>
```

Generate the two secret tokens directly on the VPS:

```bash
echo "ADMIN_API_TOKEN=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

Paste those values into the corresponding `.env` lines.

---

## 8. Create the namespace + push the Secret

```bash
kubectl create namespace consumeriq

kubectl create secret generic consumeriq-api-keys -n consumeriq \
  --from-env-file=infra/k8s/backend/.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

All deployments and cron pods read from this single Secret via `secretKeyRef ... optional: true`. Whenever you edit `.env`, re-run the create-secret command above and then `kubectl rollout restart` for the affected pods (env vars don't hot-reload from Secrets).

---

## 9. Deploy core data services

```bash
kubectl apply -k infra/k8s/postgres
kubectl apply -k infra/k8s/redis

# Wait until postgres is up
kubectl wait --for=condition=ready pod -l app=postgres -n consumeriq --timeout=120s
```

Confirm Postgres has a persistent volume:

```bash
kubectl get pvc -n consumeriq
# Should show postgres-data with status Bound, ~10Gi
```

If the postgres StatefulSet uses `emptyDir` instead of a PVC, edit `infra/k8s/postgres/statefulset.yaml` to add `volumeClaimTemplates` (see comment in [DEPLOY.md §4 of previous revision] or use `local-path` StorageClass that ships with k3s).

---

## 10. Deploy the rest

```bash
kubectl apply -k infra/k8s/inference   # embeddings only (we trimmed the kustomization in §6)
kubectl apply -k infra/k8s/backend
kubectl apply -k infra/k8s/frontend
kubectl apply -k infra/k8s/nginx

# Watch everything come up
kubectl get pods -n consumeriq -w
```

Expected steady state — every pod `Running 1/1`:

```
consumeriq-api-...                  1/1   Running
consumeriq-embeddings-...           1/1   Running
consumeriq-frontend-...             1/1   Running
consumeriq-go-...                   1/1   Running
consumeriq-go-worker-...            1/1   Running
consumeriq-nginx-...                1/1   Running
consumeriq-worker-inference-...     1/1   Running
consumeriq-worker-scraping-...      1/1   Running
postgres-0                          1/1   Running
redis-...                           1/1   Running
```

If anything sits in `ImagePullBackOff`, you didn't push that image to `localhost:5001` (re-run the build/push for that one).

---

## 11. Ingress + TLS

Install ingress-nginx (cleanest path since we disabled k3s's traefik):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=120s
```

Install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
kubectl wait --for=condition=available deployment --all -n cert-manager --timeout=180s
```

Create the issuer + ingress in one file:

```bash
cat <<'EOF' | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: you@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: consumeriq
  namespace: consumeriq
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts: [consumeriq.example.com]
      secretName: consumeriq-tls
  rules:
    - host: consumeriq.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: consumeriq-nginx
                port:
                  number: 80
EOF
```

Watch the cert get issued:

```bash
kubectl get certificate -n consumeriq -w
# Status should go from False → True within 1–3 minutes
```

After `True`, `https://consumeriq.example.com` is live with a Let's Encrypt cert.

---

## 12. Database migration check

```bash
kubectl exec -n consumeriq postgres-0 -- psql -U consumeriq -d consumeriq -c "\dt"
```

You should see: `users`, `founderforms`, `marketsignals`, `categoryinsights`, `competitors`, `products`. The `chathistory` table self-creates on first call to `/api/chat/history`.

If no tables exist at all, apply the DDL manually:

```bash
kubectl cp infra/k8s/postgres/migration/ddl.sql consumeriq/postgres-0:/tmp/ddl.sql
kubectl exec -n consumeriq postgres-0 -- psql -U consumeriq -d consumeriq -f /tmp/ddl.sql
```

---

## 13. Smoke tests

```bash
# 1. Public HTTPS works
curl -sf https://consumeriq.example.com/ -o /dev/null -w '%{http_code}\n'
# Expect 200

# 2. Submit a form via the UI (open the SPA in a browser, fill the founder form)
#    Tail the scraping worker:
kubectl logs -n consumeriq deploy/consumeriq-worker-scraping -f --tail=50
#    Expect:
#      [scraping] Active marketplaces for category=...: ['amazon', 'walmart']
#      [scraping] Marketplace discovery status=success ...
#      [scraping] Done. Stored N signals
#      [scraping] Dispatched processLlmInsights task_id=...

# 3. Watch the inference worker:
kubectl logs -n consumeriq deploy/consumeriq-worker-inference -f --tail=50
#    Expect:
#      Worker picked up job for category: ...
#      [stage] analyzing → cross_referencing → synthesizing → completed
#      Job complete for ...! Saved to Postgres.

# 4. Ask the chat something
#    Expect in worker logs:
#      [agent] Cloud chat → model=Jackrong/Qwen3.5-27B-...
#      [agent] Cloud chat reasoning captured: N chars, X.Xs
#      [agent] Served by cloud LLM.

# 5. Check chat history is persisting
kubectl exec -n consumeriq postgres-0 -- psql -U consumeriq -d consumeriq -c \
  "SELECT user_id, jsonb_array_length(messages) FROM chathistory;"
```

---

## 14. Operations cheat sheet

### Update an image after code changes

```bash
cd ~/consumeriq
git pull
docker build -t localhost:5001/consumeriq-backend:latest -f backend/Dockerfile .
docker push localhost:5001/consumeriq-backend:latest
kubectl rollout restart -n consumeriq \
  deploy/consumeriq-api \
  deploy/consumeriq-worker-inference \
  deploy/consumeriq-worker-scraping
```

Manifests pin `:latest` with `imagePullPolicy: Always`, so rollout restart forces a fresh pull.

### Rotate a Secret (new API key, etc.)

```bash
nano infra/k8s/backend/.env   # edit
kubectl create secret generic consumeriq-api-keys -n consumeriq \
  --from-env-file=infra/k8s/backend/.env \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart anything that reads it
kubectl rollout restart -n consumeriq \
  deploy/consumeriq-api \
  deploy/consumeriq-worker-inference \
  deploy/consumeriq-worker-scraping
```

### Postgres backup (daily cron)

```bash
sudo mkdir -p /var/backups/consumeriq
sudo crontab -e
# Add:
30 4 * * * kubectl exec -n consumeriq postgres-0 -- pg_dump -U consumeriq consumeriq | gzip > /var/backups/consumeriq/db-$(date +\%F).sql.gz && find /var/backups/consumeriq -mtime +14 -delete
```

### Watch a worker live

```bash
kubectl logs -n consumeriq -l app=consumeriq-worker-inference -f --tail=100
```

### Scale down overnight to save cloud LLM cost

```bash
# Pause workers (keep API + frontend serving for static demo browsing)
kubectl scale deploy -n consumeriq \
  consumeriq-worker-inference \
  consumeriq-worker-scraping --replicas=0

# Resume
kubectl scale deploy -n consumeriq \
  consumeriq-worker-inference \
  consumeriq-worker-scraping --replicas=1
```

### Full restart of the host

k3s + Docker + the registry auto-start on boot (systemd units). After `sudo reboot`, give it ~30s and everything comes back. No manual intervention.

---

## 15. Hardening checklist before going public

- [ ] `JWT_SECRET` in `.env` is from `openssl rand -hex 32` (not the example default)
- [ ] `ADMIN_API_TOKEN` in `.env` is from `openssl rand -hex 32` (not the example default)
- [ ] `BACKPRESSURE_ENABLED=true` so a flood of chat requests can't kill the API
- [ ] Postgres password in `DATABASE_URL` is **not** the `consumeriq:consumeriq` default — set a real one + update the postgres StatefulSet env to match
- [ ] cert-manager certificate is `READY=True` (`kubectl get cert -n consumeriq`)
- [ ] `sudo ufw status` shows only 22 / 80 / 443 open
- [ ] Postgres backup cron is in place and you've test-restored from one of the dumps once
- [ ] `LLM_LOCAL_ENABLED=false` confirmed in the running pod (`kubectl exec ... env | grep LLM_LOCAL`)
- [ ] Cron flags (`DAILY_REFRESH_ENABLED` etc.) are intentionally `true` or `false` — left `false` means no auto-refresh loop, intended for dev demo

---

## 16. Cost — Oracle Cloud Free Tier scenario

| Item | Monthly cost |
|---|---|
| VPS (Oracle Cloud Free Tier Ampere A1, 4 vCPU / 24 GB) | **$0** — free forever |
| Domain | ~$1 (annualized) |
| AI/ML API — DeepSeek for Layer 0/1/2 + Persona + Cognee | $1–3 |
| Featherless — Qwen 27B for chat | $1–5 |
| Bright Data (~50 signals/form × 50 forms) | $5–15 |
| MailerSend (free tier ≤3K emails) | $0 |
| **Total** | **~$10–25/mo** |

The VPS itself is free — the only meaningful cost is the cloud LLM + scraping providers. Scale down workers when you're not demoing to cut LLM cost further.

---

## 17. Troubleshooting

### `ImagePullBackOff` on every pod
You didn't push an image to `localhost:5001`, OR the k3s registry mirror config didn't take. Check:
```bash
kubectl describe pod -n consumeriq <pod> | grep -A 5 "Failed to pull"
curl http://localhost:5001/v2/_catalog   # list pushed repos
cat /etc/rancher/k3s/registries.yaml     # verify mirror config exists
sudo systemctl restart k3s               # re-apply mirror config if missing
```

### TLS cert never issues
Most common: DNS hasn't propagated yet, or port 80 is blocked. cert-manager polls every 60s, give it 5 minutes after DNS works. Check:
```bash
kubectl describe certificate -n consumeriq consumeriq-tls
kubectl logs -n cert-manager -l app=cert-manager -f
sudo ufw status | grep 80   # must be ALLOW
```

### Pipeline stuck at `analyzing` or `cross_referencing`
The cloud-routing patch isn't applied — Layer 1 still calls local Llama. Confirm:
```bash
kubectl logs -n consumeriq deploy/consumeriq-worker-inference --tail=200 | grep -i "connection refused\|llama\|inference"
```
If you see "Connection refused" to `consumeriq-inference:8080`, apply the patch (§4) and rebuild + redeploy the backend image.

### Pipeline stuck at `cross_referencing`/`synthesizing` indefinitely
Cloud LLM is failing. Tail the worker:
```bash
kubectl logs -n consumeriq deploy/consumeriq-worker-inference --tail=200 | grep -iE "openai|dashboard|401|429|timeout"
```
Almost always: `OPENAI_API_KEY` doesn't match `OPENAI_BASE_URL` (AI/ML key against `api.openai.com` → 401), or `OPENAI_MODEL` invalid for the chosen endpoint.

### Chat shows "Unable to fetch insights"
Reasoning model took >240s. Tail the worker for the actual duration. If consistently >100s, the model may be queued at Featherless — try a smaller model variant. If <100s but still timing out, the FE pod can't reach the API — check ingress-nginx logs.

### Out of memory under load
Check baseline usage:
```bash
free -h
kubectl top pods -n consumeriq   # needs metrics-server, optional
```
With 24 GB this shouldn't happen. If it does, the most likely culprit is Postgres `shared_buffers` set too aggressively, or Cognee graph growing huge with `COGNEE_ENABLED=true`.

### "no space left on device"
Docker layer cache + postgres data growth. Clean up:
```bash
docker system prune -af --volumes
sudo du -sh /var/lib/rancher/k3s/storage/*
```

---

## 18. What's not in scope

- **HA** — single-node k3s is a single point of failure. For HA: k3s server mode with 3 control-plane nodes + external etcd or PostgreSQL backend.
- **Postgres replication** — `local-path` PVC fine until you outgrow one disk. Then RDS / Cloud SQL.
- **Monitoring** — no Prometheus / Grafana / alerting. Add via `helm install prometheus-community/kube-prometheus-stack` if you want.
- **CI/CD** — these steps assume manual `git pull && docker build && rollout restart`. For automation: GitHub Actions → push to a public registry → ArgoCD / Flux watching the manifests.
- **Log aggregation** — pod logs stay on the node. For longer retention, ship to Loki / BetterStack / Grafana Cloud.
- **Hybrid GPU mode** — running local Llama on a GPU VPS (Lambda, RunPod, Hetzner GEX) — see [README.md §Local Setup](README.md) for the k3d-equivalent pattern; the same Endpoints-on-Docker-network trick works on k3s with `--gpus all` Docker containers attached to the host bridge.

None of these block a demo or a limited-production single-tenant deployment.
