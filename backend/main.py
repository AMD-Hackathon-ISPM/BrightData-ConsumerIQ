import importlib.util
from pathlib import Path as FsPath
from fastapi import FastAPI, Path
from celery.result import AsyncResult
from backend.redis.worker import celeryApp, processLlmInsights

app = FastAPI(title='ConsumerIQ API')

def loadFounderFormRouter():
    modulePath = FsPath(__file__).parent / 'founder-form' / 'router.py'
    spec = importlib.util.spec_from_file_location('founderFormRouter', modulePath)
    module = importlib.util.module_from_spec(spec)
    if spec and spec.loader:
        spec.loader.exec_module(module)
        return module.router
    raise RuntimeError('Unable to load founder form router')

app.include_router(loadFounderFormRouter())


@app.post('/api/scan-market/{category_name}')
async def scanMarket(categoryName: str = Path(..., alias='category_name')):
    print(f'Received request to scan market for: {categoryName}')

    task = processLlmInsights.delay(categoryName)

    return {
        'message': f'Successfully queued LLM analysis for {categoryName}',
        'task_id': task.id,
        'status': 'processing',
    }


@app.get('/api/task-status/{task_id}')
async def getTaskStatus(taskId: str = Path(..., alias='task_id')):
    taskResult = AsyncResult(taskId, app=celeryApp)

    if taskResult.ready():
        return {'task_id': taskId, 'status': 'completed', 'result': taskResult.result}

    return {'task_id': taskId, 'status': 'processing'}
