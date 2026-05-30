import gc
import json
import os
import time
from datetime import datetime, timezone
from html import escape
from typing import Any
from urllib.parse import urlencode
import psycopg2
import requests
from celery import Celery
from kombu import Queue
from backend.models.embeddings import createEmbedder, embedTexts
from backend.models.llm import createLlm
from backend.models.translator import translateTextsIfNeeded


def _intEnv(name: str, default: int) -> int:
    value = os.getenv(name, '').strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default

REDIS_URL = os.getenv('REDIS_URL', 'redis://redis.consumeriq.svc.cluster.local:6379/0')
APP_PUBLIC_URL = os.getenv('APP_PUBLIC_URL', 'http://localhost:30080').rstrip('/')
MAILERSEND_API_KEY = os.getenv('MAILERSEND_API_KEY', '').strip()
MAILERSEND_API_BASE_URL = os.getenv('MAILERSEND_API_BASE_URL', 'https://api.mailersend.com/v1').rstrip('/')
MAILERSEND_FROM_EMAIL = os.getenv('MAILERSEND_FROM_EMAIL', '').strip()
MAILERSEND_FROM_NAME = os.getenv('MAILERSEND_FROM_NAME', 'ConsumerIQ').strip()
DASHBOARD_SESSION_TTL_SECONDS = _intEnv('DASHBOARD_SESSION_TTL_SECONDS', 7 * 24 * 60 * 60)

CATEGORY_MARKETPLACES: dict[str, list[str]] = {
    'fashion': ['amazon', 'tokopedia'],
    'apparel': ['amazon', 'tokopedia'],
    'clothing': ['amazon', 'tokopedia'],
    'beauty': ['amazon', 'walmart'],
    'skincare': ['amazon', 'walmart'],
    'cosmetics': ['amazon', 'walmart'],
    'makeup': ['amazon', 'walmart'],
    'electronics': ['amazon', 'walmart', 'tokopedia'],
    'tech': ['amazon', 'walmart', 'tokopedia'],
    'gadgets': ['amazon', 'walmart', 'tokopedia'],
    'phone': ['amazon', 'walmart', 'tokopedia'],
    'laptop': ['amazon', 'walmart'],
    'home': ['amazon', 'walmart'],
    'furniture': ['amazon', 'walmart'],
    'kitchen': ['amazon', 'walmart'],
    'decor': ['amazon', 'walmart'],
    'handmade': ['amazon'],
    'craft': ['amazon'],
    'art': ['amazon'],
    'jewelry': ['amazon', 'walmart'],
    'accessories': ['amazon', 'tokopedia'],
    'bags': ['amazon', 'tokopedia'],
    'shoes': ['amazon', 'tokopedia'],
    'sports': ['amazon', 'walmart'],
    'fitness': ['amazon', 'walmart'],
    'outdoor': ['amazon', 'walmart'],
    'camping': ['amazon', 'walmart'],
    'toys': ['amazon', 'walmart'],
    'games': ['amazon', 'walmart'],
    'baby': ['amazon', 'walmart'],
    'grocery': ['amazon', 'walmart'],
    'food': ['amazon', 'walmart'],
    'health': ['amazon', 'walmart'],
    'supplements': ['amazon', 'walmart'],
    'pet': ['amazon', 'walmart'],
    'automotive': ['amazon', 'walmart'],
    'tools': ['amazon', 'walmart'],
    'books': ['amazon'],
    'stationery': ['amazon'],
}

_DEFAULT_MARKETPLACES = ['amazon', 'walmart']
_PIPELINE_KEYWORD_LIMIT = int(os.getenv('PIPELINE_KEYWORD_LIMIT', '6'))
_PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS = int(os.getenv('PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS', '180'))
_PIPELINE_SNAPSHOT_WAIT_SECONDS = int(os.getenv('PIPELINE_SNAPSHOT_WAIT_SECONDS', '600'))
_PIPELINE_MAX_SIGNALS = int(os.getenv('PIPELINE_MAX_SIGNALS', '50'))
_PIPELINE_MARKETPLACE_RECORD_LIMIT = int(os.getenv('PIPELINE_MARKETPLACE_RECORD_LIMIT', '100'))
_PIPELINE_ENABLED_MARKETPLACES = {
    item.strip().lower()
    for item in os.getenv(
        'PIPELINE_ENABLED_MARKETPLACES', 'amazon,tokopedia,walmart'
    ).split(',')
    if item.strip()
}
_PIPELINE_SKIP_MARKETPLACES = {
    item.strip().lower()
    for item in os.getenv(
        'PIPELINE_SKIP_MARKETPLACES',
        'google,google.shopping,lazada,tiktok,tiktok_shop,etsy',
    ).split(',')
    if item.strip()
}
_PIPELINE_SOCIAL_ENABLED = (
    os.getenv('PIPELINE_SOCIAL_ENABLED', 'false').lower() == 'true'
)
_PIPELINE_TWITTER_ENABLED = (
    os.getenv('PIPELINE_TWITTER_ENABLED', 'true').lower() == 'true'
)
_PIPELINE_TWITTER_RESULTS_PER_KEYWORD = int(
    os.getenv('PIPELINE_TWITTER_RESULTS_PER_KEYWORD', '2')
)
_PIPELINE_ALLOW_FALLBACK_SIGNALS = os.getenv('PIPELINE_ALLOW_FALLBACK_SIGNALS', 'true').lower() == 'true'
_PIPELINE_TOTAL_BUDGET_SECONDS = int(os.getenv('PIPELINE_TOTAL_BUDGET_SECONDS', '600'))
_PIPELINE_MAX_MARKETPLACES_PER_KEYWORD = int(
    os.getenv('PIPELINE_MAX_MARKETPLACES_PER_KEYWORD', '2')
)


def _runTwitterSerpDiscovery(keyword: str, country: str, limit: int) -> dict[str, Any]:
    if not os.getenv('SCRAPINGBEE_API_KEY'):
        return {'status': 'skipped', 'reason': 'SCRAPINGBEE_API_KEY not set'}
    try:
        from backend.api.scrapingbeeClient import normalizeSerpResults, searchGoogle
        data, error = searchGoogle(
            query=f'site:x.com OR site:twitter.com {keyword}',
            country_code=country or 'us',
            language='en',
            nb_results=max(limit, 3),
        )
        if error:
            return {'status': 'failed', 'error': error}
        results = normalizeSerpResults(data or {})
        twitter_only = [
            r for r in results if r.get('source') == 'twitter'
        ][:limit]
        return {'status': 'success', 'serpResults': twitter_only}
    except Exception as exc:
        return {'status': 'failed', 'error': str(exc)}
