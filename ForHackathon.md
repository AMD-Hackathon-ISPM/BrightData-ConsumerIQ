# ConsumerIQ — Technical Deep Dive

A market intelligence platform that turns a founder's product brief into a real-time, data-grounded GTM dashboard in 60–90 seconds. Built on a tiered LLM fabric (local Llama 3.2 3B on AMD GPU + cloud DeepSeek via AI/ML API + Cognee knowledge graph) with a strict no-mock-data pipeline lock.

This document walks every non-obvious engineering decision behind the system: the multi-layer LLM pipeline, the hybrid routing fabric, the polyglot service split, the GPU-in-WSL2 workaround, the recency-weighted pgvector rank function, Cognee chat-time recall, the ReAct agent fail-soft ladder, and the daily-cron knowledge lifecycle.

---

## 1. The Problem

Founders launching a product (especially in e-commerce categories like beauty, food & beverage, electronics) currently have to:

- Scrape Amazon / Temu / Walmart manually to size competitors
- Read review forums and social posts to find pain points
- Track FDA / FCC / CPSC for compliance hazards
- Cross-reference all of this into a coherent GTM plan

We compress this into a single onboarding form. The user types in their product, USP, target market, and price range. 60–90 seconds later they get a four-section dashboard backed by live scraped data, GPT-generated synthesis, and an agent chat grounded in a persistent knowledge graph.

---

## 2. System Overview

```
┌────────────┐   form    ┌────────────┐  enqueue   ┌──────────────┐
│  React UI  │──────────▶│  Go API    │───────────▶│ Redis (asynq │
└────────────┘           └────────────┘            │  + Celery)   │
       ▲                                           └──────┬───────┘
       │ /api/insights/me                                 │
       │ /api/form-pipeline/:id                           ▼
       │ /api/agent/run                ┌──────────────────────────────────────┐
       │                               │  Python Workers (Celery)             │
       │                               │  ─ scraping queue (BrightData + SB)  │
       │                               │  ─ synthesis queue (LLM + Cognee)    │
       │                               │  ─ inference queue (agent / persona) │
       │                               └──────┬─────────┬─────────┬───────────┘
       │                                      │         │         │
       │                ┌─────────────────────┘         │         └────────────────┐
       │                ▼                               ▼                          ▼
       │   ┌──────────────────────────┐    ┌──────────────────────┐   ┌──────────────────────┐
       │   │ GPU containers (off-k3d) │    │ Cloud LLM gateway    │   │ Cognee graph         │
       │   │  ─ Llama 3.2 3B  (GPU)   │    │  ─ AI/ML API → DSv3.1│   │  ─ entity extraction │
       │   │  ─ Translator    (GPU)   │    │  ─ or OpenAI direct  │   │  ─ chunk retrieval   │
       │   │  ─ Embeddings    (CPU)   │    │  ─ JSON-mode dashes  │   │  ─ Postgres-backed   │
       │   └──────────────────────────┘    └──────────────────────┘   └──────────────────────┘
       │                                      │
       │                                      ▼
       │             ┌──────────────────────────────┐
       └─────────────│ Postgres + pgvector          │
                     │  ─ users, founderForms       │
                     │  ─ marketSignals (embedded)  │
                     │  ─ categoryInsights (jsonb)  │
                     │  ─ Cognee graph + vectors    │
                     └──────────────────────────────┘
```

Every box runs as its own Kubernetes deployment in the `consumeriq` namespace. The three GPU containers are the one exception — they run on the k3d Docker network but outside k8s itself, wired in via selector-less Services + manually-managed Endpoints. See §9.

---

## 3. The Three-Layer LLM Pipeline

This is the core technical contribution. Most "AI dashboards" do a single LLM call. We do three, each at a different layer of abstraction, each routed to the model that's best at its job:

```
User form ──▶ [Layer 0] ──▶ BrightData + Twitter SERP ──▶ [Layer 1] ──▶ [Layer 2] ──▶ Dashboard JSON
              Llama 3.2 3B                                Llama 3.2 3B   DeepSeek v3.1
              keyword gen                                 omni-prompt    omni-prompt
              (local)                                     (local)        (cloud)
```

### Layer 0 — Keyword Generation (local Llama 3.2 3B)

Instead of searching marketplaces for the literal product name, we ask the local LLM to read the *full product brief* (description, USP, features, pain point, customer segment, competitive advantage) and emit 6 targeted search queries.

Example for a barrier-repair moisturizer:
- Input: name, "ceramide moisturizer", USP "clinically clear barrier repair", pain point "redness and irritation"
- Output: `["ceramide moisturizer barrier repair", "redness sensitive skin moisturizer", "barrier repair cream best", "ceramide cream irritation", "moisturizer sensitive skin clinically tested", "CeraVe alternative"]`

This is what makes the downstream scrape return relevant competitors instead of off-brand junk.

Implementation: [`_generateScrapingKeywords` in `backend/redis/worker.py`](backend/redis/worker.py).

### Scraping — BrightData + Twitter via ScrapingBee SERP

