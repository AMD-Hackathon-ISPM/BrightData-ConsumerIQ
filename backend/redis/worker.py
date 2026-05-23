import gc
import json
import os
from typing import Any
import psycopg2
from celery import Celery
from kombu import Queue
from backend.models.embeddings import createEmbedder, embedTexts
from backend.models.llm import createLlm
from backend.models.translator import translateTextsIfNeeded

REDIS_URL = os.getenv('REDIS_URL', 'redis://redis.consumeriq.svc.cluster.local:6379/0')
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
        'processLlmInsights': {'queue': 'synthesis'},
        'scrapeMarketSignals': {'queue': 'scraping'},
        'scrapeMarketplacePage': {'queue': 'scraping'},
        'scrapeMarketplacePageBatch': {'queue': 'scraping'},
        'scrapeMarketplaceDiscovery': {'queue': 'scraping'},
        'scrapeSocialPage': {'queue': 'scraping'},
        'scrapeSocialDiscovery': {'queue': 'scraping'},
    },
)


def _formatVector(values: list[float]) -> str:
    return '[' + ','.join(f'{value:.6f}' for value in values) + ']'


def _fetchRelevantSignals(categoryName: str, *, limit: int = 50) -> list[dict[str, Any]]:
    embedder = createEmbedder()
    try:
        queryVector = embedTexts(embedder, [categoryName])[0]
    finally:
        del embedder
        gc.collect()

    vectorLiteral = _formatVector(queryVector)

    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT signalText, sourceType, sourceUrl, sentimentScore
                FROM marketSignals
                WHERE embedding IS NOT NULL
                ORDER BY embedding <-> %s::vector
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
        sourceUrl = signal.get('sourceUrl')
        if sourceType:
            meta.append(f'sourceType: {sourceType}')
        if sentimentScore is not None:
            meta.append(f'sentimentScore: {sentimentScore}')
        if sourceUrl:
            meta.append(f'sourceUrl: {sourceUrl}')
        if meta:
            metaText = ', '.join(meta)
            line = f'{line} ({metaText})'
        contextLines.append(line)

    context = '\n'.join(contextLines)

    return (
        'You are a market intelligence analyst. Return only JSON with these keys: '
        'gtmIntelligence, financeIntelligence, securityCompliance.\n'
        'Focus on demand signals, pricing, and compliance or safety risks.\n\n'
        f'Category: {categoryName}\n\n'
        f'Signals:\n{context}\n\n'
        'JSON:'
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
            max_tokens=512,
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
        'rawOutput': parsed.get('rawOutput'),
    }


def _saveCategoryInsights(categoryName: str, insights: dict[str, Any]) -> None:
    with psycopg2.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO categoryInsights (
                    category,
                    status,
                    gtmIntelligence,
                    financeIntelligence,
                    securityCompliance,
                    lastUpdated
                )
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s::jsonb, NOW())
                ON CONFLICT (category)
                DO UPDATE SET
                    status = EXCLUDED.status,
                    gtmIntelligence = EXCLUDED.gtmIntelligence,
                    financeIntelligence = EXCLUDED.financeIntelligence,
                    securityCompliance = EXCLUDED.securityCompliance,
                    lastUpdated = NOW()
                ''',
                (
                    categoryName,
                    insights['status'],
                    json.dumps(insights.get('gtmIntelligence', {})),
                    json.dumps(insights.get('financeIntelligence', {})),
                    json.dumps(insights.get('securityCompliance', {})),
                ),
            )


@celeryApp.task(name='scrapeMarketSignals', queue='scraping')
def scrapeMarketSignals(category: str, keywords: list[str]) -> dict[str, Any]:
    from backend.api.scrapingbeeClient import searchGoogle, normalizeSerpResults
    from backend.api.marketplaceScrape import buildMarketplaceDiscoveryQuery, MarketplaceDiscoveryRequest

    print(f'[scraping] Starting signal scrape for category={category}, keywords={keywords}')

    rows: list[tuple[str, str, str]] = []

    for keyword in keywords[:5]:
        socialData, err = searchGoogle(
            query=f'site:reddit.com OR site:twitter.com {keyword}',
            country_code='us',
            nb_results=5,
        )
        if not err:
            for result in normalizeSerpResults(socialData)[:3]:
                text = f"{result.get('title', '')} — {result.get('description', '')}"
                if text.strip():
                    rows.append((text[:1000], result.get('source', 'social'), result.get('url', '')))

        req = MarketplaceDiscoveryRequest(
            keyword=keyword, marketplace='amazon', limit=3, include_scrape=False,
        )
        marketData, err = searchGoogle(
            query=buildMarketplaceDiscoveryQuery(req), country_code='us', nb_results=3,
        )
        if not err:
            for result in normalizeSerpResults(marketData)[:2]:
                text = f"{result.get('title', '')} — {result.get('description', '')}"
                if text.strip():
                    rows.append((text[:1000], 'marketplace', result.get('url', '')))

    if rows:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.executemany(
                    'INSERT INTO marketSignals (signalText, sourceType, sourceUrl, signalDate) '
                    'VALUES (%s, %s, %s, CURRENT_DATE)',
                    rows,
                )

    stored = len(rows)
    print(f'[scraping] Done. Stored {stored} signals for category={category}')
    return {'category': category, 'keywords': keywords, 'signals_stored': stored, 'status': 'completed'}


@celeryApp.task(name='runAgentTask', bind=True, queue='inference')
def runAgentTask(self, prompt: str, max_steps: int = 6, user_context: dict | None = None) -> dict[str, Any]:
    from backend.agent.reactAgent import runReactAgent
    from backend.agent.session import getRedisClient

    session_id = self.request.id
    redis_client = getRedisClient()
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

    return result


@celeryApp.task(name='processLlmInsights', queue='synthesis')
def processLlmInsights(categoryName: str):
    print(f'Worker picked up job for category: {categoryName}')

    signals = _fetchRelevantSignals(categoryName)
    if not signals:
        return {
            'category': categoryName,
            'status': 'failed',
            'error': 'No signals found for category embedding search.',
        }

    translatedSignals = _translateSignalsIfNeeded(signals)
    insights = _runLlmInsights(categoryName, translatedSignals)
    _saveCategoryInsights(categoryName, insights)

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
    marketplace: str = 'taobao',
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
