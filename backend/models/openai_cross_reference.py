from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

OPENAI_BASE_URL = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
# OPENAI_BASE_URL can point to an OpenAI-compatible gateway (e.g. Bright Data AI Gateway).
OPENAI_API_URL = os.getenv('OPENAI_API_URL', f'{OPENAI_BASE_URL}/responses')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.4-mini')
OPENAI_EXTRA_ANALYSIS_ENABLED = os.getenv('OPENAI_EXTRA_ANALYSIS_ENABLED', 'true').lower() == 'true'
OPENAI_TIMEOUT_SECONDS = float(os.getenv('OPENAI_TIMEOUT_SECONDS', '60'))
EXTRA_ANALYSIS_SOURCE = os.getenv('EXTRA_ANALYSIS_SOURCE', 'brightdata_chatgpt_dataset').strip().lower()
BRIGHTDATA_CHATGPT_DATASET_ID = os.getenv('BRIGHTDATA_CHATGPT_DATASET_ID', 'gd_m7aof0k82r803d5bjm')
BRIGHTDATA_CHATGPT_MAX_INPUTS = int(os.getenv('BRIGHTDATA_CHATGPT_MAX_INPUTS', '1'))
BRIGHTDATA_CHATGPT_SNAPSHOT_WAIT_SECONDS = int(os.getenv('BRIGHTDATA_CHATGPT_SNAPSHOT_WAIT_SECONDS', '600'))


EXTRA_ANALYSIS_SCHEMA: dict[str, Any] = {
    'type': 'object',
    'additionalProperties': False,
    'properties': {
        'agreementLevel': {
            'type': 'string',
            'enum': ['agree', 'partial', 'disagree', 'insufficient_data'],
        },
        'summary': {'type': 'string'},
        'validatedFindings': {
            'type': 'array',
            'items': {'type': 'string'},
        },
        'missedRisks': {
            'type': 'array',
            'items': {'type': 'string'},
        },
        'recommendedActions': {
            'type': 'array',
            'items': {'type': 'string'},
        },
        'confidence': {
            'type': 'number',
            'minimum': 0,
            'maximum': 1,
        },
        'notesForUser': {'type': 'string'},
    },
    'required': [
        'agreementLevel',
        'summary',
        'validatedFindings',
        'missedRisks',
        'recommendedActions',
        'confidence',
        'notesForUser',
    ],
}


def _openai_api_key() -> str | None:
    return (
        os.getenv('OPENAI_API_KEY')
        or os.getenv('BRIGHTDATA_API_TOKEN')
        or os.getenv('BRIGHT_DATA_API_TOKEN')
    )


def _trim_signals(signals: list[dict[str, Any]], limit: int = 20) -> list[dict[str, Any]]:
    trimmed: list[dict[str, Any]] = []
    for signal in signals[:limit]:
        trimmed.append(
            {
                'signalText': str(signal.get('signalText', ''))[:500],
                'sourceType': signal.get('sourceType'),
                'sentimentScore': signal.get('sentimentScore'),
            }
        )
    return trimmed


def _extract_output_text(response_payload: dict[str, Any]) -> str:
    output_text = response_payload.get('output_text')
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    chunks: list[str] = []
    for item in response_payload.get('output', []):
        if not isinstance(item, dict):
            continue
        for content in item.get('content', []):
            if isinstance(content, dict) and content.get('type') == 'output_text':
                text = content.get('text')
                if isinstance(text, str):
                    chunks.append(text)
    return ''.join(chunks)


def _extract_dataset_record(payload: Any) -> dict[str, Any]:
    if isinstance(payload, list) and payload:
        if isinstance(payload[0], dict):
            return payload[0]
        return {}

    if not isinstance(payload, dict):
        return {}

    for key in ('results', 'data', 'items'):
        items = payload.get(key)
        if isinstance(items, list) and items:
            if isinstance(items[0], dict):
                return items[0]
    return payload


def _dataset_answer_text(record: dict[str, Any]) -> str:
    for key in ('answer_text', 'answer_text_markdown', 'answer_text_raw'):
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ''


def _sentences(text: str, limit: int) -> list[str]:
    parts = [part.strip() for part in text.replace('\n', ' ').split('.') if part.strip()]
    return [f'{part}.' for part in parts[:limit]]


def _completed_extra_analysis_from_text(answer_text: str) -> dict[str, Any]:
    findings = _sentences(answer_text, 3)
    return {
        'status': 'completed',
        'source': 'brightdata_chatgpt_dataset',
        'agreementLevel': 'partial',
        'summary': answer_text[:900],
        'validatedFindings': findings or [answer_text[:300]],
        'missedRisks': [
            'Treat this as second-opinion context; validate claims against stored market signals before making launch decisions.'
        ],
        'recommendedActions': [
            'Compare the ChatGPT answer with Bright Data marketplace and social signals.',
            'Prioritize actions that are supported by both scraped signals and the second-opinion answer.',
        ],
        'confidence': 0.65,
        'notesForUser': 'Generated from Bright Data ChatGPT dataset as an extra-analysis second opinion.',
    }