For each keyword we hit:
- `runMarketplaceDiscovery(amazon | walmart | tokopedia)` — Bright Data structured datasets, allowlist-controlled
- `_runTwitterSerpDiscovery(keyword)` — ScrapingBee Google SERP with `site:x.com OR site:twitter.com {keyword}`, synchronous ~10s per call

A category-to-marketplace map (`CATEGORY_MARKETPLACES` in worker.py) picks the right marketplaces — `food` hits Amazon + Walmart, `electronics` hits Amazon + Walmart + Tokopedia, etc. The map is then filtered through an env-driven allowlist (`PIPELINE_ENABLED_MARKETPLACES=amazon,tokopedia,walmart`) and denylist (`PIPELINE_SKIP_MARKETPLACES=google,google.shopping,lazada,tiktok,tiktok_shop,etsy`). See §13 for why.

Each scraped record is embedded via the multilingual MiniLM-L12 (384-d) and inserted into `marketSignals` with the source type, URL, country, and `signalDate=CURRENT_DATE`. Up to 50 signals are stored per run (`PIPELINE_MAX_SIGNALS=50`). A pipeline-wide budget (`PIPELINE_TOTAL_BUDGET_SECONDS=600`) hard-caps the wall-clock so one slow keyword can't blow the whole run.

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

`extractedData` is what makes Layer 2 grounded — it forces the local model to *pull out actual brand names and prices from the signals*, not just summarize. Llama 3.2 3B is fine at this because the output schema is loose and the prompt stops at `\n\n` — it short-circuits well before max_tokens.

Implementation: [`_buildPrompt` + `_runLlmInsights` in `backend/redis/worker.py`](backend/redis/worker.py).

### Layer 2 — Cloud omni-prompt (DeepSeek v3.1 via AI/ML API)

The dashboard generation is the one Layer where output schema discipline matters more than anything. A 3B model can't reliably emit a 6000-token JSON with 4 nested top-level objects and dozens of inner arrays. We route this to the cloud through an OpenAI-compatible gateway.

The cloud LLM receives:
- The full product brief (as a signal with `sourceType='product_brief'`)
- The Layer 1 output (GTM, finance, extractedData)
- The raw signals, grouped by source (`[amazon]`, `[walmart]`, `[social]`, `[twitter]`)
- A 4-section schema for the dashboard, with explicit subschemas for each section
- A "ground every brand name in the signals" instruction

It produces the final dashboard JSON: `marketOverview`, `demandPulse`, `competitorMirror`, `launchCompass`. System message explicitly forbids inventing brand names — every competitor in the output must trace back to a signal.

The schema asks for 4 *non-obvious* fields the FE renders:
- `marketOverview.whitespaceBrands[]` — competitor brands classified by `priceTier ∈ {budget, mid, premium}` × `claimLevel ∈ {low, medium, high}`. The FE renders these as dots on a 3×3 positioning grid (the Whitespace Map).
- `marketOverview.whitespaceZones[]` — 2–3 (priceTier, claimLevel) cells the LLM judges *underserved*, rendered as opportunity rectangles overlaid on the grid.
- `launchCompass.readinessCountries[]` — 6–8 countries with `demandIndex`, `competitorPressure`, `personaFit`, plus an ISO 3166-1 numeric `countryId` for the GeoJSON join. The FE's choropleth has two modes — `demand` (color by demandIndex) and `opportunity` (color by `demandIndex × personaFit ÷ competitorPressure`). Same data, two completely different stories per toggle.
- `demandPulse.claimTrends.{rising,falling}[]` — the only place the LLM is allowed to interpolate beyond the literal signals. Grounded in social/review chatter but synthesized as trend deltas.

Implementation: [`generate_dashboard_data` in `backend/models/openai_cross_reference.py`](backend/models/openai_cross_reference.py).

Tokens / latency: ~6000 max output tokens, ~30–60s wall time, ~$0.01–0.03 per run on DeepSeek v3.1, or $0.05 on gpt-4o-mini.

---

## 4. LLM Routing Fabric

Eight distinct LLM jobs across the codebase, three different providers, each picked for what it's actually best at. The rule: **strict JSON schema → AI/ML/DeepSeek; open-ended reasoning → Featherless/Qwen3.5-27B-distilled; loose JSON, keyword lists, or token-heavy bulk passes → local Llama**.

| Job | Endpoint | Model | Why |
|---|---|---|---|
| Scraping keyword generation | local GPU | Llama 3.2 3B | 6 short strings, no schema penalty; high frequency (every form) |
| Compliance keyword generation | local GPU | Llama 3.2 3B | Same shape as above; runs in daily cron, cost adds up |
| Layer 1 omni-prompt (gtm/finance/security) | local GPU | Llama 3.2 3B | Loose JSON, stops early at `\n\n`; small enough that drift is acceptable |
| BrightData ChatGPT cross-reference (when enabled) | local GPU | Llama 3.2 3B | Reshapes raw text into a schema; tiny formatter task |
| **Layer 2 dashboard generation** | **AI/ML API** | **DeepSeek v3.1** | 6000-token strict JSON with 4 nested sections; JSON-mode supported; cheap |
| **Persona Decode** (3 personas + STP + advisor) | **AI/ML API, Llama fallback** | DeepSeek v3.1 | Long structured JSON, user-blocking, schema-validated post-response |
| **Cognee entity extraction** | **AI/ML API** | DeepSeek v3.1 | Volume-heavy graph ingestion; structured extraction not deep reasoning |
| **Advisor chat (ReAct agent + Cognee recall)** | **Featherless AI, Llama fallback** | **Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled** | The one user-visible conversational surface; reasoning depth > schema discipline; distilled from Claude Opus traces |

