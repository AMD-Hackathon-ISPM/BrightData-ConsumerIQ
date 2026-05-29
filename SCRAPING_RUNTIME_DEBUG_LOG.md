# Scraping Runtime Debug Log


Date: 2026-05-29

Purpose: identify BrightData scraping sources that make the onboarding pipeline exceed demo-safe runtime, then remove/guard them from the main pipeline.

## Runtime Evidence

### Kubernetes log capture attempt

Command attempted:

```powershell
kubectl logs -n consumeriq deploy/consumeriq-worker-scraping --since=24h --timestamps
kubectl logs -n consumeriq deploy/consumeriq-worker-inference --since=24h --timestamps
```

## Kubernetes Runtime Guard Dry Run

Captured after Docker/K8s was restarted and the worker image/env were updated.

Runtime config check from pod:

```text
keyword_limit 2
budget 150
social False
enabled ['tokopedia', 'walmart']
skip ['amazon', 'google', 'google.shopping', 'lazada', 'tiktok', 'tiktok_shop']
timeout 45
snapshot 35
selector ['tokopedia']
```

Dry-run command executed inside `consumeriq-worker-scraping`:

```powershell
kubectl exec -n consumeriq deploy/consumeriq-worker-scraping -- python /app/scripts/validate_pipeline_runtime_guard.py
```

Result:

```json
{
  "status": "passed",
  "runtime_config": {
    "keyword_limit": 2,
    "total_budget_seconds": 150,
    "social_enabled": false,
    "enabled_marketplaces": [
      "tokopedia",
      "walmart"
    ],
    "skip_marketplaces": [
      "amazon",
      "google",
      "google.shopping",
      "lazada",
      "tiktok",
      "tiktok_shop"
    ],
    "brightdata_timeout_seconds": 45,
    "snapshot_wait_seconds": 35,
      "marketplace_record_limit": 100
  },
  "called_marketplaces": [
    {
      "marketplace": "tokopedia",
      "keyword": "smart gadget reviews",
      "timeout_seconds": "45",
      "snapshot_wait_seconds": "35",
      "record_limit": "10"
    }
  ],
  "called_social_sources": [],
  "inserted_signal_count": 3,
  "task_result": {
    "category": "Electronics & Gadgets",
    "country": "id",
    "signals_stored": 3,
    "status": "completed"
  },
  "captured_worker_log": [
    "[scraping] Pipeline guard total_budget=150s keyword_limit=2 max_signals=3 marketplaces=['tokopedia'] social_enabled=False",
    "[scraping] Social discovery skipped keyword=smart gadget reviews reason=PIPELINE_SOCIAL_DISCOVERY_ENABLED=false",
    "[scraping] Marketplace discovery marketplace=tokopedia keyword=smart gadget reviews",
    "[scraping] Marketplace discovery status=success marketplace=tokopedia keyword=smart gadget reviews duration=0.0s elapsed=0.0s",
    "[scraping] Done. Stored 3 signals for category=Electronics & Gadgets, country=id"
  ]
}
```

Proof conclusion:

```text
The Kubernetes worker runtime did not call Lazada, Amazon, Google Shopping, TikTok, or TikTok Shop.
For Electronics & Gadgets in Indonesia, the guarded pipeline selected Tokopedia only.
Social discovery was skipped by runtime config.
```

## Real BrightData Smoke Test

This run was not mocked. It called BrightData from inside the Kubernetes scraping worker.

Command:

```powershell
kubectl exec -n consumeriq deploy/consumeriq-worker-scraping -- python -c "... runMarketplaceDiscovery(keyword='smart gadget reviews', marketplace='tokopedia', country_code='id', wait_for_snapshot=False, timeout_seconds=90, record_limit=10) ..."
```

Result:

```json
{
  "duration_seconds": 61.0,
  "status": "snapshot_pending",
  "endpoint": "tokopedia.products.discover_keyword",
  "datasetId": "gd_lxk24yba297r8qd3tp",
  "datasetKey": "tokopedia.products",
  "snapshotId": "sd_mpqxibl81mvtgjz27j",
  "input": [
    {
      "sort_by": "",
      "keyword": "smart gadget reviews"
    }
  ],
  "marketplace": "tokopedia",
  "countryCode": "id"
}
```

