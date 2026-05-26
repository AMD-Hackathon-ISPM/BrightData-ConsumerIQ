# BrightData-ConsumerIQ

## Bright Data marketplace and social integration

Integrasi scraping marketplace dan social media sekarang lewat Bright Data Web Scraper API, bukan ScrapingBee. ScrapingBee masih bisa ada untuk jalur Google SERP lama, tetapi endpoint marketplace/social di backend sudah diarahkan ke Bright Data.

### 1. Schema layer

Schema response ada di `backend/brightdata/schemas.py`.

File ini berfungsi sebagai kontrak data untuk hasil Bright Data sebelum dikirim ke worker, agent, atau frontend. Registry schema bisa dicek dari:

```
GET /api/brightdata/schemas
```

Schema yang sudah masuk:

- Marketplace: Tokopedia, Alibaba, Sephora, Lazada, Amazon, Walmart.
- Social media: Instagram profiles/posts/reels/comments, TikTok profiles/posts/comments/search/TikTok Shop, X profiles/posts.
- Error payload: `brightdata.error`, dipakai saat Bright Data mengembalikan record error dengan `include_errors=true`.

Validasi schema dilakukan best-effort. Kalau Bright Data mengembalikan `snapshot_id`, response belum berupa list record final, sehingga status validasinya akan ditandai pending sampai snapshot di-download.

### 2. Endpoint registry

Registry endpoint ada di `backend/brightdata/endpoints.py`.

Setiap item registry menjelaskan cara backend memanggil dataset Bright Data:

- `key`: nama endpoint internal, misalnya `tiktok.posts.discover_keyword`.
- `datasetKey`: schema yang dipakai untuk validasi, misalnya `tiktok.posts`.
- `datasetId`: Bright Data dataset id default.
- `type` dan `discoverBy`: query parameter Bright Data untuk discovery endpoint.
- `requiredFields`: field yang wajib ada di tiap input.
- `optionalFields` dan `defaultInput`: field opsional dan default payload.

Daftar endpoint yang aktif bisa dicek dari:

```
GET /api/brightdata/endpoints
```

Endpoint penting yang sudah terdaftar:

- Tokopedia products: collect URL, discover keyword, discover seller URL, discover category/store URL.
- Amazon products: collect URL, best sellers URL, category URL, keyword, UPC, reviews, seller info, global product dataset, product search dataset.
- Walmart products: collect URL, keyword, category URL, SKU, search URL, zipcode-aware product, seller info.
- Lazada products/reviews, Alibaba products, Sephora products.
- Instagram profiles/posts/reels/comments.
- TikTok profiles/posts/comments/search/profile posts/discover pages/TikTok Shop products.
- X profiles/posts/profile timeline discovery.

### 3. Bright Data API routes

FastAPI router ada di `backend/api/brightdataScrape.py`, dengan prefix `/api/brightdata`.

Endpoint langsung:

```
GET  /api/brightdata/endpoints
GET  /api/brightdata/schemas
POST /api/brightdata/scrape
POST /api/brightdata/scrape/{endpoint_key}
GET  /api/brightdata/snapshots/{snapshot_id}/progress
POST /api/brightdata/snapshots/{snapshot_id}/download
```

Contoh request yang benar dari Swagger untuk TikTok keyword discovery:

```json
{
  "endpoint": "tiktok.posts.discover_keyword",
  "input": [
    {
      "search_keyword": "#reviewskincare",
      "country": "ID"
    }
  ],
  "notify": false,
  "include_errors": true,
  "timeout_seconds": 120
}
```

Atau pakai path endpoint:

```
POST /api/brightdata/scrape/tiktok.posts.discover_keyword
```

Dengan body:

```json
{
  "input": [
    {
      "search_keyword": "#reviewskincare",
      "country": "ID"
    }
  ],
  "notify": false,
  "include_errors": true,
  "timeout_seconds": 120
}
```

Jangan isi field Swagger placeholder seperti `"endpoint": "string"`, `"dataset_id": "string"`, `"type": "string"`, atau `"discover_by": "string"`. Kalau memakai endpoint registry, backend otomatis mengisi `dataset_id`, `type`, dan `discover_by`.

### 4. Snapshot flow

Beberapa dataset Bright Data tidak langsung mengembalikan record final. Kalau response berisi `snapshotId`, berarti job masih diproses oleh Bright Data.

Langkahnya:

```
GET /api/brightdata/snapshots/{snapshot_id}/progress
```

Kalau status Bright Data sudah ready, download hasilnya:

```
POST /api/brightdata/snapshots/{snapshot_id}/download
```

Body download:

```json
{
  "dataset_key": "tiktok.posts",
  "format": "json",
  "timeout_seconds": 120
}
```

`dataset_key` dipakai supaya hasil download snapshot tetap divalidasi ke schema yang benar.

### 5. Legacy marketplace/social routes

Route lama tetap ada agar worker, agent, dan frontend tidak perlu langsung berubah:

```
POST /api/marketplace-scrape
POST /api/marketplace-batch-scrape
POST /api/marketplace-discovery
POST /api/social-scrape
POST /api/social-discovery
```

Bedanya, implementasi route tersebut sekarang memanggil Bright Data client (`backend/brightdata/client.py`) dan endpoint registry, bukan scraping marketplace/social via ScrapingBee.

### 6. Environment

Untuk local dev, isi token di:

```
backend/.env
```

Minimal:

```
BRIGHTDATA_API_TOKEN=your_brightdata_token
```

Backend juga masih mengenali alias `BRIGHT_DATA_API_TOKEN` dan `BRIGHTDATA_TOKEN`, tetapi nama utama yang dipakai project ini adalah `BRIGHTDATA_API_TOKEN`.

Saat menjalankan local API:

```
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Buka Swagger:

```
http://127.0.0.1:8000/docs
```

`GET /` memang bisa `404 Not Found`; itu normal karena API root page belum dibuat. Pakai `/docs`, `/api/brightdata/endpoints`, atau route API lain.

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
# fill in BRIGHTDATA_API_TOKEN in infra/k8s/backend/.env
# optional: keep SCRAPINGBEE_API_KEY if Google SERP fallback is still used
kubectl create secret generic consumeriq-api-keys -n consumeriq --from-env-file=infra/k8s/backend/.env --dry-run=client -o yaml | kubectl apply -f -
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
| `consumeriq-worker-scraping` | Python / Celery | `scraping` queue — Bright Data marketplace/social collection (concurrency 4) |
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

**Direct Bright Data endpoints (synchronous API wrapper):**
```
GET  /api/brightdata/endpoints
GET  /api/brightdata/schemas
POST /api/brightdata/scrape
POST /api/brightdata/scrape/{endpoint_key}
GET  /api/brightdata/snapshots/{snapshot_id}/progress
POST /api/brightdata/snapshots/{snapshot_id}/download
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

- Updates
  - `kubectl apply -f /d/Hackathons/ConsumerIQ/infra/k8s/{part}/{service}-deployment.yaml`
  - `kubectl rollout restart -n consumeriq deploy/consumeriq-{serviceName}`

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
