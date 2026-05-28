# ConsumerIQ — Technical Deep Dive

A market intelligence platform that turns a founder's product brief into a real-time, data-grounded GTM dashboard in 60–90 seconds.

This document covers every non-obvious engineering decision behind the system: the multi-layer LLM pipeline, the polyglot service split, the GPU workaround for WSL2, the pgvector-with-recency-weighting query, and the daily-cron architecture.

---

## 1. The Problem

Founders launching a product (especially in e-commerce categories like beauty, food & beverage, electronics) currently have to:

- Scrape Amazon / Temu / Walmart manually to size competitors
- Read review forums and social posts to find pain points
- Track FDA / FCC / CPSC for compliance hazards
- Cross-reference all of this into a coherent GTM plan

We compress this into a single onboarding form. The user types in their product, USP, target market, and price range. 60–90 seconds later they get a four-section dashboard backed by live scraped data and a GPT-generated synthesis.

---

## 2. System Overview

```
┌────────────┐   form    ┌────────────┐  enqueue   ┌──────────────┐
│  React UI  │──────────▶│  Go API    │───────────▶│ Redis (asynq │
└────────────┘           └────────────┘            │  + Celery)   │
       ▲                                           └──────┬───────┘
       │ /api/insights/me                                 │
       │ /api/form-pipeline/:id                           ▼
       │                  ┌──────────────────────────────────────┐
       │                  │  Python Workers                      │
       │                  │  ─ scraping queue (BrightData calls) │
       │                  │  ─ synthesis queue (local LLM + GPT) │
       │                  │  ─ inference queue (agent / persona) │
       │                  └──────┬───────────────────────────────┘
       │                         │
       │                         ▼
       │             ┌──────────────────────────────┐
       │             │  GPU containers (outside k3d)│
       │             │  ─ Llama 3.2 3B (inference)  │
       │             │  ─ Translator (NLLB)         │
       │             │  ─ Embeddings (BGE)          │
       │             └──────────────────────────────┘
       │                         │
       │                         ▼
       │             ┌──────────────────────────────┐
       └─────────────│ Postgres + pgvector          │
                     │  ─ users, founderForms       │
                     │  ─ marketSignals (embedded)  │
                     │  ─ categoryInsights (jsonb)  │
                     └──────────────────────────────┘
```

Every box runs as its own Kubernetes deployment in the `consumeriq` namespace. The three GPU containers are the one exception — they run on the k3d Docker network but outside k8s itself. See §8.

---

## 3. The Three-Layer LLM Pipeline

This is the core technical contribution. Most "AI dashboards" do a single LLM call. We do three, each at a different layer of abstraction:

```
User form  ──▶  [Layer 0]  ──▶  BrightData  ──▶  [Layer 1]  ──▶  [Layer 2]  ──▶  Dashboard JSON
                LLM keyword                       Local LLM           GPT-4
                generation                        omni-prompt         omni-prompt
```

### Layer 0 — Keyword Generation (local Llama 3.2 3B)

Instead of searching marketplaces for the literal product name, we ask the local LLM to read the *full product brief* (description, USP, features, pain point, customer segment, competitive advantage) and emit 6 targeted search queries.

Example for a barrier-repair moisturizer:
- Input: name, "ceramide moisturizer", USP "clinically clear barrier repair", pain point "redness and irritation"
- Output: `["ceramide moisturizer barrier repair", "redness sensitive skin moisturizer", "barrier repair cream best", "ceramide cream irritation", "moisturizer sensitive skin clinically tested", "CeraVe alternative"]`

This is what makes the downstream scrape return relevant competitors instead of off-brand junk.

Implementation: [`_generateScrapingKeywords` in `backend/redis/worker.py`](backend/redis/worker.py).

### Scraping — BrightData

For each keyword we hit two BrightData discovery endpoints:
- `runMarketplaceDiscovery(amazon | walmart | etsy | tokopedia | …)`
- `runSocialDiscovery` (TikTok / Reddit / Instagram via SERP)

