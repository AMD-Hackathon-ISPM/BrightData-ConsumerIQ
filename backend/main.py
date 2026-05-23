from fastapi import FastAPI, HTTPException, Path
from pydantic import BaseModel
from celery.result import AsyncResult
from backend.redis.worker import celeryApp, processLlmInsights
from backend.api.marketplaceScrape import router as marketplaceRouter
from backend.api.serpSearch import router as serpRouter
from backend.api.socialScrape import router as socialRouter


app = FastAPI(title='ConsumerIQ API')
app.include_router(marketplaceRouter)
app.include_router(serpRouter)
app.include_router(socialRouter)

class AgentRunRequest(BaseModel):
    prompt: str
    max_steps: int = 6


@app.post('/api/agent/run')
async def agentRun(payload: AgentRunRequest):
    try:
        from backend.redis.worker import runAgentTask
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f'Agent worker dependency is not installed: {error.name}',
        ) from error

    task = runAgentTask.delay(payload.prompt, payload.max_steps)

    return {'message': 'ReAct agent queued', 'taskId': task.id, 'status': 'processing', 'prompt': payload.prompt}


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
