from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
# OPENAI_BASE_URL can point to an OpenAI-compatible gateway (e.g. Bright Data AI Gateway).
OPENAI_API_URL = os.getenv("OPENAI_API_URL", f"{OPENAI_BASE_URL}/responses")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
OPENAI_EXTRA_ANALYSIS_ENABLED = (
    os.getenv("OPENAI_EXTRA_ANALYSIS_ENABLED", "true").lower() == "true"
)
OPENAI_TIMEOUT_SECONDS = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "60"))
EXTRA_ANALYSIS_SOURCE = (
    os.getenv("EXTRA_ANALYSIS_SOURCE", "gd_m7aof0k82r803d5bjm").strip().lower()
)
BRIGHTDATA_CHATGPT_DATASET_ID = os.getenv(
    "BRIGHTDATA_CHATGPT_DATASET_ID", "gd_m7aof0k82r803d5bjm"
)
BRIGHTDATA_CHATGPT_MAX_INPUTS = int(os.getenv("BRIGHTDATA_CHATGPT_MAX_INPUTS", "1"))
BRIGHTDATA_CHATGPT_SNAPSHOT_WAIT_SECONDS = int(
    os.getenv("BRIGHTDATA_CHATGPT_SNAPSHOT_WAIT_SECONDS", "600")
)


EXTRA_ANALYSIS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "agreementLevel": {
            "type": "string",
            "enum": ["agree", "partial", "disagree", "insufficient_data"],
        },
        "summary": {"type": "string"},
        "validatedFindings": {
            "type": "array",
            "items": {"type": "string"},
        },
        "missedRisks": {
            "type": "array",
            "items": {"type": "string"},
        },
        "recommendedActions": {
            "type": "array",
            "items": {"type": "string"},
        },
        "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
        },
        "notesForUser": {"type": "string"},
    },
    "required": [
        "agreementLevel",
        "summary",
        "validatedFindings",
        "missedRisks",
        "recommendedActions",
        "confidence",
        "notesForUser",
    ],
}


def _openai_api_key() -> str | None:
    return (
        os.getenv("OPENAI_API_KEY")
        or os.getenv("BRIGHTDATA_API_TOKEN")
        or os.getenv("BRIGHT_DATA_API_TOKEN")
    )


def _trim_signals(
    signals: list[dict[str, Any]], limit: int = 50
) -> list[dict[str, Any]]:
    trimmed: list[dict[str, Any]] = []
    for signal in signals[:limit]:
        trimmed.append(
            {
                "signalText": str(signal.get("signalText", ""))[:800],
                "sourceType": signal.get("sourceType"),
                "sentimentScore": signal.get("sentimentScore"),
            }
        )
    return trimmed


def _extract_output_text(response_payload: dict[str, Any]) -> str:
    output_text = response_payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    chunks: list[str] = []
    for item in response_payload.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") == "output_text":
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
    return "".join(chunks)


def _extract_dataset_record(payload: Any) -> dict[str, Any]:
    if isinstance(payload, list) and payload:
        if isinstance(payload[0], dict):
            return payload[0]
        return {}

    if not isinstance(payload, dict):
        return {}

    for key in ("results", "data", "items"):
        items = payload.get(key)
        if isinstance(items, list) and items and isinstance(items[0], dict):
            return items[0]
    return payload


def _dataset_answer_text(record: dict[str, Any]) -> str:
    for key in ("answer_text", "answer_text_markdown", "answer_text_raw"):
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def _sentences(text: str, limit: int) -> list[str]:
    parts = [
        part.strip() for part in text.replace("\n", " ").split(".") if part.strip()
    ]
    return [f"{part}." for part in parts[:limit]]


def _completed_extra_analysis_from_text(answer_text: str) -> dict[str, Any]:
    findings = _sentences(answer_text, 3)
    return {
        "status": "completed",
        "source": "gd_m7aof0k82r803d5bjm",
        "agreementLevel": "partial",
        "summary": answer_text[:900],
        "validatedFindings": findings or [answer_text[:300]],
        "missedRisks": [
            "Treat this as second-opinion context; validate claims against stored market signals before making launch decisions."
        ],
        "recommendedActions": [
            "Compare the ChatGPT answer with Bright Data marketplace and social signals.",
            "Prioritize actions that are supported by both scraped signals and the second-opinion answer.",
        ],
        "confidence": 0.65,
        "notesForUser": "Generated from Bright Data ChatGPT dataset as an extra-analysis second opinion.",
    }


def _build_dataset_prompt(category: str, country: str, insights: dict[str, Any]) -> str:
    return (
        "Cross-reference the Bright Daya market intelligence output and summarize where "
        "the model is supported or contradicted. Focus on market signals, demand, pricing, "
        "competition, and risks. Return clear, concise findings."
        f"\n\nCategory: {category}\nCountry: {country}\nInsights: {json.dumps(insights, ensure_ascii=False)}"
    )


