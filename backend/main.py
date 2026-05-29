import asyncio
import json
import os
from functools import partial
from typing import Any

from fastapi import FastAPI, HTTPException, Path, Request
from pydantic import BaseModel, Field

_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://consumeriq:consumeriq@postgres.consumeriq.svc.cluster.local:5432/consumeriq',
)
from backend.api.marketplaceScrape import router as marketplaceRouter
from backend.api.serpSearch import router as serpRouter
from backend.api.socialScrape import router as socialRouter
from backend.api.brightdataSchemas import router as brightdataSchemasRouter
from backend.api.brightdataScrape import router as brightdataScrapeRouter

_REDIS_URL = os.getenv('REDIS_URL', 'redis://redis.consumeriq.svc.cluster.local:6379/0')
_INFERENCE_QUEUE_LIMIT = int(os.getenv('INFERENCE_QUEUE_LIMIT', '5'))
_BACKPRESSURE_ENABLED = os.getenv('BACKPRESSURE_ENABLED', 'false').lower() == 'true'
_ADMIN_API_TOKEN = os.getenv('ADMIN_API_TOKEN', '')
_DAILY_REFRESH_ENABLED = os.getenv('DAILY_REFRESH_ENABLED', 'false').lower() == 'true'
_COMPLIANCE_SCRAPE_ENABLED = os.getenv('COMPLIANCE_SCRAPE_ENABLED', 'false').lower() == 'true'
_SIGNAL_TTL_ENABLED = os.getenv('SIGNAL_TTL_ENABLED', 'false').lower() == 'true'
_SIGNAL_TTL_MONTHS = int(os.getenv('SIGNAL_TTL_MONTHS', '4'))
_COGNEE_ENABLED = os.getenv('COGNEE_ENABLED', 'false').lower() == 'true'


def _require_admin(request: Request) -> None:
    token = request.headers.get('X-Admin-Token', '')
    if not _ADMIN_API_TOKEN or token != _ADMIN_API_TOKEN:
        raise HTTPException(status_code=401, detail='Admin token required')


def _fetchAllFormUserIds() -> list[int]:
    import psycopg2
    with psycopg2.connect(_DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT DISTINCT user_id FROM founderForms')
            return [int(row[0]) for row in cur.fetchall()]


def _inferenceQueueDepth() -> int:
    import redis as redis_lib
    try:
        return redis_lib.from_url(_REDIS_URL).llen('inference')
    except Exception:
        return 0


def _fetchUserContextSync(user_id: str) -> dict | None:
    try:
        import psycopg2
        with psycopg2.connect(_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT payload FROM founderforms WHERE user_id = %s ORDER BY createdat DESC LIMIT 1',
                    (int(user_id),),
                )
                row = cur.fetchone()
                if row:
                    return json.loads(row[0]) if isinstance(row[0], str) else row[0]
    except Exception:
        return None
    return None


async def _fetchUserContext(user_id: str) -> dict | None:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_fetchUserContextSync, user_id))


def _extractBearerToken(request: Request) -> str:
    authorization = request.headers.get('Authorization', '')
    if authorization.startswith('Bearer '):
        return authorization.removeprefix('Bearer ').strip()
    cookie_token = request.cookies.get('session')
    return cookie_token.strip() if cookie_token else ''


def _resolveUserIdFromRequest(request: Request) -> str | None:
    user_id = request.headers.get('X-User-Id')
    if user_id:
        return user_id

    token = _extractBearerToken(request)
    if not token:
        return None

    try:
        import redis as redis_lib

        rdb = redis_lib.from_url(_REDIS_URL)
        raw = rdb.get(f'session:{token}')
        if not raw:
            return None
        session = json.loads(raw.decode('utf-8') if isinstance(raw, bytes) else raw)
        resolved_id = session.get('user_id') or session.get('UserID')
        return str(resolved_id) if resolved_id else None
    except Exception:
        return None


app = FastAPI(title='ConsumerIQ API')
app.include_router(marketplaceRouter)
app.include_router(serpRouter)
app.include_router(socialRouter)
app.include_router(brightdataSchemasRouter)
app.include_router(brightdataScrapeRouter)