A category-to-marketplace map (`CATEGORY_MARKETPLACES` in worker.py) picks the right marketplaces — `food` hits Amazon + Walmart, `handmade` hits Etsy + Amazon, etc.

Each scraped record is embedded via BGE and inserted into `marketSignals` with the source type, URL, and country. Up to 50 signals are stored per run (`PIPELINE_MAX_SIGNALS=50`).

### Layer 1 — Local Llama omni-prompt

The local Llama gets the scraped signals and produces a JSON object with four keys:

```jsonc
{
  "gtmIntelligence":    { /* market entry recommendations */ },
  "financeIntelligence": { /* pricing, margin, CAC signals */ },
  "securityCompliance":  { /* regulatory and safety risks */ },
  "extractedData": {
    "competitors":  [ {name, price, rating, reviews, sales} ],
    "priceRange":   { min, max, avg },
    "topProducts":  [ "..." ],
    "geographicSignals": [ "..." ]
  }
}
```

`extractedData` is what makes Layer 2 grounded — it forces the local model to *pull out actual brand names and prices from the signals*, not just summarize.

Implementation: [`_buildPrompt` + `_runLlmInsights` in `backend/redis/worker.py`](backend/redis/worker.py).

### Layer 2 — GPT omni-prompt

GPT receives:
- The full product brief (as a signal with `sourceType='product_brief'`)
- The Layer 1 output (GTM, finance, extractedData)
- The raw signals, grouped by source (`[amazon]`, `[walmart]`, `[social]`)
- A 4-section schema for the dashboard

It produces the final dashboard JSON: `marketOverview`, `demandPulse`, `competitorMirror`, `launchCompass`. System message explicitly forbids inventing brand names — every competitor in the output must trace back to a signal.

Implementation: [`_generate_dashboard_data` in `backend/models/openai_cross_reference.py`](backend/models/openai_cross_reference.py).

Tokens / latency: ~6000 max output tokens, ~30–60s wall time, ~$0.05 per run.

---

## 4. Strict Pipeline Lock

A naive implementation would let the user click through to the dashboard as soon as the form submits, and show mock data while real data loads in the background. We do the opposite.

The Redis pipeline key `form_pipeline:{form_id}` tracks five granular stages:

| Stage              | Meaning                                       |
|--------------------|-----------------------------------------------|
| `pending`          | Scrape task queued, not started               |
| `analyzing`        | Local LLM running on signals                  |
| `cross_referencing`| GPT generating dashboard data                 |
| `completed`        | dashboardData verified non-empty in Postgres  |
| `failed`           | Pipeline broke before reaching `completed`    |

The assembling-page UI ([`generating-step.tsx`](frontend/src/features/onboarding/founder-form/generating-step.tsx)) polls `/api/form-pipeline/:id` every 3s and only enables "Open dashboard" when `stage === 'completed'`. No timeout escape, no error fallback. If the pipeline genuinely fails, the user sees a "refresh and resubmit" message instead of a fake dashboard.

The dashboard sections also strip all fallback mock data — they show "Generating … data…" placeholders if `dashboardData` happens to be missing. In practice this never fires because the lock above prevents navigation until data is real.

---

## 5. pgvector with Recency Weighting

Naive vector search is `ORDER BY embedding <-> query`. The problem: in a daily-refresh world, 4-month-old signals from a different market cycle will outrank fresh ones if their text happens to be more semantically similar.

Our query:

```sql
SELECT signalText, sourceType, sourceUrl, sentimentScore
FROM marketSignals
WHERE embedding IS NOT NULL AND (country = %s OR country IS NULL)
ORDER BY (embedding <-> %s::vector)
       + COALESCE(CURRENT_DATE - signalDate, 0) * 0.005
LIMIT 50
```

Penalty examples at `SIGNAL_RECENCY_WEIGHT=0.005`:
- 7 days old: +0.035 (negligible)
- 30 days old: +0.15
- 90 days old: +0.45
- 120 days old: +0.6 (effectively excluded)