def _synthesize_extra_analysis_from_text(
    *,
    category: str,
    country: str,
    insights: dict[str, Any],
    signals: list[dict[str, Any]],
    answer_text: str,
) -> dict[str, Any]:
    from backend.models.llm import createLlm

    review_payload = {
        "category": category,
        "country": country,
        "modelInsights": {
            "gtmIntelligence": insights.get("gtmIntelligence", {}),
            "financeIntelligence": insights.get("financeIntelligence", {}),
            "securityCompliance": insights.get("securityCompliance", {}),
        },
        "marketSignals": _trim_signals(signals),
        "chatgptAnswer": answer_text,
    }

    prompt = (
        "You are a senior market intelligence reviewer. Use the ChatGPT answer as "
        "additional external context, not as ground truth. Produce JSON only and match "
        "the schema exactly. Do not include markdown or extra commentary.\n\n"
        f"Schema: {json.dumps(EXTRA_ANALYSIS_SCHEMA, ensure_ascii=False)}\n\n"
        f"Payload: {json.dumps(review_payload, ensure_ascii=False)}"
    )

    client = createLlm()
    completion = client.create_completion(
        prompt=prompt,
        max_tokens=900,
        temperature=0.1,
    )
    text = completion.get("text") or completion.get("completion") or ""
    if (
        not text
        and isinstance(completion.get("choices"), list)
        and completion["choices"]
    ):
        first_choice = completion["choices"][0]
        if isinstance(first_choice, dict):
            text = first_choice.get("text") or ""
    if isinstance(text, list):
        text = "".join(str(chunk) for chunk in text)

    if not str(text).strip():
        return _completed_extra_analysis_from_text(answer_text)

    try:
        parsed = json.loads(str(text))
    except json.JSONDecodeError:
        return _completed_extra_analysis_from_text(answer_text)

    if not isinstance(parsed, dict):
        return _completed_extra_analysis_from_text(answer_text)

    fallback = _completed_extra_analysis_from_text(answer_text)
    for key in EXTRA_ANALYSIS_SCHEMA["required"]:
        parsed.setdefault(key, fallback[key])

    return {
        "status": "completed",
        "source": "gd_m7aof0k82r803d5bjm",
        "model": completion.get("model"),
        **parsed,
    }