Snapshot progress check:

```json
{
  "status": "success",
  "source": "brightdata",
  "snapshotId": "sd_mpqxibl81mvtgjz27j",
  "progress": {
    "status": "running",
    "snapshot_id": "sd_mpqxibl81mvtgjz27j",
    "dataset_id": "gd_lxk24yba297r8qd3tp"
  }
}
```

Note:

```text
The first real smoke test used timeout_seconds=45 and returned request_error before BrightData produced a snapshot.
The second real smoke test used timeout_seconds=90 and produced snapshot sd_mpqxibl81mvtgjz27j.
If BrightData UI "My scrapers" still shows Count: 0, check the Logs tab or snapshot/dataset run view rather than the saved-scraper list.
```

Result at capture time:

```text
Unable to connect to the server: dial tcp 127.0.0.1:64187: connectex: No connection could be made because the target machine actively refused it.
```

The cluster API was unavailable during this audit, so the live log pull could not be completed at this exact moment.

### Previously captured worker logs

These logs were captured from `consumeriq-worker-scraping` during the prior pipeline debug session.

```text
[2026-05-28 21:13:59] Marketplace discovery marketplace=amazon keyword=#reviewskincare
[2026-05-28 21:25:05] Marketplace discovery status=snapshot_timeout marketplace=amazon keyword=#reviewskincare
```

Observed duration: about 11 minutes 6 seconds for one Amazon keyword before timeout.

```text
[2026-05-28 21:25:05] Marketplace discovery marketplace=google.shopping keyword=#reviewskincare
[2026-05-28 21:26:00] Marketplace discovery status=success marketplace=google.shopping keyword=#reviewskincare
```

Observed duration: about 55 seconds for one Google Shopping keyword. This is below 3 minutes individually, but it compounds across keyword and marketplace loops. Team requested removing Google Shopping from the demo pipeline.

```text
[2026-05-28 21:39:22] Social discovery keyword=#reviewskincare
[2026-05-28 21:41:53] Social discovery status=success keyword=#reviewskincare
```

Observed duration: about 2 minutes 31 seconds for one TikTok social keyword.

```text
[2026-05-28 21:54:27] Social discovery keyword=#reviewskincare
[2026-05-28 22:01:40] Social discovery status=success keyword=#reviewskincare
```

Observed duration: about 7 minutes 13 seconds for one TikTok social keyword.

### BrightData UI observation

User-provided UI observation:

```text
Lazada - Products - discover by keyword stayed Running and grew from about 1.27K records to 5K+ records after around 18 minutes.
```

Decision: Lazada is not demo-safe for the main pipeline.

## Sources Removed From Main Pipeline

These sources are skipped by default in the onboarding `scrapeMarketSignals` pipeline:

```text
lazada
google
google.shopping
tiktok
tiktok_shop
```

Reasoning:

- `lazada`: unbounded/high-record runs observed in BrightData UI.
- `google.shopping`: requested by team to remove; also compounds across loops.
- `tiktok` and `tiktok_shop`: social discovery can exceed 7 minutes for one keyword.
Note: Amazon was re-tested after syncing the latest BrightData token and is now enabled with the 100-record cap.

## Sources Still Allowed

The demo-safe marketplace allowlist is:

```text
walmart
tokopedia
amazon
```

The pipeline now selects at most one allowed marketplace per keyword.

## New Runtime Guards

Configured defaults:

```text
PIPELINE_KEYWORD_LIMIT=2
PIPELINE_MAX_SIGNALS=3
PIPELINE_MARKETPLACE_RECORD_LIMIT=100
PIPELINE_TOTAL_BUDGET_SECONDS=150
PIPELINE_MAX_MARKETPLACES_PER_KEYWORD=1
PIPELINE_SOCIAL_DISCOVERY_ENABLED=false
PIPELINE_ENABLED_MARKETPLACES=walmart,tokopedia,amazon
PIPELINE_SKIP_MARKETPLACES=lazada,google,google.shopping,tiktok,tiktok_shop
PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS=45
PIPELINE_SNAPSHOT_WAIT_SECONDS=35
PIPELINE_ALLOW_FALLBACK_SIGNALS=true
```

Expected behavior:

- LLM can still generate targeted keywords.
- Pipeline scrapes only the first two keywords.
- Pipeline does not call TikTok/social discovery unless explicitly re-enabled.
- Pipeline calls at most one allowed marketplace per keyword.
- Pipeline stops once total scraping budget is exhausted.
- If BrightData returns no usable records before the budget, fallback signal insertion keeps inference moving.

## Code-Level Instrumentation Added

`backend/redis/worker.py` now logs:

```text
[scraping] Pipeline guard total_budget=... keyword_limit=... max_signals=... marketplaces=... social_enabled=...
[scraping] Social discovery skipped keyword=... reason=PIPELINE_SOCIAL_DISCOVERY_ENABLED=false
[scraping] Marketplace discovery status=... marketplace=... keyword=... duration=... elapsed=...
[scraping] Pipeline budget exhausted before ...
```

These logs are meant to prove whether future pipeline runs stay under the target time budget.

## Requested Platform Benchmark: Tokopedia, Walmart, Sephora, Alibaba

Captured from inside `consumeriq-worker-scraping` against the real BrightData API.

### Valid keyword-discovery runs

```text
Walmart keyword discovery
endpoint: walmart.products.discover_keyword
snapshot: sd_mpqxpso2ig8rhack5
submit call duration: 61.1s
BrightData collection_duration: 149,677 ms
records: 186
status: ready
decision: keep for automatic onboarding pipeline, cap locally to 100 records.
```

```text
Tokopedia keyword discovery
endpoint: tokopedia.products.discover_keyword
snapshot: sd_mpqxohiy1zh5nryc6x
submit call duration: 61.8s
BrightData collection_duration: 233,666 ms
records: 118
status: ready
decision: keep for automatic onboarding pipeline, cap locally to 100 records.
```

### Direct URL collection runs

```text
Alibaba product collect URL
endpoint: alibaba.products.collect_url
duration: 47.15s
records: 1 product object
status: success
decision: fastest valid direct URL source, but not used by automatic keyword pipeline because it requires a product URL.
```

```text
Sephora product collect URL
endpoint: sephora.products.collect_url
snapshot: sd_mpqxx0ca1hw8l4sruw
submit call duration: 61.11s
BrightData collection_duration: 149,078 ms
records: 2
status: ready
decision: valid direct URL source, but not used by automatic keyword pipeline because it requires a product URL.
```

### Rejected automatic discovery candidates

```text
Sephora sitemap discovery
endpoint: sephora.products.discover_sitemap
snapshot: sd_mpqxr3z54ykn3ksyq
status during follow-up: running
decision: reject from demo pipeline because it can keep running past the target window.
```

```text
Alibaba category/search discovery
endpoint: alibaba.products.discover_category_url
tested URLs:
- https://www.alibaba.com/consumer-electronics_c44
- https://www.alibaba.com/Consumer-Electronics_p44
- https://www.alibaba.com/category/Consumer-Electronics_44.html
- https://www.alibaba.com/showroom/consumer-electronics.html
- https://www.alibaba.com/trade/search?tab=all&SearchText=Consumer+Electronics&categoryId=44
- https://www.alibaba.com/trade/search?SearchText=smart+watch
- https://www.alibaba.com/trade/search?SearchText=beauty+soap
observed results: dead_page/invalid or request_error
decision: reject from automatic keyword pipeline until a known-good category URL is provided by BrightData.
```

### Final runtime selection

```text
Automatic onboarding keyword pipeline:
- walmart
- tokopedia
- amazon

Removed from endpoint registry:
- alibaba.products.collect_url
- alibaba.products.discover_category_url
- sephora.products.collect_url
- sephora.products.discover_sitemap
```

Reason:

```text
Walmart, Tokopedia, and Amazon are the active marketplace sources with a local 100-record cap.
Alibaba was removed because category/search discovery returned dead_page/request_error.
Sephora was removed because sitemap discovery kept running beyond the target window.
```

Record cap:

```text
PIPELINE_MARKETPLACE_RECORD_LIMIT=100
```

Implementation note:

```text
BrightData keyword datasets do not expose a universal "limit" input field for all platforms.
The project now enforces the 100-record limit after snapshot/download normalization, before records are converted into pipeline results/signals.
```

## Deployment Verification: Platform Limit 100