The weight is env-tunable. Combined with the TTL prune (see §9), this guarantees the LLMs only ever see signals from the current market.

Implementation: [`_fetchRelevantSignals` in `backend/redis/worker.py`](backend/redis/worker.py).

---

## 6. Polyglot Service Split

Why two backend languages?

| Concern                        | Language | Reason                                    |
|--------------------------------|----------|-------------------------------------------|
| Auth, sessions, form ingestion | Go       | Sub-ms latency, bcrypt, type safety       |
| Form-received fan-out          | Go       | asynq is Go-native, plays well with auth  |
| LLM inference, scraping, ML    | Python   | The ecosystem (Celery, llama-cpp, BGE)    |
| GPU model serving              | Python   | PyTorch / transformers                    |
| UI                             | TS+React | Component reuse, type-safe API contracts  |

The Go service handles the high-frequency, low-CPU path. The Python workers handle the slow, heavy path. They communicate exclusively through Redis (asynq → Celery via different queue names) and Postgres (jsonb columns).

This split also makes the queue priority system work:
- `inference` queue: LLM completions (highest priority, RAM-bound)
- `synthesis` queue: full insight generation
- `scraping` queue: BrightData / SERP I/O (lowest priority, network-bound)

---

## 7. Database Schema

Four tables, all in Postgres with the `vector` extension installed.

```sql
users (id, email, password_hash, created_at)

founderForms (
  id text PRIMARY KEY,            -- gen_random_uuid()
  user_id bigint REFERENCES users,
  status text,                    -- 'received' → 'processing' → 'completed'
  payload jsonb,                  -- full form state
  createdAt timestamptz
)

marketSignals (
  id bigserial PRIMARY KEY,
  signalText text,
  sourceType text,                -- 'amazon' | 'walmart' | 'social' | 'compliance' | 'product_brief'
  sourceUrl text,
  signalDate date,
  country text,
  category text,
  sentimentScore real,
  embedding vector(1024)          -- BGE-large-en
)

categoryInsights (
  category text,
  country text,
  status text,
  gtmIntelligence jsonb,
  financeIntelligence jsonb,
  securityCompliance jsonb,
  extraAnalysis jsonb,            -- contains .dashboardData
  lastUpdated timestamptz,
  PRIMARY KEY (category, country)
)
```

Design decisions:
- **`founderForms.payload` as jsonb** — schema evolution doesn't require migrations during a hackathon
- **`marketSignals.embedding` indexed via IVFFlat** — sub-100ms vector search even at 100K rows
- **`categoryInsights` keyed by (category, country) not (user_id)** — multiple users in the same market share insights, cuts cost by ~80%

---

## 8. The GPU-in-k3d Workaround

This was the single trickiest infra problem.

**The bug:** NVIDIA's Kubernetes device plugin advertises GPUs to k8s by scanning `/dev/nvidia*`. Docker Desktop on WSL2 doesn't expose those device nodes — instead, GPU access goes through `/dev/dxg` (DirectX paravirtualization). The device plugin sees zero GPUs, so any pod requesting `nvidia.com/gpu` stays `Pending` forever with `Insufficient nvidia.com/gpu`.

**The fix:** Run the three GPU containers (inference, translator, embeddings) as plain Docker containers on the same Docker network as the k3d cluster (`k3d-consumeriq-local`), then wire them into k8s with selector-less Services + manual `Endpoints`.

The startup script [`scripts/start-gpu-inference.ps1`](scripts/start-gpu-inference.ps1):
1. `docker run --gpus all --network k3d-consumeriq-local <image>`
2. `docker inspect | ConvertFrom-Json` to grab the container's IP on that network
3. `kubectl apply` an Endpoints YAML pointing the Service at that IP

From inside k8s, `http://consumeriq-inference.consumeriq.svc.cluster.local:8080` resolves through this selector-less Service and lands on the Docker container as if it were a pod. The Python workers never know the difference.

