import asyncio
import json
import os
from functools import partial

from fastapi import FastAPI, HTTPException, Path, Request
from pydantic import BaseModel
from celery.result import AsyncResult
from backend.redis.worker import celeryApp, processLlmInsights

_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://consumeriq:consumeriq@postgres.consumeriq.svc.cluster.local:5432/consumeriq',
)
from backend.api.marketplaceScrape import router as marketplaceRouter
from backend.api.serpSearch import router as serpRouter
from backend.api.socialScrape import router as socialRouter

_REDIS_URL = os.getenv('REDIS_URL', 'redis://redis.consumeriq.svc.cluster.local:6379/0')
_INFERENCE_QUEUE_LIMIT = 5


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


@app.post('/api/agent/run')
async def agentRun(payload: AgentRunRequest, request: Request):
    if _inferenceQueueDepth() >= _INFERENCE_QUEUE_LIMIT:
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
    task = scrapeTask.delay(payload.category, payload.keywords)
    return {'taskId': task.id, 'status': 'processing', 'queue': 'scraping'}


@app.post('/api/scan-market/{category_name}')
async def scanMarket(categoryName: str = Path(..., alias='category_name')):
    try:
        from backend.redis.worker import processLlmInsights
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f'LLM worker dependency is not installed: {error.name}',
        ) from error

    task = processLlmInsights.delay(categoryName)

    return {'message': f'Successfully queued LLM analysis for {categoryName}', 'taskId': task.id, 'status': 'processing'}


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

    if taskResult.ready():
        return {'taskId': taskId, 'status': 'completed', 'result': taskResult.result}

    return {'taskId': taskId, 'status': 'processing'}