Kubernetes image deployed:

```text
consumeriq-worker-scraping -> k3d-consumeriq-registry:5000/consumeriq-backend:platform-limit-100-v2
consumeriq-api             -> k3d-consumeriq-registry:5000/consumeriq-backend:platform-limit-100-v2
```

Runtime config from `consumeriq-worker-scraping`:

```json
{
  "keyword_limit": 2,
  "max_signals": 3,
  "record_limit": 100,
  "enabled": ["tokopedia", "walmart"],
  "skip": ["amazon", "google", "google.shopping", "lazada", "tiktok", "tiktok_shop"],
  "social": false,
  "selector_electronics_id": ["tokopedia"],
  "selector_beauty_us": ["walmart"]
}
```

In-pod cap validation with 150 synthetic marketplace records:

```json
{
  "status": "success",
  "recordLimit": 100,
  "results_count": 100,
  "signal_record_count": 100,
  "first": "item-0",
  "last": "item-99"
}
```

Post-deploy runtime dry-run:

```json
{
  "status": "passed",
  "runtime_config": {
    "keyword_limit": 2,
    "total_budget_seconds": 150,
    "social_enabled": false,
    "enabled_marketplaces": ["tokopedia", "walmart"],
    "skip_marketplaces": ["amazon", "google", "google.shopping", "lazada", "tiktok", "tiktok_shop"],
    "brightdata_timeout_seconds": 45,
    "snapshot_wait_seconds": 35,
    "marketplace_record_limit": 100
  },
  "called_marketplaces": [
    {
      "marketplace": "tokopedia",
      "keyword": "smart gadget reviews",
      "timeout_seconds": "45",
      "snapshot_wait_seconds": "35",
      "record_limit": "100"
    }
  ],
  "called_social_sources": [],
  "inserted_signal_count": 3,
  "task_result": {
    "category": "Electronics & Gadgets",
    "country": "id",
    "signals_stored": 3,
    "status": "completed"
  }
}
```

API pod cap validation:

```json
{
  "status": "success",
  "recordLimit": 100,
  "results_count": 100,
  "signal_record_count": 100
}
```

API pod direct URL cap validation:

```json
{
  "status": "success",
  "recordLimit": 100,
  "signal_record_count": 100
}
```

## Follow-Up Correction: Account Token, Amazon, Alibaba, Sephora

Captured after syncing `consumeriq-api-keys` from `infra/k8s/backend/.env` and restarting the pods.

Important dataset distinction:

```text
gd_m7aof0k82r803d5bjm = BrightData ChatGPT Search dataset for extra analysis.
It is not a marketplace product dataset.

Marketplace scraping still uses marketplace-specific dataset IDs:
- Tokopedia keyword: gd_lxk24yba297r8qd3tp
- Amazon keyword: gd_l7q7dkf244hwjntr0
- Walmart keyword: gd_l95fol7l1ru6rlo116
```

Secret sync:

```text
consumeriq-api-keys was refreshed from infra/k8s/backend/.env.
consumeriq-api, consumeriq-worker-scraping, and consumeriq-worker-inference were restarted so BrightData calls use the latest token/account.
```

Removed from running API registry:

```json
{
  "removed_alibaba_sephora": [],
  "has_amazon": true,
  "has_chatgpt_dataset_env": "gd_m7aof0k82r803d5bjm"
}
```

Amazon real test:

```text
keyword: gentle radiance cleansing bar
endpoint: amazon.products.discover_keyword
dataset: gd_l7q7dkf244hwjntr0
snapshot: sd_mpqz851z1eqz9dyg26
status: ready
BrightData records: 272
BrightData collection_duration: 83,390 ms
local cap: 100 records
schema validation: valid
first title: Kojic Alpha Arbutin Turmeric Soap – Handmade Brightening Bar with Natural Botanicals – Gentle Cleanser for Soft, Radiant-Looking Skin (1 Pack)
```

Category variation selector check:

```json
[
  {"category": "Electronics & Gadgets", "country": "id", "selected": ["tokopedia"]},
  {"category": "Beauty & Personal Care", "country": "us", "selected": ["walmart"]},
  {"category": "Fashion Apparel", "country": "id", "selected": ["tokopedia"]},
  {"category": "Home Decor", "country": "us", "selected": ["walmart"]},
  {"category": "Sports Fitness", "country": "us", "selected": ["walmart"]},
  {"category": "Food Grocery", "country": "us", "selected": ["walmart"]},
  {"category": "Books", "country": "us", "selected": ["amazon"]},
  {"category": "Unknown Category", "country": "us", "selected": ["walmart"]}
]
```

Final deployed image:

```text
consumeriq-worker-scraping -> k3d-consumeriq-registry:5000/consumeriq-backend:marketplace-cleanup-amazon-100-v4
consumeriq-api             -> k3d-consumeriq-registry:5000/consumeriq-backend:marketplace-cleanup-amazon-100-v4
```

Final in-cluster dry-run:

```json
{
  "status": "passed",
  "runtime_config": {
    "keyword_limit": 2,
    "total_budget_seconds": 150,
    "social_enabled": false,
    "enabled_marketplaces": ["amazon", "tokopedia", "walmart"],
    "skip_marketplaces": ["google", "google.shopping", "lazada", "tiktok", "tiktok_shop"],
    "brightdata_timeout_seconds": 45,
    "snapshot_wait_seconds": 35,
    "marketplace_record_limit": 100
  },
  "called_marketplaces": [
    {
      "marketplace": "tokopedia",
      "keyword": "smart gadget reviews",
      "timeout_seconds": "45",
      "snapshot_wait_seconds": "35",
      "record_limit": "100"
    }
  ],
  "called_social_sources": [],
  "inserted_signal_count": 3,
  "task_result": {
    "category": "Electronics & Gadgets",
    "country": "id",
    "signals_stored": 3,
    "status": "completed"
  }
}
```


## Runtime Guard Dry Run

Captured at: 2026-05-29T12:42:09.627450Z

```json
{
  "status": "passed",
  "runtime_config": {
    "keyword_limit": 2,
    "total_budget_seconds": 150,
    "social_enabled": false,
    "enabled_marketplaces": [
      "tokopedia",
      "walmart"
    ],
    "skip_marketplaces": [
      "amazon",
      "google",
      "google.shopping",
      "lazada",
      "tiktok",
      "tiktok_shop"
    ],
    "brightdata_timeout_seconds": 45,
    "snapshot_wait_seconds": 35,
      "marketplace_record_limit": 100
  },
  "called_marketplaces": [
    {
      "marketplace": "tokopedia",
      "keyword": "smart gadget reviews",
      "timeout_seconds": "45",
      "snapshot_wait_seconds": "35",
      "record_limit": "10"
    }
  ],
  "called_social_sources": [],
  "inserted_signal_count": 3,
  "task_result": {
    "category": "Electronics & Gadgets",
    "country": "id",
    "keywords": [
      "smart gadget reviews",
      "electronics accessories online",
      "portable tech gadgets",
      "smart device marketplace",
      "gadget product alternatives",
      "tech accessories customer demand"
    ],
    "signals_stored": 3,
    "status": "completed"
  },
  "captured_worker_log": [
    "[scraping] LLM-generated keywords: ['smart gadget reviews', 'electronics accessories online', 'portable tech gadgets', 'smart device marketplace', 'gadget product alternatives', 'tech accessories customer demand']",
    "[scraping] Starting signal scrape for category=Electronics & Gadgets, country=id, keywords=['smart gadget reviews', 'electronics accessories online', 'portable tech gadgets', 'smart device marketplace', 'gadget product alternatives', 'tech accessories customer demand']",
    "[scraping] Pipeline guard total_budget=150s keyword_limit=2 max_signals=3 marketplaces=['tokopedia'] social_enabled=False",
    "[scraping] Social discovery skipped keyword=smart gadget reviews reason=PIPELINE_SOCIAL_DISCOVERY_ENABLED=false",
    "[scraping] Marketplace discovery marketplace=tokopedia keyword=smart gadget reviews",
    "[scraping] Marketplace discovery status=success marketplace=tokopedia keyword=smart gadget reviews duration=0.0s elapsed=0.0s",
    "[scraping] Done. Stored 3 signals for category=Electronics & Gadgets, country=id",
    "[scraping] Dispatched processLlmInsights task_id=mock-process-llm-insights-task"
  ]
}
```