### Why split chat from dashboard providers

The chat is the one place where **reasoning depth > schema discipline**. The user asks open-ended things ("find negative review drivers", "where should I expand next"). A reasoning-distilled model trains on chain-of-thought traces — exactly the skill the advisor bot needs.

Dashboard generation doesn't benefit from reasoning depth — it benefits from following a strict 6000-token JSON schema. DeepSeek-Chat is best-in-class for that and we'd be paying premium for capability we wouldn't use.

Splitting providers also gives us **independent failure domains** — if Featherless rate-limits during a demo, only the chat drops to local Llama. If AI/ML API has a hiccup, dashboards retry but chat is unaffected. Neither provider can take the other down.

### Env contract (single-source-of-truth, Secret-driven)

```env
# Dashboard + Persona + Cognee (workhorse provider)
OPENAI_BASE_URL=https://api.aimlapi.com/v1
OPENAI_MODEL=deepseek/deepseek-chat-v3.1
OPENAI_API_KEY=<aimlapi key>

# Advisor chat (reasoning-tier provider, falls back to OPENAI_* if any var is missing)
CHAT_BASE_URL=https://api.featherless.ai/v1
CHAT_MODEL=Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled
CHAT_API_KEY=<featherless key>
```

All six vars are read from `consumeriq-api-keys` with `secretKeyRef: optional: true` — so any missing key cascades through code-side defaults rather than crashing the deployment. The Python code reads `CHAT_*` first, falls back to `OPENAI_*` if any is unset, so partial config (e.g. `CHAT_BASE_URL` set but `CHAT_API_KEY` empty) just degrades gracefully back to the shared provider instead of erroring.

Swapping any model is a `.env` edit + `kubectl create secret … --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -` + `kubectl rollout restart` — no Python changes ever needed.

---

## 5. Strict Pipeline Lock

A naive implementation would let the user click through to the dashboard as soon as the form submits, and show mock data while real data loads in the background. We do the opposite — and gate the gate.

The Redis pipeline key `form_pipeline:{form_id}` tracks six granular stages:

| Stage              | Meaning                                                                       |
|--------------------|-------------------------------------------------------------------------------|
| `pending`          | Scrape task queued, not started                                               |
| `analyzing`        | Local Llama running Layer 1 on the signals                                    |
| `cross_referencing`| Cloud LLM generating dashboard data (Layer 2)                                 |
| `synthesizing`     | Dashboard verified post-generation; on miss, dashboard-only retry             |
| `completed`        | `dashboardData` has all 4 required sections in Postgres                       |
| `failed`           | Pipeline broke before reaching `completed`                                    |

The completion gate is two-stage:
1. Worker calls Layer 2 dashboard generation.
2. Worker checks `_dashboardIsComplete(dashboard)` — must have `marketOverview`, `demandPulse`, `competitorMirror`, `launchCompass` all populated. If any is missing, the worker calls `generate_dashboard_data` again (just the cheap dashboard call, not the full slow chain). Only after the retry passes does the worker write `inference_stage=completed` to Redis.

The assembling-page UI ([`generating-step.tsx`](frontend/src/features/onboarding/founder-form/generating-step.tsx)) polls `/api/form-pipeline/:id` every 3s. The "Open dashboard" button stays disabled until **both** the Celery task is successful **and** the Redis stage explicitly says `completed`. If the celery task succeeded but our gate said `failed` (because the dashboard never came together), we honor the gate. No timeout escape, no error fallback. If the pipeline genuinely fails, the user sees a "refresh and resubmit" message instead of a fake dashboard.

The dashboard sections also strip all fallback mock data — they show "Generating … data…" placeholders if `dashboardData` happens to be missing. In practice this never fires because the lock above prevents navigation until data is real.

---

## 6. The Data Age Rank Function

This is the part we're proudest of and the part you should look closely at.

Naive vector search is `ORDER BY embedding <-> query LIMIT N`. The problem: in a daily-refresh world, 4-month-old signals from a different market cycle will outrank fresh ones if their text happens to be more semantically similar. A founder asking about *current* skincare claims would get retrieval results dominated by last quarter's promo cycle.

We treat retrieval as a **rank fusion problem** — combine semantic distance and temporal distance into a single ordering function:

```
rank(signal) = distance(embedding, query) + recency_penalty(signal)

recency_penalty(signal) = (CURRENT_DATE - signal.signalDate) days × RECENCY_WEIGHT
```