def _build_dataset_prompt(category: str, country: str, insights: dict[str, Any]) -> str:
    return (
        'Cross-reference the Bright Daya market intelligence output and summarize where '
        'the model is supported or contradicted. Focus on market signals, demand, pricing, '
        'competition, and risks. Return clear, concise findings.'
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
        'category': category,
        'country': country,
        'modelInsights': {
            'gtmIntelligence': insights.get('gtmIntelligence', {}),
            'financeIntelligence': insights.get('financeIntelligence', {}),
            'securityCompliance': insights.get('securityCompliance', {}),
        },
        'marketSignals': _trim_signals(signals),
        'chatgptAnswer': answer_text,
    }

    prompt = (
        'You are a senior market intelligence reviewer. Use the ChatGPT answer as '
        'additional external context, not as ground truth. Produce JSON only and match '
        'the schema exactly. Do not include markdown or extra commentary.\n\n'
        f'Schema: {json.dumps(EXTRA_ANALYSIS_SCHEMA, ensure_ascii=False)}\n\n'
        f'Payload: {json.dumps(review_payload, ensure_ascii=False)}'
    )

    client = createLlm()
    completion = client.create_completion(
        prompt=prompt,
        max_tokens=900,
        temperature=0.1,
    )
    text = completion.get('text') or completion.get('completion') or ''
    if not text and isinstance(completion.get('choices'), list) and completion['choices']:
        first_choice = completion['choices'][0]
        if isinstance(first_choice, dict):
            text = first_choice.get('text') or ''
    if isinstance(text, list):
        text = ''.join(str(chunk) for chunk in text)

    if not str(text).strip():
        return _completed_extra_analysis_from_text(answer_text)

    try:
        parsed = json.loads(str(text))
    except json.JSONDecodeError:
        return _completed_extra_analysis_from_text(answer_text)

    if not isinstance(parsed, dict):
        return _completed_extra_analysis_from_text(answer_text)

    fallback = _completed_extra_analysis_from_text(answer_text)
    for key in EXTRA_ANALYSIS_SCHEMA['required']:
        parsed.setdefault(key, fallback[key])

    return {
        'status': 'completed',
        'source': 'brightdata_chatgpt_dataset',
        'model': completion.get('model'),
        **parsed,
    }


def create_extra_analysis(
    *,
    category: str,
    country: str,
    insights: dict[str, Any],
    signals: list[dict[str, Any]],
) -> dict[str, Any]:
    if not OPENAI_EXTRA_ANALYSIS_ENABLED:
        return {'status': 'skipped', 'reason': 'OPENAI_EXTRA_ANALYSIS_ENABLED=false'}

    api_key = _openai_api_key()
    if not api_key:
        return {'status': 'skipped', 'reason': 'OPENAI_API_KEY is not configured'}

    if EXTRA_ANALYSIS_SOURCE == 'brightdata_chatgpt_dataset':
        from backend.brightdata.client import resolve_snapshot_if_needed, scrape_brightdata

        prompt = _build_dataset_prompt(category, country, insights)
        inputs = [
            {
                'url': 'https://chatgpt.com/',
                'prompt': prompt,
                'country': country or '',
                'web_search': False,
                'additional_prompt': '',
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

        if result.get('status') != 'success':
            return {
                'status': 'failed',
                'source': 'brightdata_chatgpt_dataset',
                'reason': result.get('error') or result.get('status'),
                'snapshotId': result.get('snapshotId'),
            }

        record = _extract_dataset_record(result.get('records'))
        answer_text = _dataset_answer_text(record)
        if not answer_text:
            return {
                'status': 'failed',
                'source': 'brightdata_chatgpt_dataset',
                'reason': 'dataset response missing answer_text',
            }

        return _synthesize_extra_analysis_from_text(
            category=category,
            country=country,
            insights=insights,
            signals=signals,
            answer_text=answer_text,
        )

    review_payload = {
        'category': category,
        'country': country,
        'modelInsights': {
            'gtmIntelligence': insights.get('gtmIntelligence', {}),
            'financeIntelligence': insights.get('financeIntelligence', {}),
            'securityCompliance': insights.get('securityCompliance', {}),
        },
        'marketSignals': _trim_signals(signals),
    }

    prompt = (
        'Cross-reference the internal Bright Daya market intelligence output against '
        'the supporting market signals. Treat the internal output as a draft, not as '
        'ground truth. Identify where it is supported, where it is weak, and what '
        'extra analysis should be shown to a founder. Do not invent facts outside '
        'the supplied data; mark uncertainty explicitly.\n\n'
        f'Payload:\n{json.dumps(review_payload, ensure_ascii=False)}'
    )

    response = httpx.post(
        OPENAI_API_URL,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': OPENAI_MODEL,
            'instructions': (
                'You are a senior market intelligence reviewer. Return only structured '
                'JSON that matches the requested schema.'
            ),
            'input': prompt,
            'max_output_tokens': 1200,
            'text': {
                'format': {
                    'type': 'json_schema',
                    'name': 'bright_daya_extra_analysis',
                    'strict': True,
                    'schema': EXTRA_ANALYSIS_SCHEMA,
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
        'status': 'completed',
        'source': 'openai',
        'model': payload.get('model', OPENAI_MODEL),
        **parsed,
    }
