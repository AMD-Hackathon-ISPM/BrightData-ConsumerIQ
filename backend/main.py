import asyncio
import json
import os
from functools import partial

from fastapi import FastAPI, HTTPException, Path, Request
from pydantic import BaseModel

_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://consumeriq:consumeriq@postgres.consumeriq.svc.cluster.local:5432/consumeriq',
)
from backend.api.marketplaceScrape import router as marketplaceRouter
from backend.api.serpSearch import router as serpRouter
from backend.api.socialScrape import router as socialRouter

_REDIS_URL = os.getenv('REDIS_URL', 'redis://redis.consumeriq.svc.cluster.local:6379/0')
_INFERENCE_QUEUE_LIMIT = int(os.getenv('INFERENCE_QUEUE_LIMIT', '5'))
_BACKPRESSURE_ENABLED = os.getenv('BACKPRESSURE_ENABLED', 'false').lower() == 'true'


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


app = FastAPI(title='ConsumerIQ API')
app.include_router(marketplaceRouter)
app.include_router(serpRouter)
app.include_router(socialRouter)

class AgentRunRequest(BaseModel):
    prompt: str
    max_steps: int = 6


class ScrapeMarketSignalsRequest(BaseModel):
    category: str
    keywords: list[str]
    country: str = 'us'
    marketplace: str = 'amazon'


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
    task = scrapeTask.delay(payload.category, payload.keywords, payload.country, payload.marketplace)
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


@app.get('/api/form-pipeline/{form_id}')
async def getFormPipeline(formId: str = Path(..., alias='form_id')):
    import redis as redis_lib
    try:
        r = redis_lib.from_url(_REDIS_URL)
        raw = r.get(f'form_pipeline:{formId}')
    except Exception:
        raise HTTPException(status_code=503, detail='Redis unavailable')

    if not raw:
        raise HTTPException(status_code=404, detail='Pipeline not found')

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
        result['scraping'] = {'status': 'skipped', 'signalsStored': 0}

    inference_task_id = pipeline.get('inference_task_id', '')
    if inference_task_id:
        try:
            from celery.result import AsyncResult
            from backend.redis.worker import celeryApp
            ir = AsyncResult(inference_task_id, app=celeryApp)
            if ir.successful():
                result['inference'] = {'status': 'completed'}
            elif ir.failed():
                result['inference'] = {'status': 'failed'}
            else:
                result['inference'] = {'status': 'processing'}
        except Exception:
            result['inference'] = {'status': 'unknown'}
    else:
        result['inference'] = {'status': 'skipped'}

    return result


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