def _generate_dashboard_data(
    category: str,
    country: str,
    insights: dict[str, Any],
    signals: list[dict[str, Any]],
) -> dict[str, Any]:
    api_key = _openai_api_key()
    if not api_key:
        return {}

    _MARKETPLACE_SOURCES = {
        "amazon",
        "walmart",
        "etsy",
        "lazada",
        "tokopedia",
        "google.shopping",
        "shopee",
    }
    product_brief = ""
    marketplace_lines: list[str] = []
    social_lines: list[str] = []
    other_lines: list[str] = []

    for s in signals:
        text = (s.get("signalText") or "").strip()
        if not text:
            continue
        src = (s.get("sourceType") or "").lower()
        if src == "product_brief":
            product_brief = text
        elif src in _MARKETPLACE_SOURCES:
            marketplace_lines.append(f"[{src}] {text[:700]}")
        elif src in ("social", "tiktok", "instagram", "reddit", "twitter"):
            social_lines.append(f"[{src}] {text[:500]}")
        elif src == "pipeline_fallback":
            if not product_brief:
                product_brief = text
        else:
            other_lines.append(f"[{src}] {text[:400]}")

    signal_block = "\n".join(
        marketplace_lines[:25] + social_lines[:15] + other_lines[:5]
    )

    extracted = insights.get("extractedData", {})
    gtm = json.dumps(insights.get("gtmIntelligence", {}), ensure_ascii=False)
    finance = json.dumps(insights.get("financeIntelligence", {}), ensure_ascii=False)

    system_msg = (
        "You are a senior market intelligence analyst generating a structured dashboard for a founder. "
        "Ground every specific number — prices, ratings, review counts, sales figures, brand names — "
        "in the scraped signals provided. If a data point appears in the signals, use it exactly. "
        "If a data point is not in the signals, derive a realistic estimate from category and country context. "
        "Never invent brand names not found in the signals. "
        "Return ONLY a valid JSON object. No markdown, no code blocks, no commentary."
    )

    prompt = (
        f"Generate complete market dashboard data for a founder in the {category} category launching in {country}.\n\n"
        f'PRODUCT CONTEXT:\n{product_brief or f"Category: {category}, Country: {country}"}\n\n'
        "LOCAL MODEL ANALYSIS (pre-processed intelligence — use as supporting context):\n"
        f"GTM Intelligence: {gtm}\n"
        f"Finance Intelligence: {finance}\n"
        f'Extracted Competitors from Signals: {json.dumps(extracted.get("competitors", []), ensure_ascii=False)}\n'
        f'Extracted Price Range: {json.dumps(extracted.get("priceRange", {}), ensure_ascii=False)}\n'
        f'Top Products Seen: {json.dumps(extracted.get("topProducts", []), ensure_ascii=False)}\n\n'
        f"LIVE SCRAPED MARKET SIGNALS (primary source — ground your analysis here):\n"
        f'{signal_block or "(no live signals — use product context and category knowledge)"}\n\n'
        "---\n\n"
        "Return a JSON object with exactly these 4 top-level keys: marketOverview, demandPulse, competitorMirror, launchCompass\n\n"
        "marketOverview schema:\n"
        '{"trendVelocity":"string e.g. +67%","trendVelocityStatus":"context e.g. +12% vs last month","estimatedDemand":"string e.g. 12.4K","priceTarget":"string e.g. $19","marketGaps":integer,'
        '"topSkus":[{"name":"str","tag":"str e.g. Amazon Hero SKU","price":"$X.XX","stock":"str e.g. 82% or In Stock","momentum":"str e.g. +12.4%"}],'
        '"regionDemand":[{"city":"str","percentage":float}],'
        '"whitespaceBrands":[{"brand":"str (real brand name from signals)","priceTier":"budget|mid|premium","claimLevel":"low|medium|high"}],'
        '"whitespaceZones":[{"label":"short positioning gap e.g. Premium · fragrance-free","priceTier":"budget|mid|premium","claimLevel":"low|medium|high"}]}\n\n'
        "demandPulse schema:\n"
        '{"demandSupply":{"points":[{"product":"str","demand":0-100,"saturation":0-100}],"insights":[{"label":"str","formula":"str","tone":"opportunity|danger|muted|default"}]},'
        '"marketplaceShare":[{"name":"str","value":0-100,"change":number}],'
        '"searchIntent":{"groups":[{"tone":"commercial|informational|transactional","label":"str"}],"keywords":[{"keyword":"str","volume":number,"change":number,"tone":"commercial|informational|transactional"}]},'
        '"priceTierMovement":[{"name":"str","range":"str","value":number,"change":number,"tone":"opportunity|danger|muted|default"}],'
        '"claimTrends":{"rising":[{"name":"str","change":number,"volume":"str","saturation":"str"}],"falling":[{"name":"str","change":number,"volume":"str","saturation":"str"}]},'
        '"advisor":{"recommendation":"str","signals":[{"label":"str","value":"str","detail":"str","icon":"up|down|trend|target","tone":"positive|negative|neutral"}]}}\n\n'
        "competitorMirror schema:\n"
        '{"competitors":[{"brand":"str","sku":"str","avgPrice":"$X.XX","priceDelta":"str e.g. -2.1%","promoIntensity":"Low|Medium|High|Very High","promoLevel":"low|medium|high|very-high","monthlySales":"str e.g. 45.2K","salesDelta":"str e.g. +5.4%","rating":"str e.g. 4.7","reviews":"str e.g. 94K"}],'
        '"pricingTiers":[{"label":"$X-$Y","note":"str","demand":"str e.g. 23% demand","percentage":number,"type":"saturated|sweet-spot|premium"}],'
        '"advisorRecommendation":"str","advisorSignals":[{"label":"str","value":"str"}]}\n\n'
        "launchCompass schema:\n"
        '{"seasonality":[{"id":"jan","month":"J","index":number,"status":"peak|normal|avoid"},{"id":"feb","month":"F",...},...],'
        '"citySales":[{"city":"str","sales":"str","growth":"str","channels":"str","rating":"str","searchDemand":"str","personaFit":"str","gdpPerCapita":"str","signal":"Best first city|High intent|Expansion pocket|Low competition"}],'
        '"readinessCountries":[{"country":"str (full country name)","countryId":"ISO 3166-1 numeric e.g. 840 for USA, 124 Canada, 360 Indonesia, 826 UK, 276 Germany, 392 Japan, 036 Australia, 702 Singapore, 156 China, 356 India","readinessScore":0-100,"demandIndex":0-200,"competitorPressure":0-100,"personaFit":0-100,"primaryChannel":"str","signal":"Best first market|High intent|Expansion pocket|Premium test market|Watchlist|Needs validation"}],'
        '"advisorRecommendation":"str","advisorSignals":[{"label":"str","value":"str"}]}\n\n'
        "Constraints:\n"
        "- seasonality: exactly 12 entries jan through dec, in order\n"
        "- topSkus: 3-5 entries, use real product names from signals where available\n"
        f"- competitors: 3-5 entries, use real brand names from signals where available\n"
        f"- regionDemand: 3-5 cities relevant to {country}\n"
        f"- citySales: 3-4 cities relevant to {country}\n"
        "- whitespaceBrands: 8-14 entries using real brand names from signals/competitors, varied across priceTier x claimLevel\n"
        "- whitespaceZones: 2-3 underserved (priceTier, claimLevel) combinations not crowded by whitespaceBrands\n"
        "- readinessCountries: 6-8 entries spanning multiple continents; one country must clearly lead by demandIndex (the demand winner); a different country should lead by opportunityScore-implying mix (high persona fit + lower competitor pressure) as the expansion recommendation\n"
        "- demandSupply.points: 3-6 entries\n"
        f"- All values must be realistic for the {category} category in {country}"
    )

    try:
        response = httpx.post(
            f"{OPENAI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 6000,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=max(OPENAI_TIMEOUT_SECONDS, 120),
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception as exc:
        print(f"[openai] Dashboard data generation failed: {exc}")
        return {}


def create_extra_analysis(
    *,
    category: str,
    country: str,
    insights: dict[str, Any],
    signals: list[dict[str, Any]],
) -> dict[str, Any]:
    if not OPENAI_EXTRA_ANALYSIS_ENABLED:
        return {"status": "skipped", "reason": "OPENAI_EXTRA_ANALYSIS_ENABLED=false"}

    api_key = _openai_api_key()
    if not api_key:
        return {"status": "skipped", "reason": "OPENAI_API_KEY is not configured"}

    if EXTRA_ANALYSIS_SOURCE == "gd_m7aof0k82r803d5bjm":
        from backend.brightdata.client import (
            resolve_snapshot_if_needed,
            scrape_brightdata,
        )

        prompt = _build_dataset_prompt(category, country, insights)
        inputs = [
            {
                "url": "https://chatgpt.com/",
                "prompt": prompt,
                "country": country or "",
                "web_search": False,
                "additional_prompt": "",
            }
        ][: max(BRIGHTDATA_CHATGPT_MAX_INPUTS, 1)]

        result = scrape_brightdata(
            dataset_id=BRIGHTDATA_CHATGPT_DATASET_ID,
            dataset_key=None,
            input_records=inputs,
            notify=False,
            include_errors=True,
            timeout_seconds=int(OPENAI_TIMEOUT_SECONDS),
        )
        result = resolve_snapshot_if_needed(
            result,
            max_wait_seconds=BRIGHTDATA_CHATGPT_SNAPSHOT_WAIT_SECONDS,
            timeout_seconds=max(int(OPENAI_TIMEOUT_SECONDS), 120),
        )

        if result.get("status") != "success":
            return {
                "status": "failed",
                "source": "gd_m7aof0k82r803d5bjm",
                "reason": result.get("error") or result.get("status"),
                "snapshotId": result.get("snapshotId"),
            }

        record = _extract_dataset_record(result.get("records"))
        answer_text = _dataset_answer_text(record)
        if not answer_text:
            return {
                "status": "failed",
                "source": "gd_m7aof0k82r803d5bjm",
                "reason": "dataset response missing answer_text",
            }

        result = _synthesize_extra_analysis_from_text(
            category=category,
            country=country,
            insights=insights,
            signals=signals,
            answer_text=answer_text,
        )
        result["dashboardData"] = _generate_dashboard_data(
            category, country, insights, signals
        )
        return result

    review_payload = {
        "category": category,
        "country": country,
        "modelInsights": {
            "gtmIntelligence": insights.get("gtmIntelligence", {}),
            "financeIntelligence": insights.get("financeIntelligence", {}),
            "securityCompliance": insights.get("securityCompliance", {}),
        },
        "marketSignals": _trim_signals(signals),
    }

    prompt = (
        "Cross-reference the internal Bright Daya market intelligence output against "
        "the supporting market signals. Treat the internal output as a draft, not as "
        "ground truth. Identify where it is supported, where it is weak, and what "
        "extra analysis should be shown to a founder. Do not invent facts outside "
        "the supplied data; mark uncertainty explicitly.\n\n"
        f"Payload:\n{json.dumps(review_payload, ensure_ascii=False)}"
    )

    response = httpx.post(
        OPENAI_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": OPENAI_MODEL,
            "instructions": (
                "You are a senior market intelligence reviewer. Return only structured "
                "JSON that matches the requested schema."
            ),
            "input": prompt,
            "max_output_tokens": 1200,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "bright_daya_extra_analysis",
                    "strict": True,
                    "schema": EXTRA_ANALYSIS_SCHEMA,
                }
            },
        },
        timeout=OPENAI_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    payload = response.json()
    output_text = _extract_output_text(payload)
    parsed = json.loads(output_text)

    return {
        "status": "completed",
        "source": "openai",
        "model": payload.get("model", OPENAI_MODEL),
        **parsed,
        "dashboardData": _generate_dashboard_data(category, country, insights, signals),
    }