class AgentRunRequest(BaseModel):
    prompt: str
    max_steps: int = 6


class ScrapeMarketSignalsRequest(BaseModel):
    category: str
    keywords: list[str]
    form_id: str = ''
    country: str = 'us'
    marketplace: str = 'amazon'
    product_name: str = ''
    product_description: str = ''
    unique_selling_point: str = ''
    main_features: str = ''
    competitive_advantage: str = ''
    pain_point: str = ''
    customer_segment: str = ''
    price_range_min: int = 0
    price_range_max: int = 0


class ScanMarketRequest(BaseModel):
    category: str
    country: str = ''


class PersonaDecodeRequest(BaseModel):
    category: str
    country: str = 'us'
    marketplace: str = 'amazon'
    customerSegment: str = ''
    painPoint: str = ''
    priceRangeMin: int = 0
    priceRangeMax: int = 0
    productName: str = ''
    productDescription: str = ''
    region: str = ''


class ExtraAnalysisRequest(BaseModel):
    category: str
    country: str = ''
    insights: dict[str, Any]
    signals: list[dict[str, Any]] = Field(default_factory=list)


@app.post('/api/agent/run')
async def agentRun(payload: AgentRunRequest, request: Request):
    if _BACKPRESSURE_ENABLED and _inferenceQueueDepth() >= _INFERENCE_QUEUE_LIMIT:
        raise HTTPException(status_code=503, detail='Inference queue full, try again later')

    try:
        from backend.redis.worker import runAgentTask
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f'Agent worker dependency is not installed: {error.name}',
        ) from error

    user_id = request.headers.get('X-User-Id')
    user_context = await _fetchUserContext(user_id) if user_id else None

    task = runAgentTask.delay(payload.prompt, payload.max_steps, user_context)

    return {'message': 'ReAct agent queued', 'taskId': task.id, 'status': 'processing', 'prompt': payload.prompt}


@app.get('/api/agent/session/{session_id}')
async def agentSession(session_id: str = Path(..., alias='session_id')):
    from backend.agent.session import getRedisClient, getFullSession

    redis_client = getRedisClient()
    return getFullSession(redis_client, session_id)


@app.post('/api/scrape-market-signals')
async def scrapeMarketSignals(payload: ScrapeMarketSignalsRequest):
    from backend.redis.worker import scrapeMarketSignals as scrapeTask
    task = scrapeTask.delay(
        payload.category,
        payload.keywords,
        payload.country,
        payload.marketplace,
        payload.product_name,
        payload.product_description,
        payload.unique_selling_point,
        payload.main_features,
        payload.competitive_advantage,
        payload.pain_point,
        payload.customer_segment,
        payload.price_range_min,
        payload.price_range_max,
        payload.form_id,
    )
    return {'taskId': task.id, 'status': 'processing', 'queue': 'scraping'}


@app.post('/api/scan-market')
async def scanMarket(payload: ScanMarketRequest):
    try:
        from backend.redis.worker import processLlmInsights
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f'LLM worker dependency is not installed: {error.name}',
        ) from error

    task = processLlmInsights.delay(payload.category, payload.country)

    return {'message': f'Successfully queued LLM analysis for {payload.category}', 'taskId': task.id, 'status': 'processing'}


@app.post('/api/persona-decode')
async def personaDecodeRun(payload: PersonaDecodeRequest):
    if _BACKPRESSURE_ENABLED and _inferenceQueueDepth() >= _INFERENCE_QUEUE_LIMIT:
        raise HTTPException(status_code=503, detail='Inference queue full, try again later')

    from backend.redis.worker import runPersonaDecodeTask
    task = runPersonaDecodeTask.delay(payload.model_dump())
    return {'taskId': task.id, 'status': 'processing'}