In SQL:

```sql
SELECT signalText, sourceType, sourceUrl, sentimentScore
FROM marketSignals
WHERE embedding IS NOT NULL
  AND (country = %s OR country IS NULL)
ORDER BY (embedding <-> %s::vector)
       + COALESCE(CURRENT_DATE - signalDate, 0) * 0.005
LIMIT 50
```

### Picking the weight

`SIGNAL_RECENCY_WEIGHT=0.005` is calibrated against the pgvector cosine distance range (0.0 = identical, ~2.0 = orthogonal, typical relevant hits ~0.15–0.45). The penalty table:

| Signal age | Penalty added to distance | Effect at typical relevance |
|-----------|---------------------------|-----------------------------|
| Today | +0.000 | full priority |
| 7 days | +0.035 | rounding error |
| 30 days | +0.150 | drops a strong hit (0.20) below medium hits (0.30) |
| 60 days | +0.300 | strong hit (0.20) now ranks like a marginal hit |
| 90 days | +0.450 | only fires if no fresh signal is even adjacent |
| 120 days | +0.600 | effectively excluded — equivalent to "near-orthogonal" |
| 180 days | +0.900 | always loses to anything within 60 days |

The 120-day cliff matches our `SIGNAL_TTL_MONTHS=4` prune cron — by the time a signal would be hard-excluded by rank, it's already physically deleted by the nightly TTL job. The two systems are designed to converge.

### Why a linear penalty and not exponential decay

We tested both. Exponential decay (`distance × e^(age/τ)`) over-penalizes anything past the half-life and *under-penalizes* recent signals — the rank becomes binary "fresh or dead" with no gradient. Linear penalty preserves a continuous gradient across the entire 4-month window, which is what the dashboard generator actually needs: it wants to see *some* older context to detect trend reversals.

### Country filter as a separate axis

The country filter is a hard WHERE clause, not a rank input. We never want to fuse country into a soft score — a founder launching in Indonesia should never see US-only signals climb the ranking because they're 3 days fresher. Country is categorical exclusion; age is continuous penalty. The two rank dimensions stay separated by type.

### Knob exposure

`SIGNAL_RECENCY_WEIGHT` is read from env in [`worker.py`](backend/redis/worker.py) and used at SQL-build time. Different deployments can tune the freshness/breadth tradeoff without code changes:
- `0.001` — long-memory mode for slow-moving categories (industrial, B2B). 4 months of context, mild bias toward fresh.
- `0.005` — default, calibrated for consumer e-commerce.
- `0.020` — aggressive freshness; only ~30 days of context effectively visible. Use for fast-moving categories (food trends, viral SKUs).

Implementation: [`_fetchRelevantSignals` in `backend/redis/worker.py`](backend/redis/worker.py).

---

## 7. Polyglot Service Split

Why two backend languages?

| Concern                        | Language | Reason                                    |
|--------------------------------|----------|-------------------------------------------|
| Auth, sessions, form ingestion | Go       | Sub-ms latency, bcrypt, type safety       |
| Form-received fan-out          | Go       | asynq is Go-native, plays well with auth  |
| LLM inference, scraping, ML    | Python   | The ecosystem (Celery, llama-cpp, BGE)    |
| GPU model serving              | Python   | llama-cpp-python / fastembed              |
| UI                             | TS+React | Component reuse, type-safe API contracts  |

The Go service handles the high-frequency, low-CPU path. The Python workers handle the slow, heavy path. They communicate exclusively through Redis (asynq → Celery via different queue names) and Postgres (jsonb columns).

This split also makes the queue priority system work:
- `inference` queue: LLM completions (highest priority, RAM-bound)
- `synthesis` queue: full insight generation + Cognee ingestion
- `scraping` queue: BrightData / SERP I/O (lowest priority, network-bound)

---

## 8. Database Schema

Four tables, all in Postgres with the `vector` extension installed. Cognee adds its own tables on the same database.

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
  sourceType text,                -- 'amazon' | 'walmart' | 'tokopedia' | 'twitter' | 'compliance' | 'product_brief' | 'pipeline_fallback'
  sourceUrl text,
  signalDate date,                -- THE column the rank function reads
  country text,
  category text,
  sentimentScore real,
  embedding vector(384)           -- paraphrase-multilingual-MiniLM-L12
)