_DAILY_REFRESH_ENABLED = os.getenv('DAILY_REFRESH_ENABLED', 'false').lower() == 'true'
_COMPLIANCE_SCRAPE_ENABLED = os.getenv('COMPLIANCE_SCRAPE_ENABLED', 'false').lower() == 'true'
_SIGNAL_RECENCY_WEIGHT = float(os.getenv('SIGNAL_RECENCY_WEIGHT', '0.005'))
_COGNEE_ENABLED = os.getenv('COGNEE_ENABLED', 'false').lower() == 'true'


def _pipelineTimeExceeded(started_at: float) -> bool:
    return _PIPELINE_TOTAL_BUDGET_SECONDS > 0 and (time.monotonic() - started_at) >= _PIPELINE_TOTAL_BUDGET_SECONDS


def _pipelineElapsed(started_at: float) -> str:
    return f'{time.monotonic() - started_at:.1f}s'


def _selectPipelineMarketplaces(category: str, country: str) -> list[str]:
    category_lower = category.lower()
    candidates = CATEGORY_MARKETPLACES.get(category_lower)
    if candidates is None:
        for key, values in CATEGORY_MARKETPLACES.items():
            if key in category_lower:
                candidates = values
                break
    if candidates is None:
        candidates = _DEFAULT_MARKETPLACES

    selected = []
    for marketplace in candidates:
        normalized = marketplace.lower()
        if normalized in _PIPELINE_SKIP_MARKETPLACES:
            continue
        if _PIPELINE_ENABLED_MARKETPLACES and normalized not in _PIPELINE_ENABLED_MARKETPLACES:
            continue
        selected.append(marketplace)

    country_lower = (country or '').lower()
    if country_lower == 'id' and 'tokopedia' in [item.lower() for item in selected]:
        selected.sort(key=lambda item: 0 if item.lower() == 'tokopedia' else 1)
    elif country_lower in {'us', 'usa', 'united states'} and 'walmart' in [item.lower() for item in selected]:
        selected.sort(key=lambda item: 0 if item.lower() == 'walmart' else 1)

    return selected[: max(1, _PIPELINE_MAX_MARKETPLACES_PER_KEYWORD)]


def _ingest_into_cognee(category: str, country: str, rows: list, tag: str = 'market') -> None:
    if not _COGNEE_ENABLED or not rows:
        return
    try:
        signal_dicts = [
            {'signalText': r[0], 'sourceType': r[1], 'sourceUrl': r[2]}
            for r in rows
        ]
        ingestSignalsIntoMemory.delay(category, country, signal_dicts, tag)
    except Exception as exc:
        print(f'[cognee] Dispatch failed: {exc}')
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://consumeriq:consumeriq@postgres.consumeriq.svc.cluster.local:5432/consumeriq',
)