Cost: 1 PowerShell script. Benefit: GPU actually works on Windows dev machines.

---

## 9. Daily Automation

Three Kubernetes `CronJob` resources keep the dataset fresh, relevant, and lean:

| Cron                          | UTC   | Job                                                        |
|-------------------------------|-------|------------------------------------------------------------|
| `consumeriq-prune-signals`    | 01:00 | DELETE rows older than `SIGNAL_TTL_MONTHS` (4 by default)  |
| `consumeriq-daily-refresh`    | 02:00 | Re-run `scrapeMarketSignals` for every active user         |
| `consumeriq-compliance-scrape`| 03:00 | LLM-generate compliance keywords per user, scrape via SERP |

Order matters: prune first (drop stale data), then refresh (add fresh data on a clean DB), then compliance (extra hazard context on top).

All three CronJobs are just `curl` containers hitting admin endpoints on the FastAPI service. Each endpoint short-circuits with `{"status": "skipped"}` unless its env flag is `true`:

- `DAILY_REFRESH_ENABLED`
- `COMPLIANCE_SCRAPE_ENABLED`
- `SIGNAL_TTL_ENABLED`

All three default to `false` so a dev cluster doesn't accidentally burn BrightData / OpenAI credits. Flip them in production:

```bash
kubectl create secret generic consumeriq-admin -n consumeriq \
  --from-literal=ADMIN_API_TOKEN="$(openssl rand -hex 32)"

# Edit api-deployment.yaml and worker-scraping-deployment.yaml:
#   DAILY_REFRESH_ENABLED=true
#   COMPLIANCE_SCRAPE_ENABLED=true
#   SIGNAL_TTL_ENABLED=true

kubectl apply -k infra/k8s/backend/
```

### Compliance keyword generation

This is its own small LLM call. For each user with a founder form, we ask the local Llama:

> *For a business in the "{category}" category operating in {country}, generate 5 search keywords to monitor news, regulatory updates, safety recalls, or hazard alerts.*

With few-shot examples baked into the prompt — food → FDA recalls, electronics → FCC / CPSC, cosmetics → MOCRA, apparel → CPSC clothing recalls.

The returned keywords are scraped via BrightData SERP, embedded, and stored as `marketSignals` with `sourceType='compliance'`. Next time the user views their dashboard, those compliance signals participate in the same vector search as everything else — meaning the GPT dashboard generation naturally folds regulatory risk into its synthesis.

Implementation: [`_generateComplianceKeywords` + `scrapeComplianceSignals` in `backend/redis/worker.py`](backend/redis/worker.py).

---

## 10. Agent Memory with Cognee

The three-layer pipeline is *stateless* by default — every run starts from scratch with whatever pgvector retrieves. That's fine for a single user looking at one category, but it throws away a huge amount of accumulated knowledge:

- We've scraped 500 CeraVe SKUs across 200 users this month — we should *know* CeraVe by now
- A barrier-repair claim that crashed on Amazon last quarter should warn the next founder pitching the same claim
- An FDA recall for "ceramide concentration > 5%" should propagate to every skincare founder, not just the one whose compliance cron caught it

Cognee gives the system **persistent agent memory** layered on top of the raw signal store.

### What goes into the graph

Every Celery task that produces useful data also dispatches a Cognee ingest task on the synthesis queue:

| Source                            | Cognee dataset                          | Triggered by                  |
|-----------------------------------|-----------------------------------------|-------------------------------|
| Raw marketplace + social signals  | `market_<category>_<country>`           | `scrapeMarketSignals`         |
| Compliance / hazard signals       | `compliance_<category>_<country>`       | `scrapeComplianceSignals`     |
| GPT-generated dashboard entities  | `dashboard_<category>_<country>`        | `processLlmInsights`          |

The dashboard ingest pulls out structured entities — competitor brands, rising claims, city demand signals — and feeds them to Cognee as graph nodes:

```python
snippets.append(
    f"[entity:competitor category:{category}] {brand} — "
    f"sku {sku}, price {price}, rating {rating} ({reviews} reviews), "
    f"monthly sales {sales}"
)
```

Cognee then runs entity extraction, builds relationships (Brand → Category → Price Tier → Claim), and stores the graph for retrieval.

### What comes out

Two retrieval paths:

**1. ReAct agent tool — `memory_search`**

The Python agent (`/api/agent/run`) now has a sixth tool alongside `serp_search`, `marketplace_discovery`, etc:

```python
'memory_search': {
    'description': 'Query the persistent Cognee knowledge graph built from every previous scrape, dashboard, and compliance signal. Use this BEFORE running fresh scrapes to leverage prior context — e.g. "what do we know about brand X", "what compliance issues exist in food & beverage US", "which competitors recur across users in skincare".',
    ...
}
```

This is the *agent improvement* axis of the challenge: every new scrape enriches the graph, and every subsequent agent call retrieves more context. The agent literally gets smarter with use.

**2. Admin search endpoint — `/api/admin/cognee-search`**

```bash
curl -X POST http://api/admin/cognee-search \
  -H "X-Admin-Token: $ADMIN_API_TOKEN" \
  -d '{"query": "Which barrier-repair brands had recalls in 2026?", "category": "beauty", "country": "us"}'
```

Returns Cognee's graph-completion answer over the combined market, dashboard, and compliance datasets for that segment.

### Why this maps to the Cognee challenge

| Challenge axis                                            | How ConsumerIQ delivers                                                                                      |
|-----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| **Persistent memory across workflows**                    | Cognee survives across all three daily cron jobs (prune → refresh → compliance), accumulating market knowledge over months |
| **Store and retrieve context from live web data**         | Every BrightData scrape (marketplace + social + SERP) is ingested into the graph the moment it's stored in Postgres |
| **Build agents that improve through structured knowledge**| The ReAct agent's `memory_search` tool queries an ever-growing entity graph — repeat questions get better answers without rerunning scrapes |

### Implementation

- [`backend/models/cognee_memory.py`](backend/models/cognee_memory.py) — async wrapper for `cognee.add` / `cognee.cognify` / `cognee.search`
- [`worker.py:ingestSignalsIntoMemory`](backend/redis/worker.py) — Celery task for fire-and-forget signal ingestion
- [`worker.py:ingestDashboardIntoMemory`](backend/redis/worker.py) — Celery task that extracts and ingests structured dashboard entities
- [`agent/tools.py:toolMemorySearch`](backend/agent/tools.py) — ReAct agent tool
- [`main.py:cogneeSearch`](backend/main.py) — admin search endpoint
- Env-gated by `COGNEE_ENABLED` (default `false` so dev doesn't burn entity-extraction tokens)

### Cost / scaling notes

Cognee's entity extraction uses GPT-4o-mini by default — cheap (~$0.002 per 100 signals). At 50 signals × N daily users, this is well under $1/day even at moderate scale. The graph itself is stored in Postgres (Cognee's default backend), reusing our existing database connection.

### Fully local mode (zero per-call cost)

Cognee uses LiteLLM under the hood, which accepts any OpenAI-compatible endpoint via a base-URL override. Both of our GPU containers happen to already be OpenAI-compatible:

- [`inference/Dockerfile`](inference/Dockerfile) runs `python -m llama_cpp.server` — exposes `/v1/chat/completions` and `/v1/embeddings` natively
- [`inference/embeddings_server.py`](inference/embeddings_server.py) implements `/v1/embeddings` in OpenAI format on top of fastembed

So flipping a single env flag re-routes Cognee from OpenAI cloud to our own GPU containers:

```bash
COGNEE_USE_LOCAL_INFERENCE=true
COGNEE_LOCAL_LLM_URL=http://consumeriq-inference.consumeriq.svc.cluster.local:8080/v1
COGNEE_LOCAL_LLM_MODEL=llama-3.2-3b
COGNEE_LOCAL_EMBEDDING_URL=http://consumeriq-embeddings.consumeriq.svc.cluster.local:8080/v1
COGNEE_LOCAL_EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
COGNEE_LOCAL_EMBEDDING_DIMS=384
```