categoryInsights (
  category text,
  country text,
  status text,
  gtmIntelligence jsonb,
  financeIntelligence jsonb,
  securityCompliance jsonb,
  extraAnalysis jsonb,            -- contains .dashboardData (the 4-section JSON)
  lastUpdated timestamptz,
  PRIMARY KEY (category, country)
)
```

Design decisions:
- **`founderForms.payload` as jsonb** — schema evolution doesn't require migrations during a hackathon
- **`marketSignals.embedding` indexed via IVFFlat** — sub-100ms vector search even at 100K rows
- **`categoryInsights` keyed by (category, country) not (user_id)** — multiple users in the same market share insights, cuts cost by ~80%

---

## 9. The GPU-in-k3d Workaround (and the two follow-up bugs)

This was the single trickiest infra problem.

**The bug:** NVIDIA's Kubernetes device plugin advertises GPUs to k8s by scanning `/dev/nvidia*`. Docker Desktop on WSL2 doesn't expose those device nodes — instead, GPU access goes through `/dev/dxg` (DirectX paravirtualization). The device plugin sees zero GPUs, so any pod requesting `nvidia.com/gpu` stays `Pending` forever with `Insufficient nvidia.com/gpu`.

**The fix:** Run the three GPU containers (inference, translator, embeddings) as plain Docker containers on the same Docker network as the k3d cluster (`k3d-consumeriq-local`), then wire them into k8s with selector-less Services + manually-managed Endpoints.

The startup script [`scripts/start-gpu-inference.ps1`](scripts/start-gpu-inference.ps1):
1. `docker run --gpus all --network k3d-consumeriq-local <image>`
2. `docker inspect | ConvertFrom-Json` to grab the container's IP on that network
3. `kubectl apply` an Endpoints YAML pointing the Service at that IP — **with the port `name: http` explicitly set**

From inside k8s, `http://consumeriq-inference.consumeriq.svc.cluster.local:8080` resolves through this selector-less Service and lands on the Docker container as if it were a pod. The Python workers never know the difference.

### Follow-up bug #1 — named-port mismatch

The Service declares `ports: [{name: http, port: 8080}]`. If the Endpoints object has an *unnamed* port, kube-proxy refuses to program iptables rules — it requires named-port-to-named-port matching. Symptom: direct TCP to the Docker IP succeeds, but ClusterIP returns connection refused. We hit this once and learned: the Endpoints YAML must echo `name: http` exactly.

### Follow-up bug #2 — k3d CoreDNS external resolution

k3d's CoreDNS Corefile forwards external DNS lookups to the node container's `/etc/resolv.conf`, which on Windows Docker Desktop points to Docker's embedded resolver (`127.0.0.11`). That resolver intermittently returns SERVFAIL for outbound queries — observed as `request_error duration=0.0s` when Bright Data calls failed before even establishing TCP. Fix: patch the Corefile's `forward .` line to point directly at Cloudflare + Google + Quad9, bypassing Docker's broken middleman:

```
forward . 1.1.1.1 8.8.8.8 9.9.9.9
```

Cost: 1 PowerShell script (`start-gpu-inference.ps1`) + 1 ConfigMap patch. Benefit: GPU + outbound DNS actually work on Windows dev machines.

---

## 10. Daily Automation

Three Kubernetes `CronJob` resources keep the dataset fresh, relevant, and lean:

| Cron                          | UTC   | Job                                                        |
|-------------------------------|-------|------------------------------------------------------------|
| `consumeriq-prune-signals`    | 01:00 | DELETE rows older than `SIGNAL_TTL_MONTHS` (4 by default)  |
| `consumeriq-daily-refresh`    | 02:00 | Re-run `scrapeMarketSignals` for every active user         |
| `consumeriq-compliance-scrape`| 03:00 | LLM-generate compliance keywords per user, scrape via SERP |

Order matters: prune first (drop stale data → frees recency-rank slots), then refresh (add fresh data on a clean DB), then compliance (extra hazard context on top).

All three CronJobs are just `curl` containers hitting admin endpoints on the FastAPI service. Each endpoint short-circuits with `{"status": "skipped"}` unless its env flag is `true`:

- `DAILY_REFRESH_ENABLED`
- `COMPLIANCE_SCRAPE_ENABLED`
- `SIGNAL_TTL_ENABLED`

All three default to `false` so a dev cluster doesn't accidentally burn BrightData / OpenAI credits.

### Compliance keyword generation

For each user with a founder form, we ask the local Llama:

> *For a business in the "{category}" category operating in {country}, generate 5 search keywords to monitor news, regulatory updates, safety recalls, or hazard alerts.*

With few-shot examples baked into the prompt — food → FDA recalls, electronics → FCC / CPSC, cosmetics → MOCRA, apparel → CPSC clothing recalls.

The returned keywords are scraped via BrightData SERP, embedded, and stored as `marketSignals` with `sourceType='compliance'`. Next time the user views their dashboard, those compliance signals participate in the same recency-weighted vector search as everything else — meaning the dashboard generation naturally folds regulatory risk into its synthesis.

Implementation: [`_generateComplianceKeywords` + `scrapeComplianceSignals` in `backend/redis/worker.py`](backend/redis/worker.py).

---

## 11. Cognee Memory (with chat-time recall)

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

Cognee then runs entity extraction (cloud-routed for graph quality), builds relationships (Brand → Category → Price Tier → Claim), and stores the graph in Postgres-backed vector + relational storage.

### What comes out — chat-time recall

Every chat message goes through a three-tier resolution ladder (§12). On the **cloud-primary path**, before composing the final prompt, we hit Cognee with `search_type='chunks'`:

```python
results = run_async(
    search_memory(
        query=user_prompt[:500],
        category=user_context.get('industry'),
        country=user_context.get('country'),
        search_type='chunks',   # fast retrieval, no LLM synthesis
    )
)
```