celeryApp = Celery(
    'consumeriq_worker',
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celeryApp.conf.update(
    task_queues=(
        Queue('inference'),
        Queue('synthesis'),
        Queue('scraping'),
    ),
    task_default_queue='inference',
    task_routes={
        'runAgentTask': {'queue': 'inference'},
        'runPersonaDecodeTask': {'queue': 'inference'},
        'processLlmInsights': {'queue': 'synthesis'},
        'scrapeMarketSignals': {'queue': 'scraping'},
        'refreshUserMarketSignals': {'queue': 'scraping'},
        'scrapeComplianceSignals': {'queue': 'scraping'},
        'ingestSignalsIntoMemory': {'queue': 'synthesis'},
        'ingestDashboardIntoMemory': {'queue': 'synthesis'},
        'scrapeMarketplacePage': {'queue': 'scraping'},
        'scrapeMarketplacePageBatch': {'queue': 'scraping'},
        'scrapeMarketplaceDiscovery': {'queue': 'scraping'},
        'scrapeSocialPage': {'queue': 'scraping'},
        'scrapeSocialDiscovery': {'queue': 'scraping'},
    },
)


def _formatVector(values: list[float]) -> str:
    return '[' + ','.join(f'{value:.6f}' for value in values) + ']'


def _recordFallbackText(record: dict[str, Any]) -> str:
    compact = {
        key: value
        for key, value in record.items()
        if key
        in {
            'title',
            'product_name',
            'name',
            'description',
            'url',
            'post_url',
            'rating',
            'reviews_count',
            'final_price',
            'sold',
            'play_count',
            'digg_count',
            'comment_count',
        }
        and value not in (None, '', [], {})
    }
    return json.dumps(compact or record, ensure_ascii=False, default=str)[:1000]


def _fetchRelevantSignals(categoryName: str, country: str = '', *, limit: int = 50) -> list[dict[str, Any]]:
    embedder = createEmbedder()
    try:
        queryVector = embedTexts(embedder, [categoryName])[0]
    finally:
        del embedder
        gc.collect()

    vectorLiteral = _formatVector(queryVector)

    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            if country:
                cursor.execute(
                    f'''
                    SELECT signalText, sourceType, sourceUrl, sentimentScore
                    FROM marketSignals
                    WHERE embedding IS NOT NULL AND (country = %s OR country IS NULL)
                    ORDER BY (embedding <-> %s::vector) + COALESCE(CURRENT_DATE - signalDate, 0) * {_SIGNAL_RECENCY_WEIGHT}
                    LIMIT %s
                    ''',
                    (country, vectorLiteral, limit),
                )
            else:
                cursor.execute(
                    f'''
                    SELECT signalText, sourceType, sourceUrl, sentimentScore
                    FROM marketSignals
                    WHERE embedding IS NOT NULL
                    ORDER BY (embedding <-> %s::vector) + COALESCE(CURRENT_DATE - signalDate, 0) * {_SIGNAL_RECENCY_WEIGHT}
                    LIMIT %s
                    ''',
                    (vectorLiteral, limit),
                )
            rows = cursor.fetchall()

    signals: list[dict[str, Any]] = []
    for signalText, sourceType, sourceUrl, sentimentScore in rows:
        signals.append(
            {
                'signalText': signalText,
                'sourceType': sourceType,
                'sourceUrl': sourceUrl,
                'sentimentScore': float(sentimentScore) if sentimentScore is not None else None,
            }
        )

    return signals


def _translateSignalsIfNeeded(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    texts = [signal['signalText'] for signal in signals]
    translated = translateTextsIfNeeded(texts)

    for index, signal in enumerate(signals):
        signal['signalText'] = translated[index]

    return signals


def _buildPrompt(categoryName: str, signals: list[dict[str, Any]]) -> str:
    if not signals:
        return (
            'You are a market intelligence analyst. Return only JSON.\n\n'
            f'Category: {categoryName}\n\n'
            'Signals:\n- No signals available.\n\n'
            'JSON:'
        )

    contextLines: list[str] = []
    for signal in signals:
        signalText = signal['signalText']
        line = f'- {signalText}'
        meta: list[str] = []
        sourceType = signal.get('sourceType')
        sentimentScore = signal.get('sentimentScore')
        if sourceType:
            meta.append(f'src:{sourceType}')
        if sentimentScore is not None:
            meta.append(f'sent:{sentimentScore:.2f}')
        if meta:
            line = f'{line} [{", ".join(meta)}]'
        contextLines.append(line)

    context = '\n'.join(contextLines)

    return (
        'You are a market intelligence analyst. Analyze the signals and return ONLY JSON with exactly these keys: '
        'gtmIntelligence, financeIntelligence, securityCompliance, extractedData.\n\n'
        'extractedData must contain: {"competitors":[{"name":"str","price":"str","rating":"str","reviews":"str","sales":"str"}],'
        '"priceRange":{"min":"str","max":"str","avg":"str"},'
        '"topProducts":["str"],"geographicSignals":["str"]}\n\n'
        f'Category: {categoryName}\n\n'
        f'Signals:\n{context}\n\n'
        'Extract real product names, prices, ratings, review counts from the signals. JSON:'
    )


def _parseInsights(rawText: str) -> dict[str, Any]:
    trimmed = rawText.strip()
    start = trimmed.find('{')
    end = trimmed.rfind('}')
    if start != -1 and end != -1:
        trimmed = trimmed[start : end + 1]

    try:
        parsed = json.loads(trimmed)
    except json.JSONDecodeError:
        return {'rawOutput': rawText}

    if isinstance(parsed, dict):
        return parsed

    return {'rawOutput': rawText}


def _runLlmInsights(categoryName: str, signals: list[dict[str, Any]]) -> dict[str, Any]:
    prompt = _buildPrompt(categoryName, signals)
    llm = createLlm()
    try:
        response = llm.create_completion(
            prompt=prompt,
            max_tokens=900,
            temperature=0.2,
            stop=['\n\n'],
        )
        rawText = response['choices'][0]['text']
    finally:
        del llm
        gc.collect()

    parsed = _parseInsights(rawText)

    return {
        'category': categoryName,
        'status': 'completed',
        'gtmIntelligence': parsed.get('gtmIntelligence', {}),
        'financeIntelligence': parsed.get('financeIntelligence', {}),
        'securityCompliance': parsed.get('securityCompliance', {}),
        'extractedData': parsed.get('extractedData', {}),
        'rawOutput': parsed.get('rawOutput'),
    }


def _runOpenAiExtraAnalysis(categoryName: str, country: str, insights: dict[str, Any], signals: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        from backend.models.openai_cross_reference import create_extra_analysis

        return create_extra_analysis(
            category=categoryName,
            country=country,
            insights=insights,
            signals=signals,
        )
    except Exception as exc:
        print(f'[openai] Extra analysis failed: {exc}')
        return {
            'status': 'failed',
            'source': 'openai',
            'error': str(exc),
        }


def _saveCategoryInsightsLegacy(categoryName: str, country: str, insights: dict[str, Any]) -> None:
    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO categoryInsights (
                    category,
                    country,
                    status,
                    gtmIntelligence,
                    financeIntelligence,
                    securityCompliance,
                    lastUpdated
                )
                VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, NOW())
                ON CONFLICT (category, country)
                DO UPDATE SET
                    status = EXCLUDED.status,
                    gtmIntelligence = EXCLUDED.gtmIntelligence,
                    financeIntelligence = EXCLUDED.financeIntelligence,
                    securityCompliance = EXCLUDED.securityCompliance,
                    lastUpdated = NOW()
                ''',
                (
                    categoryName,
                    country,
                    insights['status'],
                    json.dumps(insights.get('gtmIntelligence', {})),
                    json.dumps(insights.get('financeIntelligence', {})),
                    json.dumps(insights.get('securityCompliance', {})),
                ),
            )


def _saveCategoryInsights(categoryName: str, country: str, insights: dict[str, Any]) -> None:
    try:
        with psycopg2.connect(DATABASE_URL) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    '''
                    INSERT INTO categoryInsights (
                        category,
                        country,
                        status,
                        gtmIntelligence,
                        financeIntelligence,
                        securityCompliance,
                        extraAnalysis,
                        lastUpdated
                    )
                    VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, NOW())
                    ON CONFLICT (category, country)
                    DO UPDATE SET
                        status = EXCLUDED.status,
                        gtmIntelligence = EXCLUDED.gtmIntelligence,
                        financeIntelligence = EXCLUDED.financeIntelligence,
                        securityCompliance = EXCLUDED.securityCompliance,
                        extraAnalysis = EXCLUDED.extraAnalysis,
                        lastUpdated = NOW()
                    ''',
                    (
                        categoryName,
                        country,
                        insights['status'],
                        json.dumps(insights.get('gtmIntelligence', {})),
                        json.dumps(insights.get('financeIntelligence', {})),
                        json.dumps(insights.get('securityCompliance', {})),
                        json.dumps(insights.get('extraAnalysis', {})),
                    ),
                )
    except psycopg2.errors.UndefinedColumn:
        print('[openai] extraAnalysis column is missing; saving legacy insight fields only.')
        _saveCategoryInsightsLegacy(categoryName, country, insights)


def _generateScrapingKeywords(
    category: str,
    product_name: str,
    product_description: str,
    unique_selling_point: str,
    main_features: str,
    competitive_advantage: str,
    pain_point: str,
    customer_segment: str,
) -> list[str]:
    from backend.models.llm import createLlm
    import re

    llm = createLlm()
    prompt = (
        'You are a market research assistant. Based on the product details below, '
        'generate exactly 6 targeted search keywords to find similar products, '
        'competitor products, and customer demand on e-commerce marketplaces.\n\n'
        f'Category: {category}\n'
        f'Product Name: {product_name}\n'
        f'Product Description: {product_description}\n'
        f'Unique Selling Point: {unique_selling_point}\n'
        f'Key Features: {main_features}\n'
        f'Problem Solved: {pain_point}\n'
        f'Target Customer: {customer_segment}\n'
        f'Competitive Advantage: {competitive_advantage}\n\n'
        'Return ONLY a JSON array of 6 short keyword strings suitable for marketplace search. '
        'No explanation, no markdown, no extra text.\n'
        'JSON array:'
    )
    try:
        response = llm.create_completion(prompt=prompt, max_tokens=150, temperature=0.3, stop=['\n\n'])
        text = response['choices'][0]['text'].strip()
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            if isinstance(parsed, list) and parsed:
                keywords = []
                seen = set()
                for keyword in parsed:
                    normalized = str(keyword).strip()
                    if not normalized:
                        continue
                    key = normalized.lower()
                    if key in seen:
                        continue
                    seen.add(key)
                    keywords.append(normalized)
                    if len(keywords) == 6:
                        return keywords
                if keywords:
                    while len(keywords) < 6:
                        keywords.append(f'{product_name or category} {len(keywords) + 1}')
                    return keywords
    except Exception as exc:
        print(f'[scraping] Keyword LLM generation failed: {exc}')
    fallback_seed = product_name or category or 'product'
    return [
        fallback_seed,
        f'{fallback_seed} reviews',
        f'{fallback_seed} price',
        f'{fallback_seed} alternatives',
        f'{category or fallback_seed} best seller',
        f'{fallback_seed} customer demand',
    ]


@celeryApp.task(name='scrapeMarketSignals', queue='scraping')
def scrapeMarketSignals(
    category: str,
    keywords: list[str],
    country: str = 'us',
    marketplace: str = 'amazon',
    product_name: str = '',
    product_description: str = '',
    unique_selling_point: str = '',
    main_features: str = '',
    competitive_advantage: str = '',
    pain_point: str = '',
    customer_segment: str = '',
    price_range_min: int = 0,
    price_range_max: int = 0,
    form_id: str = '',
) -> dict[str, Any]:
    from backend.api.marketplaceScrape import runMarketplaceDiscovery
    from backend.api.socialScrape import runSocialDiscovery

    has_context = any([product_name, product_description, unique_selling_point, main_features, pain_point])
    if has_context:
        keywords = _generateScrapingKeywords(
            category, product_name, product_description,
            unique_selling_point, main_features, competitive_advantage,
            pain_point, customer_segment,
        )
        print(f'[scraping] LLM-generated keywords: {keywords}')
    else:
        print(f'[scraping] Using provided keywords: {keywords}')

    print(f'[scraping] Starting signal scrape for category={category}, country={country}, keywords={keywords}', flush=True)

    started_at = time.monotonic()
    _MAX_SIGNALS = max(1, _PIPELINE_MAX_SIGNALS)
    marketplaces = CATEGORY_MARKETPLACES.get(category.lower(), _DEFAULT_MARKETPLACES)
    if _PIPELINE_ENABLED_MARKETPLACES:
        marketplaces = [
            mp for mp in marketplaces if mp.lower() in _PIPELINE_ENABLED_MARKETPLACES
        ]
    if _PIPELINE_SKIP_MARKETPLACES:
        marketplaces = [
            mp for mp in marketplaces if mp.lower() not in _PIPELINE_SKIP_MARKETPLACES
        ]
    if not marketplaces:
        marketplaces = [
            mp for mp in _DEFAULT_MARKETPLACES
            if (not _PIPELINE_ENABLED_MARKETPLACES or mp.lower() in _PIPELINE_ENABLED_MARKETPLACES)
            and mp.lower() not in _PIPELINE_SKIP_MARKETPLACES
        ]
    print(f'[scraping] Active marketplaces for category={category}: {marketplaces}', flush=True)
    rows: list[tuple[str, str, str, str, str]] = []

    if has_context:
        brief_parts = [
            f'Product: {product_name}',
            f'Description: {product_description}',
            f'USP: {unique_selling_point}',
            f'Features: {main_features}',
            f'Pain point: {pain_point}',
            f'Customer segment: {customer_segment}',
            f'Competitive advantage: {competitive_advantage}',
            f'Price range: {price_range_min}-{price_range_max}',
        ]
        brief_text = ' | '.join(p for p in brief_parts if not p.endswith(': ') and not p.endswith(':0') and not p.endswith(':0-0'))
        if brief_text.strip():
            rows.append((brief_text[:1000], 'product_brief', '', country, category))

    for keyword in keywords[:_PIPELINE_KEYWORD_LIMIT]:
        if len(rows) >= _MAX_SIGNALS:
            break
        if _pipelineTimeExceeded(started_at):
            print(f'[scraping] Pipeline budget exhausted before keyword={keyword} elapsed={_pipelineElapsed(started_at)}', flush=True)
            break

        if _PIPELINE_SOCIAL_ENABLED:
            print(f'[scraping] Social discovery keyword={keyword}', flush=True)
            socialData = runSocialDiscovery(
                keyword=keyword,
                country_code=country,
                limit=3,
                include_scrape=False,
                wait_for_snapshot=True,
                timeout_seconds=_PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS,
                snapshot_wait_seconds=_PIPELINE_SNAPSHOT_WAIT_SECONDS,
            )
            print(f'[scraping] Social discovery status={socialData.get("status")} keyword={keyword}', flush=True)
            if socialData.get('status') == 'success':
                for result in socialData.get('serpResults', [])[:3]:
                    text = f"{result.get('title', '')} — {result.get('description', '')}"
                    if not text.strip(' —'):
                        text = _recordFallbackText(result.get('record') or {})
                    if text.strip():
                        rows.append((text[:1000], result.get('source', 'social'), result.get('url', ''), country, category))
        else:
            print(f'[scraping] Social discovery skipped (PIPELINE_SOCIAL_ENABLED=false) keyword={keyword}', flush=True)

        if _PIPELINE_TWITTER_ENABLED and len(rows) < _MAX_SIGNALS:
            print(f'[scraping] Twitter SERP discovery keyword={keyword}', flush=True)
            twitterData = _runTwitterSerpDiscovery(
                keyword, country, _PIPELINE_TWITTER_RESULTS_PER_KEYWORD
            )
            print(f'[scraping] Twitter SERP status={twitterData.get("status")} keyword={keyword}', flush=True)
            if twitterData.get('status') == 'success':
                for result in twitterData.get('serpResults', []):
                    if len(rows) >= _MAX_SIGNALS:
                        break
                    text = f"{result.get('title', '')} — {result.get('description', '')}"
                    if text.strip(' —'):
                        rows.append((text[:1000], 'twitter', result.get('url', ''), country, category))

        for mp in marketplaces:
            if len(rows) >= _MAX_SIGNALS:
                break
            if _pipelineTimeExceeded(started_at):
                print(
                    f'[scraping] Pipeline budget exhausted before marketplace={mp} '
                    f'keyword={keyword} elapsed={_pipelineElapsed(started_at)}',
                    flush=True,
                )
                break

            market_started = time.monotonic()
            print(f'[scraping] Marketplace discovery marketplace={mp} keyword={keyword}', flush=True)
            marketData = runMarketplaceDiscovery(
                keyword=keyword,
                marketplace=mp,
                country_code=country,
                limit=3,
                include_scrape=False,
                wait_for_snapshot=True,
                timeout_seconds=_PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS,
                snapshot_wait_seconds=_PIPELINE_SNAPSHOT_WAIT_SECONDS,
                record_limit=_PIPELINE_MARKETPLACE_RECORD_LIMIT,
            )
            status_extras = ''
            if marketData.get('status') != 'success':
                status_extras = (
                    f' error={marketData.get("error")!r}'
                    f' httpStatus={marketData.get("httpStatus")}'
                    f' response={str(marketData.get("response"))[:300]!r}'
                )
            print(
                f'[scraping] Marketplace discovery status={marketData.get("status")} '
                f'marketplace={mp} keyword={keyword} '
                f'duration={time.monotonic() - market_started:.1f}s '
                f'elapsed={_pipelineElapsed(started_at)}'
                f'{status_extras}',
                flush=True,
            )
            if marketData.get('status') == 'success':
                for result in marketData.get('results', [])[:3]:
                    if len(rows) >= _MAX_SIGNALS:
                        break
                    record = result.get('record') or {}
                    metrics = []
                    for key in ['final_price', 'price', 'rating', 'reviews_count', 'review_count', 'sold', 'number_sold', 'gmv']:
                        if isinstance(record, dict) and record.get(key) is not None:
                            metrics.append(f'{key}={record.get(key)}')
                    text = f"{result.get('title', '')} — {result.get('description', '')}"
                    if metrics:
                        text = f"{text} ({', '.join(metrics)})"
                    if not text.strip(' —'):
                        text = _recordFallbackText(record)
                    if text.strip():
                        rows.append((text[:1000], mp, result.get('url', ''), country, category))
        if _pipelineTimeExceeded(started_at):
            break
    if not rows and _PIPELINE_ALLOW_FALLBACK_SIGNALS:
        fallback_parts = [
            f'Product: {product_name or category}',
            f'Category: {category}',
            f'Description: {product_description}',
            f'USP: {unique_selling_point}',
            f'Features: {main_features}',
            f'Customer segment: {customer_segment}',
            f'Pain point: {pain_point}',
            'Bright Data live collection did not return records before the pipeline timeout.',
        ]
        fallback_text = ' | '.join(part for part in fallback_parts if part and not part.endswith(': '))
        rows.append((fallback_text[:1000], 'pipeline_fallback', '', country, category))
        print('[scraping] Stored fallback signal because Bright Data returned no records before timeout.', flush=True)
    if rows:
        embedder = createEmbedder()
        try:
            vectors = embedTexts(embedder, [row[0] for row in rows])
        finally:
            del embedder
            gc.collect()

        embedded_rows = [
            (signal_text, source_type, source_url, country_value, category_value, _formatVector(vector))
            for (signal_text, source_type, source_url, country_value, category_value), vector in zip(rows, vectors)
        ]

        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.executemany(
                    'INSERT INTO marketSignals (signalText, sourceType, sourceUrl, signalDate, country, category, embedding) '
                    'VALUES (%s, %s, %s, CURRENT_DATE, %s, %s, %s::vector)',
                    embedded_rows,
                )

    stored = len(rows)
    print(f'[scraping] Done. Stored {stored} signals for category={category}, country={country}')

    _ingest_into_cognee(category, country, rows, tag='market')

    inference_task = processLlmInsights.delay(category, country, form_id)
    print(f'[scraping] Dispatched processLlmInsights task_id={inference_task.id}')

    if form_id:
        from backend.agent.session import getRedisClient
        rdb = getRedisClient()
        raw = rdb.get(f'form_pipeline:{form_id}')
        current = json.loads(raw) if raw else {}
        current['inference_task_id'] = inference_task.id
        rdb.set(f'form_pipeline:{form_id}', json.dumps(current), ex=3600)

    return {'category': category, 'country': country, 'keywords': keywords, 'signals_stored': stored, 'status': 'completed'}


def _personaDecodeIsValid(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    personas = data.get('personas')
    if not isinstance(personas, list) or len(personas) < 1:
        return False
    for entry in personas:
        if not isinstance(entry, dict):
            return False
        if not entry.get('name') or not entry.get('description'):
            return False
    return True


def _runCloudPersonaDecode(prompt: str) -> dict[str, Any] | None:
    import httpx

    api_key = (
        os.getenv('OPENAI_API_KEY')
        or os.getenv('BRIGHTDATA_API_TOKEN')
        or os.getenv('BRIGHT_DATA_API_TOKEN')
    )
    if not api_key:
        return None

    base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')

    try:
        response = httpx.post(
            f'{base_url}/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': model,
                'messages': [
                    {
                        'role': 'system',
                        'content': (
                            'You are a senior consumer market analyst. Return ONLY a valid JSON '
                            'object that matches the schema the user gives you. No prose, no '
                            'markdown, no code fences.'
                        ),
                    },
                    {'role': 'user', 'content': prompt},
                ],
                'temperature': 0.3,
                'max_tokens': 1500,
                'response_format': {'type': 'json_object'},
            },
            timeout=60,
        )
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content']
        return json.loads(content)
    except Exception as exc:
        print(f'[persona-decode] Cloud call failed: {exc}')
        return None


def _runLocalPersonaDecode(prompt: str) -> dict[str, Any]:
    llm = createLlm()
    try:
        response = llm.create_completion(
            prompt=prompt,
            max_tokens=1200,
            temperature=0.3,
            stop=['\n\n\n'],
        )
        rawText = response['choices'][0]['text']
    finally:
        del llm
        gc.collect()
    return _parseInsights(rawText)


@celeryApp.task(name='runPersonaDecodeTask', queue='inference')
def runPersonaDecodeTask(formData: dict) -> dict[str, Any]:
    category = formData.get('category', '')
    country = formData.get('country', 'us')

    signals = _fetchRelevantSignals(category, country, limit=20)
    if signals:
        signalLines = []
        for s in signals[:15]:
            line = f"- {s['signalText'][:200]}"
            if s.get('sourceType'):
                line += f" ({s['sourceType']})"
            signalLines.append(line)
        signalContext = '\n'.join(signalLines)
    else:
        signalContext = '- No market signals yet; base personas on the product context.'

    prompt = (
        'You are a consumer market analyst. Generate exactly 3 buyer personas.\n\n'
        f'Product: {formData.get("productName", "")}\n'
        f'Category: {category}\n'
        f'Country: {country}\n'
        f'Region: {formData.get("region", "")}\n'
        f'Target Customer: {formData.get("customerSegment", "")}\n'
        f'Pain Point: {formData.get("painPoint", "")}\n'
        f'Price Range: {formData.get("priceRangeMin", 0)}-{formData.get("priceRangeMax", 0)}\n'
        f'Product Description: {formData.get("productDescription", "")}\n\n'
        f'Market Signals:\n{signalContext}\n\n'
        'Return ONLY a JSON object with no extra text:\n'
        '{"personas":['
        '{"name":"...","age":"18-26","tone":"high","description":"...","painPoints":["...","...","..."],"goals":"..."},'
        '{"name":"...","age":"...","tone":"medium","description":"...","painPoints":["...","..."],"goals":"..."},'
        '{"name":"...","age":"...","tone":"growth","description":"...","painPoints":["...","..."],"goals":"..."}'
        '],"stp":{"segmentation":"...","targeting":"...","positioning":"...","geographic":"...","demographic":"...","psychographic":"...","behavioral":"...","needs":"..."},'
        '"advisorIntelligence":{"recommendation":"...","keyPainPoint":"...","brandMessage":"...","marketOpportunity":"..."}}\n\n'
        'JSON:'
    )

    cloudData = _runCloudPersonaDecode(prompt)
    if _personaDecodeIsValid(cloudData):
        print('[persona-decode] Served by cloud LLM.', flush=True)
        return {'status': 'completed', 'personaData': cloudData, 'source': 'cloud'}

    print('[persona-decode] Cloud unavailable or invalid; falling back to local Llama.', flush=True)
    localData = _runLocalPersonaDecode(prompt)
    return {
        'status': 'completed',
        'personaData': localData,
        'source': 'llama',
        'fallback': True,
    }


@celeryApp.task(name='runAgentTask', bind=True, queue='inference')
def runAgentTask(self, prompt: str, max_steps: int = 6, user_context: dict | None = None) -> dict[str, Any]:
    from backend.agent.reactAgent import _cloudFallbackChat, runReactAgent
    from backend.agent.session import getRedisClient, initSession, closeSession, saveStep

    session_id = self.request.id
    redis_client = getRedisClient()

    initSession(redis_client, session_id, prompt)

    cloud_result = _cloudFallbackChat(prompt, user_context, steps=[])
    cloud_answer = cloud_result.get('content', '') if isinstance(cloud_result, dict) else ''
    if cloud_answer and cloud_answer.strip():
        saveStep(
            redis_client,
            session_id,
            {'step': 1, 'thought': 'Cloud chat served directly.', 'final_answer': cloud_answer},
        )
        closeSession(redis_client, session_id, success=True)
        print('[agent] Served by cloud LLM.', flush=True)
        reasoning_text = cloud_result.get('reasoning', '') if isinstance(cloud_result, dict) else ''
        duration_s = cloud_result.get('duration_s', 0) if isinstance(cloud_result, dict) else 0
        return {
            'session_id': session_id,
            'steps': [],
            'final_answer': cloud_answer,
            'reasoning': {
                'content': reasoning_text,
                'duration': int(duration_s),
            },
            'success': True,
            'source': 'cloud',
        }

    print('[agent] Cloud unavailable; falling back to local Llama ReAct.', flush=True)
    llm = createLlm()
    try:
        result = runReactAgent(
            prompt,
            llm,
            max_steps=max_steps,
            redis_client=redis_client,
            session_id=session_id,
            user_context=user_context,
        )
    finally:
        del llm
        gc.collect()

    result['source'] = 'llama'
    return result


def _generateComplianceKeywords(category: str, country: str, product_name: str) -> list[str]:
    import re

    llm = createLlm()
    prompt = (
        f'You are a compliance and risk research assistant. For a business in the "{category}" '
        f'category operating in {country}, generate exactly 5 search keywords to monitor news, '
        f'regulatory updates, safety recalls, or hazard alerts relevant to this business.\n\n'
        'Examples:\n'
        '- food/beverage in US: ["FDA recall food", "food safety alert", "FDA warning letter", "USDA recall", "food contamination news"]\n'
        '- electronics: ["FCC recall", "consumer product safety commission", "lithium battery recall", "electronics safety alert", "CPSC warning"]\n'
        '- cosmetics: ["FDA cosmetic warning", "MOCRA compliance", "cosmetic recall", "skincare allergen alert", "FDA enforcement report"]\n'
        '- apparel: ["CPSC clothing recall", "flammable fabric warning", "lead in clothing", "textile safety", "garment recall"]\n\n'
        f'Product: {product_name}\n\n'
        'Return ONLY a JSON array of exactly 5 short keyword strings. No explanation, no markdown.\n'
        'JSON:'
    )
    try:
        response = llm.create_completion(prompt=prompt, max_tokens=200, temperature=0.3, stop=['\n\n'])
        text = response['choices'][0]['text'].strip()
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                seen = set()
                keywords: list[str] = []
                for item in parsed:
                    normalized = str(item).strip()
                    if normalized and normalized.lower() not in seen:
                        seen.add(normalized.lower())
                        keywords.append(normalized)
                    if len(keywords) == 5:
                        return keywords
                if keywords:
                    return keywords
    except Exception as exc:
        print(f'[compliance] Keyword generation failed: {exc}')
    finally:
        del llm
        gc.collect()
    base = product_name or category or 'product'
    return [
        f'{base} recall',
        f'{base} safety alert',
        f'{base} FDA warning',
        f'{category} regulation news',
        f'{category} hazard',
    ]


def _loadFormPayload(user_id: int) -> dict | None:
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT payload FROM founderForms WHERE user_id = %s ORDER BY createdAt DESC LIMIT 1',
                    (user_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return json.loads(row[0]) if isinstance(row[0], str) else row[0]
    except Exception as exc:
        print(f'[cron] Failed to load form for user={user_id}: {exc}')
        return None


@celeryApp.task(name='refreshUserMarketSignals', queue='scraping')
def refreshUserMarketSignals(user_id: int) -> dict[str, Any]:
    if not _DAILY_REFRESH_ENABLED:
        return {'status': 'skipped', 'reason': 'DAILY_REFRESH_ENABLED=false', 'user_id': user_id}

    form = _loadFormPayload(user_id)
    if not form:
        return {'status': 'no_form', 'user_id': user_id}

    task = scrapeMarketSignals.delay(
        form.get('industry', ''),
        form.get('searchIntentKeywords', []) or [],
        form.get('countryCode', 'us') or 'us',
        form.get('marketplace', 'amazon') or 'amazon',
        form.get('productName', '') or '',
        form.get('productDescription', '') or '',
        form.get('uniqueSellingPoint', '') or '',
        form.get('mainFeatures', '') or '',
        form.get('competitiveAdvantage', '') or '',
        form.get('painPoint', '') or '',
        form.get('customerSegment', '') or '',
        int(form.get('priceRangeMin', 0) or 0),
        int(form.get('priceRangeMax', 0) or 0),
        '',
    )
    return {'status': 'queued', 'user_id': user_id, 'task_id': task.id}


@celeryApp.task(name='scrapeComplianceSignals', queue='scraping')
def scrapeComplianceSignals(user_id: int) -> dict[str, Any]:
    if not _COMPLIANCE_SCRAPE_ENABLED:
        return {'status': 'skipped', 'reason': 'COMPLIANCE_SCRAPE_ENABLED=false', 'user_id': user_id}

    form = _loadFormPayload(user_id)
    if not form:
        return {'status': 'no_form', 'user_id': user_id}

    category = form.get('industry', '') or ''
    country = form.get('countryCode', 'us') or 'us'
    product_name = form.get('productName', '') or ''

    keywords = _generateComplianceKeywords(category, country, product_name)
    print(f'[compliance] user={user_id} keywords={keywords}', flush=True)

    from backend.api.socialScrape import runSocialDiscovery

    rows: list[tuple[str, str, str, str, str]] = []
    for keyword in keywords:
        data = runSocialDiscovery(
            keyword=keyword,
            country_code=country,
            limit=3,
            include_scrape=False,
            wait_for_snapshot=True,
            timeout_seconds=_PIPELINE_BRIGHTDATA_TIMEOUT_SECONDS,
            snapshot_wait_seconds=_PIPELINE_SNAPSHOT_WAIT_SECONDS,
        )
        if data.get('status') != 'success':
            continue
        for result in data.get('serpResults', [])[:3]:
            text = f"{result.get('title', '')} — {result.get('description', '')}"
            if not text.strip(' —'):
                continue
            rows.append((text[:1000], 'compliance', result.get('url', ''), country, category))

    if rows:
        embedder = createEmbedder()
        try:
            vectors = embedTexts(embedder, [r[0] for r in rows])
        finally:
            del embedder
            gc.collect()

        embedded_rows = [
            (text, src, url, ctry, cat, _formatVector(vec))
            for (text, src, url, ctry, cat), vec in zip(rows, vectors)
        ]
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.executemany(
                    'INSERT INTO marketSignals (signalText, sourceType, sourceUrl, signalDate, country, category, embedding) '
                    'VALUES (%s, %s, %s, CURRENT_DATE, %s, %s, %s::vector)',
                    embedded_rows,
                )

    _ingest_into_cognee(category, country, rows, tag='compliance')

    return {'status': 'completed', 'user_id': user_id, 'keywords': keywords, 'signals_stored': len(rows)}


@celeryApp.task(name='ingestSignalsIntoMemory', queue='synthesis')
def ingestSignalsIntoMemory(category: str, country: str, signals: list[dict], tag: str = 'market') -> dict:
    if not _COGNEE_ENABLED:
        return {'status': 'skipped', 'reason': 'COGNEE_ENABLED=false'}
    try:
        from backend.models.cognee_memory import ingest_signals, run_async
        return run_async(ingest_signals(category, country, signals, tag=tag))
    except Exception as exc:
        print(f'[cognee] Ingest failed: {exc}')
        return {'status': 'failed', 'error': str(exc)}


@celeryApp.task(name='ingestDashboardIntoMemory', queue='synthesis')
def ingestDashboardIntoMemory(category: str, country: str, dashboard: dict) -> dict:
    if not _COGNEE_ENABLED:
        return {'status': 'skipped', 'reason': 'COGNEE_ENABLED=false'}
    try:
        from backend.models.cognee_memory import ingest_dashboard, run_async
        return run_async(ingest_dashboard(category, country, dashboard))
    except Exception as exc:
        print(f'[cognee] Dashboard ingest failed: {exc}')
        return {'status': 'failed', 'error': str(exc)}


def _updateInferenceStage(form_id: str, stage: str) -> None:
    if not form_id:
        return
    try:
        from backend.agent.session import getRedisClient
        rdb = getRedisClient()
        raw = rdb.get(f'form_pipeline:{form_id}')
        current = json.loads(raw) if raw else {}
        current['inference_stage'] = stage
        rdb.set(f'form_pipeline:{form_id}', json.dumps(current), ex=3600)
    except Exception as exc:
        print(f'[pipeline] Failed to update inference_stage={stage}: {exc}')


def _dashboardReadyLink(token: str, form_id: str) -> str:
    query = urlencode({'session': token, 'formId': form_id})
    return f'{APP_PUBLIC_URL}/?{query}'


def _refreshDashboardSessionToken(rdb: Any, token: str, meta: dict[str, Any]) -> None:
    try:
        session = {
            'user_id': meta.get('user_id'),
            'email': meta.get('email'),
            'created_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        }
        rdb.set(
            f'session:{token}',
            json.dumps(session),
            ex=DASHBOARD_SESSION_TTL_SECONDS,
        )
    except Exception as exc:
        print(f'[email] Failed to refresh dashboard session token: {exc}')


def _dashboardReadyEmailHtml(link: str, label: str) -> str:
    safe_link = escape(link, quote=True)
    safe_label = escape(label)
    return f'''<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f5ef;font-family:Arial,Helvetica,sans-serif;color:#28251f;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your ConsumerIQ dashboard is ready.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f6f5ef;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse;background:#fffdf7;border:1px solid #e4dfcf;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px 28px;border-bottom:1px solid #ece6d8;">
                <div style="font-size:13px;line-height:18px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#98971a;">ConsumerIQ</div>
                <h1 style="margin:12px 0 0 0;font-size:28px;line-height:34px;font-weight:700;color:#28251f;">Your dashboard is ready</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px 28px;">
                <p style="margin:0 0 18px 0;font-size:15px;line-height:24px;color:#4b473d;">
                  The scraping and analytics pipeline has finished. Your latest market intelligence dashboard is ready to review.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px 0;background:#f7f3e8;border:1px solid #e7dec8;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c6f64;">Research scope</div>
                      <div style="margin-top:4px;font-size:16px;line-height:24px;font-weight:700;color:#28251f;">{safe_label}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px 0;">
                  <tr>
                    <td bgcolor="#98971a" style="border-radius:8px;">
                      <a href="{safe_link}" style="display:inline-block;padding:13px 18px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Open dashboard</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px 0;font-size:13px;line-height:20px;color:#6f6a60;">
                  This secure link opens your dashboard session directly, so you do not need to log in again.
                </p>
                <p style="margin:0;font-size:12px;line-height:18px;color:#8b8578;word-break:break-all;">
                  If the button does not work, copy and paste this link into your browser:<br>
                  <a href="{safe_link}" style="color:#98971a;text-decoration:underline;">{safe_link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px 28px;">
                <div style="height:1px;background:#ece6d8;margin-bottom:18px;"></div>
                <p style="margin:0;font-size:12px;line-height:18px;color:#8b8578;">ConsumerIQ market intelligence notification</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''


def _sendMailerSendEmail(recipient: str, subject: str, text: str, html: str) -> None:
    payload: dict[str, Any] = {
        'from': {'email': MAILERSEND_FROM_EMAIL, 'name': MAILERSEND_FROM_NAME},
        'to': [{'email': recipient}],
        'subject': subject,
        'text': text,
        'html': html,
    }
    response = requests.post(
        f'{MAILERSEND_API_BASE_URL}/email',
        headers={
            'Authorization': f'Bearer {MAILERSEND_API_KEY}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        json=payload,
        timeout=20,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f'MailerSend returned {response.status_code}: {response.text[:500]}'
        )


def _sendDashboardReadyEmail(form_id: str, category: str, country: str) -> None:
    if not form_id:
        return
    if not (MAILERSEND_API_KEY and MAILERSEND_FROM_EMAIL):
        print('[email] MailerSend not configured; dashboard-ready email skipped.')
        return

    try:
        from backend.agent.session import getRedisClient
        rdb = getRedisClient()
        sent_key = f'dashboard_email_sent:{form_id}'
        if not rdb.set(sent_key, '1', nx=True, ex=DASHBOARD_SESSION_TTL_SECONDS):
            return

        raw = rdb.get(f'form_session:{form_id}')
        if not raw:
            print(f'[email] Missing form_session metadata for form_id={form_id}')
            rdb.delete(sent_key)
            return

        meta = json.loads(raw)
        recipient = str(meta.get('email') or '').strip()
        token = str(meta.get('token') or '').strip()
        if not recipient or not token:
            print(f'[email] Missing recipient or token for form_id={form_id}')
            rdb.delete(sent_key)
            return

        _refreshDashboardSessionToken(rdb, token, meta)
        link = _dashboardReadyLink(token, form_id)
        label = category
        if country:
            label = f'{category} ({country})'

        subject = 'Your ConsumerIQ dashboard is ready'
        text = '\n'.join(
            [
                'Your ConsumerIQ dashboard is ready.',
                '',
                f'Research: {label}',
                f'Open dashboard: {link}',
                '',
                'This secure link opens your dashboard session directly.',
            ]
        )
        html = _dashboardReadyEmailHtml(link, label)
        _sendMailerSendEmail(recipient, subject, text, html)

        print(f'[email] Dashboard-ready email sent to {recipient} for form_id={form_id}')
    except Exception as exc:
        try:
            from backend.agent.session import getRedisClient
            getRedisClient().delete(f'dashboard_email_sent:{form_id}')
        except Exception:
            pass
        print(f'[email] Dashboard-ready email failed for form_id={form_id}: {exc}')


_DASHBOARD_REQUIRED_SECTIONS = (
    'marketOverview',
    'demandPulse',
    'competitorMirror',
    'launchCompass',
)


def _dashboardIsComplete(dashboard: Any) -> bool:
    if not isinstance(dashboard, dict):
        return False
    for key in _DASHBOARD_REQUIRED_SECTIONS:
        value = dashboard.get(key)
        if not isinstance(value, dict) or not value:
            return False
    return True


@celeryApp.task(name='processLlmInsights', queue='synthesis', bind=True, max_retries=3)
def processLlmInsights(self, categoryName: str, country: str = '', form_id: str = ''):
    print(f'Worker picked up job for category: {categoryName}, country: {country}, form_id: {form_id}')

    signals = _fetchRelevantSignals(categoryName, country)
    if not signals:
        try:
            raise self.retry(countdown=90)
        except self.MaxRetriesExceededError:
            _updateInferenceStage(form_id, 'failed')
            return {
                'category': categoryName,
                'status': 'failed',
                'error': 'No signals found after retries.',
            }

    _updateInferenceStage(form_id, 'analyzing')
    translatedSignals = _translateSignalsIfNeeded(signals)
    insights = _runLlmInsights(categoryName, translatedSignals)

    _updateInferenceStage(form_id, 'cross_referencing')
    insights['extraAnalysis'] = _runOpenAiExtraAnalysis(categoryName, country, insights, translatedSignals)

    extra = insights.get('extraAnalysis') or {}
    dashboard = extra.get('dashboardData') if isinstance(extra, dict) else None

    _updateInferenceStage(form_id, 'synthesizing')
    if not _dashboardIsComplete(dashboard):
        try:
            print('[openai] Dashboard data incomplete; running dashboard-only retry.')
            from backend.models.openai_cross_reference import generate_dashboard_data
            dashboard = generate_dashboard_data(
                categoryName, country, insights, translatedSignals
            )
            if not isinstance(extra, dict):
                extra = {}
            extra['dashboardData'] = dashboard
            insights['extraAnalysis'] = extra
        except Exception as exc:
            print(f'[openai] Dashboard retry failed: {exc}')

    _saveCategoryInsights(categoryName, country, insights)

    if not _dashboardIsComplete(dashboard):
        _updateInferenceStage(form_id, 'failed')
        return {
            **insights,
            'contextSignals': translatedSignals,
            'status': 'failed',
            'error': 'Dashboard data is incomplete after synthesis.',
        }

    _updateInferenceStage(form_id, 'completed')
    _sendDashboardReadyEmail(form_id, categoryName, country)

    if (
        _COGNEE_ENABLED
        and isinstance(dashboard, dict)
        and any(dashboard.get(k) for k in _DASHBOARD_REQUIRED_SECTIONS)
    ):
        try:
            ingestDashboardIntoMemory.delay(categoryName, country, dashboard)
        except Exception as exc:
            print(f'[cognee] Dashboard dispatch failed: {exc}')

    print(f'Job complete for {categoryName}! Saved to Postgres.')
    return {
        **insights,
        'contextSignals': translatedSignals,
    }


@celeryApp.task(name='scrapeMarketplacePage', queue='scraping')
def scrapeMarketplacePage(
    url: str,
    keyword: str | None = None,
    country_code: str = 'cn',
    render_js: bool = True,
    include_reviews: bool = True,
    max_review_pages: int = 1,
    wait_ms: int = 0,
    wait_for: str | None = None,
    scroll: bool = False,
    block_resources: bool | None = None,
) -> dict[str, Any]:
    from backend.api.marketplaceScrape import runMarketplaceScrape
    return runMarketplaceScrape(
        url, keyword, country_code, render_js, include_reviews,
        max_review_pages, wait_ms, wait_for, scroll, block_resources,
    )


@celeryApp.task(name='scrapeMarketplacePageBatch', queue='scraping')
def scrapeMarketplacePageBatch(
    urls: list[str],
    keyword: str | None = None,
    country_code: str = 'cn',
    render_js: bool = True,
) -> dict[str, Any]:
    from backend.api.marketplaceScrape import runMarketplaceScrape
    results = [runMarketplaceScrape(url, keyword, country_code, render_js) for url in urls]
    return {'status': 'success', 'count': len(results), 'results': results}


@celeryApp.task(name='scrapeMarketplaceDiscovery', queue='scraping')
def scrapeMarketplaceDiscovery(
    keyword: str,
    marketplace: str = 'amazon',
    country_code: str = 'cn',
    language: str = 'en',
    limit: int = 5,
    include_scrape: bool = True,
) -> dict[str, Any]:
    from backend.api.marketplaceScrape import runMarketplaceDiscovery
    return runMarketplaceDiscovery(keyword, marketplace, country_code, language, limit, include_scrape)


@celeryApp.task(name='scrapeSocialPage', queue='scraping')
def scrapeSocialPage(
    url: str,
    keyword: str | None = None,
    country_code: str = 'us',
    render_js: bool = True,
) -> dict[str, Any]:
    from backend.api.socialScrape import runSocialScrape
    return runSocialScrape(url, keyword, country_code, render_js)


@celeryApp.task(name='scrapeSocialDiscovery', queue='scraping')
def scrapeSocialDiscovery(
    keyword: str,
    country_code: str = 'us',
    language: str = 'en',
    limit: int = 5,
    include_scrape: bool = True,
) -> dict[str, Any]:
    from backend.api.socialScrape import runSocialDiscovery
    return runSocialDiscovery(keyword, country_code, language, limit, include_scrape)