@app.post('/api/insights/extra-analysis')
async def createInsightExtraAnalysis(payload: ExtraAnalysisRequest):
    try:
        from backend.models.openai_cross_reference import create_extra_analysis
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f'OpenAI extra analysis dependency is not installed: {error.name}',
        ) from error

    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(
            None,
            partial(
                create_extra_analysis,
                category=payload.category,
                country=payload.country,
                insights=payload.insights,
                signals=payload.signals,
            ),
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=f'OpenAI extra analysis failed: {error}') from error


@app.get('/api/insights/me')
async def getInsightsForCurrentUser(request: Request):
    import psycopg2

    user_id = _resolveUserIdFromRequest(request)
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')

    def _fetch() -> dict | None:
        with psycopg2.connect(_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT payload FROM founderforms WHERE user_id = %s ORDER BY createdat DESC LIMIT 1',
                    (int(user_id),),
                )
                row = cur.fetchone()
                if not row:
                    return None
                form = json.loads(row[0]) if isinstance(row[0], str) else row[0]
                category = form.get('industry', '')
                country = form.get('countryCode', 'us')
                cur.execute(
                    '''SELECT gtmintelligence, financeintelligence, securitycompliance,
                              extraanalysis, status, lastupdated
                       FROM categoryinsights
                       WHERE category = %s AND country = %s
                       ORDER BY lastupdated DESC LIMIT 1''',
                    (category, country),
                )
                ins = cur.fetchone()
                if not ins:
                    return {'status': 'pending', 'category': category, 'country': country}
                return {
                    'status': ins[4],
                    'category': category,
                    'country': country,
                    'gtmIntelligence': ins[0],
                    'financeIntelligence': ins[1],
                    'securityCompliance': ins[2],
                    'extraAnalysis': ins[3],
                    'lastUpdated': ins[5].isoformat() if ins[5] else None,
                }

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _fetch)
    if result is None:
        raise HTTPException(status_code=404, detail='No form found for this user')
    return result


@app.get('/api/form-pipeline/{form_id}')
async def getFormPipeline(formId: str = Path(..., alias='form_id')):
    import redis as redis_lib
    try:
        r = redis_lib.from_url(_REDIS_URL)
        raw = r.get(f'form_pipeline:{formId}')
    except Exception:
        raise HTTPException(status_code=503, detail='Redis unavailable')

    if not raw:
        return {
            'scraping': {'status': 'pending', 'signalsStored': 0},
            'inference': {'status': 'pending'},
        }

    pipeline = json.loads(raw)

    result: dict = {}

    scrape_task_id = pipeline.get('scrape_task_id', '')
    if scrape_task_id:
        try:
            from celery.result import AsyncResult
            from backend.redis.worker import celeryApp
            sr = AsyncResult(scrape_task_id, app=celeryApp)
            if sr.successful():
                scrape_result = sr.result or {}
                result['scraping'] = {'status': 'completed', 'signalsStored': scrape_result.get('signals_stored', 0)}
            elif sr.failed():
                result['scraping'] = {'status': 'failed', 'signalsStored': 0}
            else:
                result['scraping'] = {'status': 'processing', 'signalsStored': 0}
        except Exception:
            result['scraping'] = {'status': 'unknown', 'signalsStored': 0}
    else:
        result['scraping'] = {'status': 'pending', 'signalsStored': 0}

    inference_stage = pipeline.get('inference_stage', 'pending')
    inference_task_id = pipeline.get('inference_task_id', '')
    if inference_task_id:
        try:
            from celery.result import AsyncResult
            from backend.redis.worker import celeryApp
            ir = AsyncResult(inference_task_id, app=celeryApp)
            if ir.successful():
                if inference_stage == 'failed':
                    result['inference'] = {'status': 'failed', 'stage': 'failed'}
                elif inference_stage == 'completed':
                    result['inference'] = {'status': 'completed', 'stage': 'completed'}
                else:
                    result['inference'] = {'status': 'processing', 'stage': inference_stage or 'synthesizing'}
            elif ir.failed():
                result['inference'] = {'status': 'failed', 'stage': 'failed'}
            else:
                result['inference'] = {'status': 'processing', 'stage': inference_stage or 'pending'}
        except Exception:
            result['inference'] = {'status': 'unknown', 'stage': inference_stage or 'pending'}
    else:
        result['inference'] = {'status': 'pending', 'stage': 'pending'}

    return result