The top 5 chunks are formatted as `Relevant memory from prior scrapes & dashboards: ...` and injected into the user message *before* the cloud LLM composes its answer. The system prompt explicitly instructs the LLM to treat this block as ground truth from prior research and to cite specific brands/claims/prices it surfaces.

Why `chunks` and not `graph_completion`:
- `chunks` = direct retrieval, ~200–500ms, returns matching text chunks
- `graph_completion` = LLM synthesis from the graph, ~5–10s, adds latency to every chat

For always-on per-message recall, `chunks` is the right tradeoff. The cloud LLM does the synthesis anyway when it composes the reply; doing it twice would be wasteful.

### Other retrieval paths

**ReAct agent tool — `memory_search`**: The Llama ReAct loop has access to a `memory_search` tool that queries the graph as part of its planning. Since chat is now cloud-primary, this fires only when cloud is unreachable — but the tool definition is preserved for the fallback path. Tool description:

```python
'description': 'Query the persistent Cognee knowledge graph built from every previous scrape, dashboard, and compliance signal. Use this BEFORE running fresh scrapes to leverage prior context — e.g. "what do we know about brand X", "what compliance issues exist in food & beverage US", "which competitors recur across users in skincare".',
```

**Admin search endpoint — `/api/admin/cognee-search`**: manual interface for `graph_completion`-style queries. Useful for ops debugging and demos.

### Why this maps to the Cognee challenge

| Challenge axis                                            | How ConsumerIQ delivers                                                                                      |
|-----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| **Persistent memory across workflows**                    | Cognee survives across all three daily cron jobs (prune → refresh → compliance), accumulating market knowledge over months |
| **Store and retrieve context from live web data**         | Every BrightData scrape (marketplace + social + SERP) is ingested into the graph the moment it's stored in Postgres |
| **Build agents that improve through structured knowledge**| Cloud chat now hits the graph on every message via `_recallCogneeMemory` — repeat questions get more grounded answers as the graph grows |

### Local-only mode

Cognee uses LiteLLM under the hood, which accepts any OpenAI-compatible endpoint. Our GPU containers happen to already speak OpenAI:

- [`inference/Dockerfile`](inference/Dockerfile) runs `python -m llama_cpp.server` — exposes `/v1/chat/completions` and `/v1/embeddings`
- [`inference/embeddings_server.py`](inference/embeddings_server.py) implements `/v1/embeddings` in OpenAI format on top of fastembed

Flipping one env flag re-routes Cognee from cloud to local:

```bash
COGNEE_USE_LOCAL_INFERENCE=true
COGNEE_LOCAL_LLM_URL=http://consumeriq-inference.consumeriq.svc.cluster.local:8080/v1
COGNEE_LOCAL_LLM_MODEL=llama-3.2-3b
COGNEE_LOCAL_EMBEDDING_URL=http://consumeriq-embeddings.consumeriq.svc.cluster.local:8080/v1
COGNEE_LOCAL_EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
COGNEE_LOCAL_EMBEDDING_DIMS=384
```

Trade-off: Llama 3.2 3B does shallower entity extraction. In practice the hybrid (cloud entity extraction, local embeddings) is the sweet spot — graph quality stays high, embedding cost goes to zero.

---

## 12. The ReAct Agent (and the chat tier ladder)

The advisor chat is structurally a ReAct loop — the agent gets a system prompt with strict JSON output rules, a tool registry, and runs a `thought → action → observation` cycle for up to 6 steps before producing a `final_answer`. Tool registry:

```python
TOOL_SCHEMAS = {
    'fetch_market_signals':    pgvector retrieval with rank-fusion (§6)
    'serp_search':             ScrapingBee Google SERP
    'marketplace_scrape':      Bright Data marketplace endpoint
    'social_scrape':           Bright Data social endpoint
    'memory_search':           Cognee graph query (§11)
}
```

The agent picks tools based on the user's question — "find negative review drivers" routes to `fetch_market_signals` + `marketplace_scrape`, "what compliance issues exist in skincare US" routes to `memory_search` + `serp_search`. Each tool returns a summarized observation that gets appended to the prompt; the agent decides whether to call another tool or finalize.

### Output discipline

ReAct breaks easily on small models. We compensate with:

```python
_SYSTEM = '''\
1. Respond ONLY with valid JSON. No prose, no markdown, no extra text.
2. To call a tool output:
   {"thought": "<reasoning>", "action": "<tool>", "action_input": {...}}
3. When you have enough data output:
   {"thought": "<reasoning>", "final_answer": "..."}
4. Call at least 2 different tools before writing final_answer.
5. Never invent data — only use what the observations return.
'''
```

Plus a custom `_extractJson` that tolerates a single layer of model-injected prose around the JSON object (greedy `\{[\s\S]*\}` extraction after `json.loads` fails). Plus parse-failure tracking — two consecutive un-parseable outputs and the loop breaks out into the fallback ladder.

### Tier-resolution ladder

