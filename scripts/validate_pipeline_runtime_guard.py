from __future__ import annotations

import contextlib
import io
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.redis import worker
import backend.api.marketplaceScrape as marketplace_scrape
import backend.api.socialScrape as social_scrape


marketplace_calls: list[dict[str, str]] = []
social_calls: list[dict[str, str]] = []
inserted_rows: list[tuple] = []


def fake_keywords(*_args, **_kwargs) -> list[str]:
    return [
        "smart gadget reviews",
        "electronics accessories online",
        "portable tech gadgets",
        "smart device marketplace",
        "gadget product alternatives",
        "tech accessories customer demand",
    ]


def fake_marketplace_discovery(**kwargs):
    marketplace_calls.append(
        {
            "marketplace": kwargs.get("marketplace", ""),
            "keyword": kwargs.get("keyword", ""),
            "timeout_seconds": str(kwargs.get("timeout_seconds", "")),
            "snapshot_wait_seconds": str(kwargs.get("snapshot_wait_seconds", "")),
            "record_limit": str(kwargs.get("record_limit", "")),
        }
    )
    marketplace = kwargs.get("marketplace", "marketplace")
    keyword = kwargs.get("keyword", "keyword")
    return {
        "status": "success",
        "results": [
            {
                "title": f"{marketplace} result for {keyword} #{index}",
                "description": "demo-safe mocked marketplace signal",
                "url": f"https://example.test/{marketplace}/{index}",
                "record": {
                    "title": f"{marketplace} result {index}",
                    "final_price": 12 + index,
                    "rating": 4.5,
                    "reviews_count": 100 + index,
                    "sold": 20 + index,
                },
            }
            for index in range(1, 4)
        ],
    }


def fake_social_discovery(**kwargs):
    social_calls.append(
        {
            "keyword": kwargs.get("keyword", ""),
            "timeout_seconds": str(kwargs.get("timeout_seconds", "")),
            "snapshot_wait_seconds": str(kwargs.get("snapshot_wait_seconds", "")),
        }
    )
    return {"status": "success", "serpResults": []}


class DummyCursor:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def executemany(self, _sql, rows):
        inserted_rows.extend(rows)


class DummyConnection:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return DummyCursor()


class DummyPsycopg:
    @staticmethod
    def connect(*_args, **_kwargs):
        return DummyConnection()


class DummyInferenceTask:
    id = "mock-process-llm-insights-task"


class DummyProcessLlmInsights:
    @staticmethod
    def delay(*_args, **_kwargs):
        return DummyInferenceTask()


def run_validation() -> dict:
    worker._generateScrapingKeywords = fake_keywords
    worker.createEmbedder = lambda: object()
    worker.embedTexts = lambda _embedder, texts: [[0.01] * 384 for _ in texts]
    worker.psycopg2 = DummyPsycopg
    worker._ingest_into_cognee = lambda *_args, **_kwargs: None
    worker.processLlmInsights = DummyProcessLlmInsights
    marketplace_scrape.runMarketplaceDiscovery = fake_marketplace_discovery
    social_scrape.runSocialDiscovery = fake_social_discovery

    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        result = worker.scrapeMarketSignals.run(
            category="Electronics & Gadgets",
            keywords=[],
            country="id",
            marketplace="amazon",
            product_name="Zeddin SmartGear+",
            product_description="Smart gadget for urban consumers",
            unique_selling_point="Portable smart device",
            main_features="portable, connected, easy daily use",
            competitive_advantage="simple positioning",
            pain_point="hard to compare tech gadgets online",
            customer_segment="Gen Z and Millennial tech buyers",
            price_range_min=10,
            price_range_max=30,
            form_id="",
        )

    skipped = {"lazada", "google", "google.shopping", "tiktok", "tiktok_shop"}
    called_marketplaces = {call["marketplace"].lower() for call in marketplace_calls}
    validation = {
        "status": "passed"
        if not social_calls and not (called_marketplaces & skipped) and len(marketplace_calls) <= 2
        else "failed",
        "runtime_config": {
            "keyword_limit": worker._PIPELINE_KEYWORD_LIMIT,
            "total_budget_seconds": worker._PIPELINE_TOTAL_BUDGET_SECONDS,
            "social_enabled": worker._PIPELINE_SOCIAL_DISCOVERY_ENABLED,
            "enabled_marketplaces": sorted(worker._PIPELINE_ENABLED_MARKETPLACES),
            "skip_marketplaces": sorted(worker._PIPELINE_SKIP_MARKETPLACES),
            "brightdata_timeout_seconds": worker._PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS,
            "snapshot_wait_seconds": worker._PIPELINE_SNAPSHOT_WAIT_SECONDS,
            "marketplace_record_limit": worker._PIPELINE_MARKETPLACE_RECORD_LIMIT,
        },
        "called_marketplaces": marketplace_calls,
        "called_social_sources": social_calls,
        "inserted_signal_count": len(inserted_rows),
        "task_result": result,
        "captured_worker_log": captured.getvalue().strip().splitlines(),
    }
    return validation


if __name__ == "__main__":
    validation = run_validation()
    text = json.dumps(validation, indent=2)
    print(text)

    log_path = Path("SCRAPING_RUNTIME_DEBUG_LOG.md")
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write("\n\n## Runtime Guard Dry Run\n\n")
        handle.write(f"Captured at: {datetime.utcnow().isoformat()}Z\n\n")
        handle.write("```json\n")
        handle.write(text)
        handle.write("\n```\n")