When this flag is set, [`_configure()` in `cognee_memory.py`](backend/models/cognee_memory.py) calls `cognee.config.set_llm_endpoint(...)` and `cognee.config.set_embedding_endpoint(...)` instead of using OpenAI defaults. Cost drops to zero per call, data never leaves the cluster.

**Trade-off:** Llama 3.2 3B is much weaker at entity extraction than GPT-4o-mini. The graph will be shallower and noisier. In practice the right answer is a hybrid: local for embeddings (huge cost savings, embedding quality is fine), cloud for entity extraction (where graph quality matters). That hybrid is one more line away — just set `COGNEE_USE_LOCAL_INFERENCE=true` and leave `COGNEE_LLM_PROVIDER=openai` overridden in code, or split the flag into `COGNEE_USE_LOCAL_LLM` / `COGNEE_USE_LOCAL_EMBEDDINGS` if you want fine-grained control.

---

## 11. Backpressure & Resource Constraints

The production server has **4 vCPUs**. That single number drove a lot of decisions:

- **Celery inference concurrency = 1** in prod (set via `INFERENCE_CONCURRENCY` env)
- **Optional queue-depth gate** (`BACKPRESSURE_ENABLED=true`) — the FastAPI agent endpoint returns 503 when the inference queue depth ≥ `INFERENCE_QUEUE_LIMIT`, so the LB sheds load instead of crashing
- **Inference queue prioritized above synthesis above scraping** — slow scrape jobs can't starve a user-facing inference call
- **Embeddings, translator, and inference all isolated** as separate deployments so one crash doesn't take the others down

In dev, all of these are loosened (concurrency=2, backpressure off, GPU containers separate from k3d).

---

## 12. Tech Stack Summary

| Layer        | Tech                                              |
|--------------|---------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite, Tailwind, Recharts, lucide-react, shadcn/ui |
| API gateway  | Go 1.22, `net/http`, pgx, asynq, bcrypt           |
| App workers  | Python 3.11, FastAPI, Celery, psycopg2            |
| ML           | llama-cpp-python (Llama 3.2 3B), NLLB-200, BGE-large-en, OpenAI Responses API |
| Memory       | **Cognee** (knowledge graph), Postgres + pgvector (raw signal store) |
| Data         | Postgres 16, pgvector, Redis 7                    |
| Scraping     | BrightData (Amazon, Walmart, TikTok, SERP), ScrapingBee fallback |
| Cluster      | k3d (local), Kubernetes 1.30, kustomize           |
| Container    | Docker, local registry on :5001                   |

---

## 13. What's Live

After running `scripts/start-gpu-inference.ps1` and `kubectl apply -k infra/k8s/`:

- **Frontend**: http://localhost:30080 (nginx → React SPA)
- **API**: routes through nginx to either Go (`/go-api/*`, `/api/auth/*`) or FastAPI (`/api/*`)
- **Cron jobs**: three of them, scheduled, idle on dev because env flags are `false`
- **GPU pods**: three Docker containers attached to the k3d network
- **Postgres + Redis**: cluster-internal services, no external exposure

Total wall-clock build → ready: ~3 minutes from `make up`.

---

## 14. Future Work (acknowledged but out of scope)

- Move GPU containers into k3d once Docker Desktop supports the NVIDIA device plugin properly
- Switch the pruning DELETE to a partitioned table (drop a partition instead of scanning)
- Add a SSE stream for pipeline progress instead of 3s polling
- Per-user rate limits on the admin endpoints
- A second-opinion LLM (Claude) to cross-check GPT's dashboard JSON before persisting
- Surface Cognee graph visualization in the dashboard UI ("here's what we know about your category")

None of these are blocking — the system is production-shaped today.