Even with strict prompts, Llama 3.2 3B can drift. The agent task is wrapped in a three-tier fail-soft chain:

| Tier | Source | Triggers when |
|---|---|---|
| **1. Cloud chat (primary)** | DeepSeek v3.1 via AI/ML API | Always tried first — fast (3–8s), Cognee-recall-augmented, no tool use but grounded by graph chunks |
| 2. Llama ReAct loop | Local Llama 3.2 3B with tool registry | Cloud unreachable / API failure / empty response |
| 3. Llama plain chat | Local Llama 3.2 3B, no ReAct constraints | Cloud unreachable AND Llama ReAct fails (parse errors, exhausted max_steps) |

Each successful path sets a `source: 'cloud' | 'llama'` field in the response so the FE — and the operator tailing logs — can see which one fired. Tier-3 failure returns `success: false` with a descriptive error.

### Why this matters

The hybrid means **the chat is bounded above by cloud reliability and bounded below by local sovereignty**. If your AI/ML API key gets rate-limited mid-demo, the chat drops to Llama with no visible interruption — `kubectl logs` shows the tier transition, but the user just sees "the bot replied". If the local Llama container crashes, cloud handles every request transparently. The system stays conversational across the worst plausible single failure of any tier.

The ReAct path itself is what gives the agent the *option* to call tools. Cloud-primary doesn't need it for grounding (Cognee chunks already provide that), but when cloud is gone, Llama+ReAct can still synthesize a useful answer by calling `memory_search` + `fetch_market_signals` and reasoning over the result. The fallback isn't a degraded mode — it's a different mode with different superpowers.

Implementation: [`backend/agent/reactAgent.py`](backend/agent/reactAgent.py) (loop + fallback ladder + Cognee recall), [`backend/agent/tools.py`](backend/agent/tools.py) (tool registry), [`backend/redis/worker.py:runAgentTask`](backend/redis/worker.py) (Celery wrapper + tier orchestration).

---

## 13. Scrape Budget & Marketplace Allowlist

Bright Data scraping is the slowest, most failure-prone surface in the system. The scraping team's initial integration would happily issue 24+ snapshot-wait calls per form submission, each capable of blocking up to 10 minutes — observed wall-clock of 18+ minutes on a single submit. We tightened this with four orthogonal env knobs:

| Knob | Default | Effect |
|---|---|---|
| `PIPELINE_ENABLED_MARKETPLACES` | `amazon,tokopedia,walmart` | Allowlist; everything else gets dropped before the loop runs |
| `PIPELINE_SKIP_MARKETPLACES` | `google,google.shopping,lazada,tiktok,tiktok_shop,etsy` | Denylist; applied after allowlist for category-map overrides |
| `PIPELINE_MAX_MARKETPLACES_PER_KEYWORD` | `2` | Hard cap per keyword regardless of category routing |
| `PIPELINE_TOTAL_BUDGET_SECONDS` | `600` | Wall-clock ceiling on a single scrape run; loop bails out of remaining keywords once exceeded |
| `PIPELINE_SOCIAL_ENABLED` | `false` | Master switch for the Bright Data TikTok discovery call (slow) |
| `PIPELINE_TWITTER_ENABLED` | `true` | Twitter via ScrapingBee SERP — fast (~10s) substitute for the disabled Bright Data social path |

The two-list pattern (allowlist + denylist) handles two different intents cleanly:
- *Allowlist* says "these are the marketplaces we trust to be fast" — added at integration time.
- *Denylist* catches misclassifications in the category map (e.g., if `electronics` routes to `google.shopping`, the denylist strips it back out without us having to edit `CATEGORY_MARKETPLACES`).

The budget is the safety net — even if every other knob is wrong, the loop can't exceed 10 minutes. Once `_pipelineTimeExceeded(started_at)` returns true, the worker skips remaining keywords and dispatches `processLlmInsights` on whatever signals it managed to collect.

Implementation: [`scrapeMarketSignals` + `_runTwitterSerpDiscovery` in `backend/redis/worker.py`](backend/redis/worker.py).

---

## 14. Whitespace Map + Readiness Map (dashboard intelligence)

Two pieces of the dashboard worth specific technical notes — both are FE renders driven entirely by LLM classification at Layer 2.

### Whitespace Map (`marketOverview.whitespaceBrands[]` + `whitespaceZones[]`)

A 3×3 positioning grid:
- X-axis: `priceTier ∈ {budget, mid, premium}`
- Y-axis: `claimLevel ∈ {high, medium, low}`

The LLM classifies 8–14 real competitor brands (from the scraped signals) into cells, plus identifies 2–3 (priceTier, claimLevel) combinations as *underserved zones*. The FE places brand dots in cells with deterministic jitter (string-hash of brand name → bounded 2D offset within the cell), so the same brand always lands at the same spot but no two brands overlap.

The zones render as translucent rectangles overlaid on the cells, labeled with the LLM's natural-language description (`Premium · fragrance-free`, `Mid · sensitive skin`, `Budget · clinical claim`). This is the "where to play" answer in one chart — *which combinations of price and credibility nobody currently owns*.

