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
        'runPersonaDecodeTask': {'queue': 'inference'},
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
                    '''
                    SELECT signalText, sourceType, sourceUrl, sentimentScore
                    FROM marketSignals
                    WHERE embedding IS NOT NULL AND (country = %s OR country IS NULL)
                    ORDER BY embedding <-> %s::vector
                    LIMIT %s
                    ''',
                    (country, vectorLiteral, limit),
                )
            else:
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


def _saveCategoryInsights(categoryName: str, country: str, insights: dict[str, Any]) -> None:
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


@celeryApp.task(name='scrapeMarketSignals', queue='scraping')
def scrapeMarketSignals(category: str, keywords: list[str], country: str = 'us', marketplace: str = 'amazon') -> dict[str, Any]:
    from backend.api.marketplaceScrape import runMarketplaceDiscovery
    from backend.api.socialScrape import runSocialDiscovery

    print(f'[scraping] Starting signal scrape for category={category}, country={country}, keywords={keywords}')

    rows: list[tuple[str, str, str, str, str]] = []

    for keyword in keywords[:5]:
        socialData = runSocialDiscovery(
            keyword=keyword,
            country_code=country,
            limit=3,
            include_scrape=False,
        )
        if socialData.get('status') == 'success':
            for result in socialData.get('serpResults', [])[:3]:
                text = f"{result.get('title', '')} — {result.get('description', '')}"
                if text.strip():
                    rows.append((text[:1000], result.get('source', 'social'), result.get('url', ''), country, category))

        marketData = runMarketplaceDiscovery(
            keyword=keyword,
            marketplace=marketplace,
            country_code=country,
            limit=3,
            include_scrape=False,
        )
        if marketData.get('status') == 'success':
            for result in marketData.get('results', [])[:3]:
                record = result.get('record') or {}
                metrics = []
                for key in ['final_price', 'price', 'rating', 'reviews_count', 'review_count', 'sold', 'number_sold', 'gmv']:
                    if isinstance(record, dict) and record.get(key) is not None:
                        metrics.append(f'{key}={record.get(key)}')
                text = f"{result.get('title', '')} — {result.get('description', '')}"
                if metrics:
                    text = f"{text} ({', '.join(metrics)})"
                if text.strip():
                    rows.append((text[:1000], 'marketplace', result.get('url', ''), country, category))

    if rows:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.executemany(
                    'INSERT INTO marketSignals (signalText, sourceType, sourceUrl, signalDate, country, category) '
                    'VALUES (%s, %s, %s, CURRENT_DATE, %s, %s)',
                    rows,
                )

    stored = len(rows)
    print(f'[scraping] Done. Stored {stored} signals for category={category}, country={country}')
    return {'category': category, 'country': country, 'keywords': keywords, 'signals_stored': stored, 'status': 'completed'}


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

    personaData = _parseInsights(rawText)
    return {'status': 'completed', 'personaData': personaData}


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


@celeryApp.task(name='processLlmInsights', queue='synthesis', bind=True, max_retries=3)
def processLlmInsights(self, categoryName: str, country: str = ''):
    print(f'Worker picked up job for category: {categoryName}, country: {country}')

    signals = _fetchRelevantSignals(categoryName, country)
    if not signals:
        try:
            raise self.retry(countdown=90)
        except self.MaxRetriesExceededError:
            return {
                'category': categoryName,
                'status': 'failed',
                'error': 'No signals found after retries.',
            }

    translatedSignals = _translateSignalsIfNeeded(signals)
    insights = _runLlmInsights(categoryName, translatedSignals)
    _saveCategoryInsights(categoryName, country, insights)

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
