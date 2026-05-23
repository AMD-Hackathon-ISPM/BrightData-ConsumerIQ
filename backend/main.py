<<<<<<< HEAD
﻿from fastapi import FastAPI, HTTPException, Path

from backend.api.marketplace_scrape import router as marketplaceRouter
from backend.api.serp_search import router as serpRouter
from backend.api.social_scrape import router as socialRouter

app = FastAPI(title="ConsumerIQ API")
app.include_router(serpRouter)
app.include_router(socialRouter)
app.include_router(marketplaceRouter)


@app.get("/health")
async def health():
    return {"status": "ok"}

=======
from fastapi import FastAPI, Path
from celery.result import AsyncResult
from backend.redis.worker import celeryApp, processLlmInsights
from backend.api.marketplace_scrape import router as marketplaceRouter

app = FastAPI(title='ConsumerIQ API')
app.include_router(marketplaceRouter)
>>>>>>> 89bb938 (fallback and review fix)

@app.post("/api/scan-market/{category_name}")
async def scanMarket(categoryName: str = Path(..., alias="category_name")):
    try:
        from backend.redis.worker import processLlmInsights
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f"LLM worker dependency is not installed: {error.name}",
        ) from error

    task = processLlmInsights.delay(categoryName)

    return {
        "message": f"Successfully queued LLM analysis for {categoryName}",
        "task_id": task.id,
        "status": "processing",
    }


@app.get("/api/task-status/{task_id}")
async def getTaskStatus(taskId: str = Path(..., alias="task_id")):
    try:
        from celery.result import AsyncResult
        from backend.redis.worker import celeryApp
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Worker dependency is not installed: {error.name}",
        ) from error

    taskResult = AsyncResult(taskId, app=celeryApp)

    if taskResult.ready():
        return {
            "task_id": taskId,
            "status": "completed",
            "result": taskResult.result,
        }

    return {
        "task_id": taskId,
        "status": "processing",
    }