@app.post('/api/admin/trigger-daily-refresh')
async def triggerDailyRefresh(request: Request):
    _require_admin(request)
    if not _DAILY_REFRESH_ENABLED:
        return {'status': 'skipped', 'reason': 'DAILY_REFRESH_ENABLED=false'}

    try:
        from backend.redis.worker import refreshUserMarketSignals
    except ModuleNotFoundError as error:
        raise HTTPException(status_code=503, detail=f'Worker dependency missing: {error.name}') from error

    loop = asyncio.get_event_loop()
    user_ids = await loop.run_in_executor(None, _fetchAllFormUserIds)
    queued = [{'user_id': uid, 'task_id': refreshUserMarketSignals.delay(uid).id} for uid in user_ids]
    return {'status': 'queued', 'count': len(queued), 'tasks': queued}


class CogneeSearchRequest(BaseModel):
    query: str
    category: str = ''
    country: str = ''
    searchType: str = 'graph_completion'


@app.post('/api/admin/cognee-search')
async def cogneeSearch(payload: CogneeSearchRequest, request: Request):
    _require_admin(request)
    if not _COGNEE_ENABLED:
        return {'status': 'skipped', 'reason': 'COGNEE_ENABLED=false'}

    try:
        from backend.models.cognee_memory import search_memory
    except ModuleNotFoundError as error:
        raise HTTPException(status_code=503, detail=f'Cognee dependency missing: {error.name}') from error

    try:
        results = await search_memory(
            query=payload.query,
            category=payload.category,
            country=payload.country,
            search_type=payload.searchType,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Cognee search failed: {exc}') from exc

    return {'status': 'completed', 'query': payload.query, 'results': results}


@app.post('/api/admin/prune-old-signals')
async def pruneOldSignals(request: Request):
    _require_admin(request)
    if not _SIGNAL_TTL_ENABLED:
        return {'status': 'skipped', 'reason': 'SIGNAL_TTL_ENABLED=false'}

    import psycopg2
    months = max(1, _SIGNAL_TTL_MONTHS)

    def _prune() -> int:
        with psycopg2.connect(_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"DELETE FROM marketSignals WHERE signalDate < CURRENT_DATE - INTERVAL '{months} months'"
                )
                return cur.rowcount

    loop = asyncio.get_event_loop()
    deleted = await loop.run_in_executor(None, _prune)
    return {'status': 'completed', 'deletedRows': deleted, 'cutoffMonths': months}


@app.post('/api/admin/trigger-compliance-scrape')
async def triggerComplianceScrape(request: Request):
    _require_admin(request)
    if not _COMPLIANCE_SCRAPE_ENABLED:
        return {'status': 'skipped', 'reason': 'COMPLIANCE_SCRAPE_ENABLED=false'}

    try:
        from backend.redis.worker import scrapeComplianceSignals
    except ModuleNotFoundError as error:
        raise HTTPException(status_code=503, detail=f'Worker dependency missing: {error.name}') from error

    loop = asyncio.get_event_loop()
    user_ids = await loop.run_in_executor(None, _fetchAllFormUserIds)
    queued = [{'user_id': uid, 'task_id': scrapeComplianceSignals.delay(uid).id} for uid in user_ids]
    return {'status': 'queued', 'count': len(queued), 'tasks': queued}


@app.get('/api/task-status/{task_id}')
async def getTaskStatus(taskId: str = Path(..., alias='task_id')):
    try:
        from celery.result import AsyncResult
        from backend.redis.worker import celeryApp
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f'Worker dependency is not installed: {error.name}',
        ) from error

    taskResult = AsyncResult(taskId, app=celeryApp)

    if taskResult.successful():
        return {'taskId': taskId, 'status': 'completed', 'result': taskResult.result}
    if taskResult.failed():
        return {'taskId': taskId, 'status': 'failed', 'error': str(taskResult.result)}
    return {'taskId': taskId, 'status': 'processing'}