Implementation: [`market-overview.tsx:WhitespaceMap`](frontend/src/features/dashboard/components/sections/market-overview.tsx).

### Readiness Map (`launchCompass.readinessCountries[]`)

A choropleth of 6–8 countries, with two display modes the user toggles:

| Mode | Coloring metric | Domain |
|---|---|---|
| `demand` | `demandIndex` (raw) | 70–135 |
| `opportunity` | `opportunityScore = (demandIndex × personaFit) / max(competitorPressure, 1)` | 55–165 |

Same data, completely different stories. The `demand` mode shows "where consumer demand is strongest right now" — useful for "which market should I prioritize?" The `opportunity` mode shows "where to expand next — high persona fit, low competitive pressure" — useful for "which market is *underserved*?"

The Demand winner and Opportunity winner are typically different countries. The LLM is explicitly instructed to make this so via the schema constraint:

> *one country must clearly lead by demandIndex (the demand winner); a different country should lead by opportunityScore-implying mix (high persona fit + lower competitor pressure) as the expansion recommendation*

The choropleth uses MapLibre GL JS with a topojson-derived GeoJSON layer joined to the LLM output by ISO 3166-1 numeric `countryId`. Hover popups show all five raw metrics so the user can sanity-check the LLM's classification.

Implementation: [`launch-readiness-map.tsx`](frontend/src/features/dashboard/components/sections/launch-readiness-map.tsx).

---

## 15. Backpressure & Resource Constraints

The production server has **4 vCPUs**. That single number drove a lot of decisions:

- **Celery inference concurrency = 1** in prod (set via `INFERENCE_CONCURRENCY` env)
- **Optional queue-depth gate** (`BACKPRESSURE_ENABLED=true`) — the FastAPI agent endpoint returns 503 when the inference queue depth ≥ `INFERENCE_QUEUE_LIMIT`, so the LB sheds load instead of crashing
- **Inference queue prioritized above synthesis above scraping** — slow scrape jobs can't starve a user-facing inference call
- **Embeddings, translator, and inference all isolated** as separate deployments so one crash doesn't take the others down

In dev, all of these are loosened (concurrency=2, backpressure off, GPU containers separate from k3d).

---

## 16. Tech Stack Summary

| Layer        | Tech                                              |
|--------------|---------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite, Tailwind, Recharts, MapLibre GL, lucide-react, shadcn/ui |
| API gateway  | Go 1.22, `net/http`, pgx, asynq, bcrypt           |
| App workers  | Python 3.11, FastAPI, Celery, psycopg2, httpx     |
| ML — local   | llama-cpp-python (Llama 3.2 3B, Qwen 3.5 0.8B for translation), fastembed (paraphrase-multilingual-MiniLM-L12) |
| ML — cloud   | AI/ML API gateway → DeepSeek v3.1 (default), gpt-4o-mini (alt), Claude/Llama-70B (drop-in via base URL) |
| Memory       | **Cognee** (LiteLLM-routed knowledge graph), Postgres + pgvector (raw signal store, recency-ranked) |
| Data         | Postgres 16, pgvector (IVFFlat), Redis 7          |
| Scraping     | BrightData (Amazon, Walmart, Tokopedia datasets), ScrapingBee (Google SERP, Twitter via `site:` query) |
| Cluster      | k3d (local), Kubernetes 1.30, kustomize, CoreDNS patched to upstream Cloudflare/Google directly |
| Container    | Docker, local registry on :5001, GPU containers wired via selector-less Services + named-port Endpoints |

---

## 17. What's Live

After running `scripts/start-gpu-inference.ps1` and `kubectl apply -k infra/k8s/`:

- **Frontend**: http://localhost:30080 (nginx → React SPA)
- **API**: routes through nginx to either Go (`/go-api/*`, `/auth/*`) or FastAPI (`/api/*`)
- **Cron jobs**: three of them, scheduled, idle on dev because env flags are `false`
- **GPU pods**: three Docker containers attached to the k3d network, Endpoints named-port-wired
- **Postgres + Redis**: cluster-internal services, no external exposure
- **Cognee**: dormant by default; flip `COGNEE_ENABLED=true` + ensure `OPENAI_API_KEY` is set to activate chat-time recall

Total wall-clock build → ready: ~3 minutes from `make up`.

---

## 18. Future Work (acknowledged but out of scope)

- Move GPU containers into k3d once Docker Desktop supports the NVIDIA device plugin properly
- Switch the pruning DELETE to a partitioned table (drop a partition instead of scanning)
- Add an SSE stream for pipeline progress instead of 3s polling
- Per-user rate limits on the admin endpoints
- A "Cognee suggests new keywords" cron — instead of re-scraping the original 6 keywords, ask Cognee what's *missing* from the graph and scrape those
- Surface Cognee graph visualization in the dashboard UI ("here's what we know about your category")
- Streaming chat responses (cloud LLM supports it; we just don't pipe the SSE through yet)

None of these are blocking — the system is production-shaped today.
