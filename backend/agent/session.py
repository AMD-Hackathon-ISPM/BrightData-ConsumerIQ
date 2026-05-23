from __future__ import annotations
import json
import os
import time
from typing import Any

import redis as redis_lib

REDIS_URL = os.getenv('REDIS_URL', 'redis://redis.consumeriq.svc.cluster.local:6379/0')
_TTL = 3600  # 1 hour


def getRedisClient() -> redis_lib.Redis:
    return redis_lib.from_url(REDIS_URL, decode_responses=True)


def _key(session_id: str, suffix: str) -> str:
    return f'react:{session_id}:{suffix}'


def initSession(client: redis_lib.Redis, session_id: str, prompt: str) -> None:
    client.set(
        _key(session_id, 'meta'),
        json.dumps({'prompt': prompt, 'created_at': time.time(), 'status': 'running'}),
        ex=_TTL,
    )


def saveStep(client: redis_lib.Redis, session_id: str, step: dict[str, Any]) -> None:
    client.set(
        _key(session_id, f'step:{step["step"]}'),
        json.dumps(step, ensure_ascii=False),
        ex=_TTL,
    )


def appendFinding(client: redis_lib.Redis, session_id: str, finding: str) -> None:
    key = _key(session_id, 'findings')
    raw = client.get(key)
    findings: list[str] = json.loads(raw) if raw else []
    findings.append(finding)
    client.set(key, json.dumps(findings, ensure_ascii=False), ex=_TTL)


def getFindings(client: redis_lib.Redis, session_id: str) -> list[str]:
    raw = client.get(_key(session_id, 'findings'))
    return json.loads(raw) if raw else []


def closeSession(client: redis_lib.Redis, session_id: str, *, success: bool) -> None:
    key = _key(session_id, 'meta')
    raw = client.get(key)
    meta: dict = json.loads(raw) if raw else {}
    meta['status'] = 'done' if success else 'failed'
    meta['finished_at'] = time.time()
    client.set(key, json.dumps(meta), ex=_TTL)


def getFullSession(client: redis_lib.Redis, session_id: str) -> dict[str, Any]:
    meta_raw = client.get(_key(session_id, 'meta'))
    findings_raw = client.get(_key(session_id, 'findings'))

    steps: list[dict] = []
    for i in range(1, 20):
        raw = client.get(_key(session_id, f'step:{i}'))
        if raw is None:
            break
        steps.append(json.loads(raw))

    return {
        'session_id': session_id,
        'meta': json.loads(meta_raw) if meta_raw else {},
        'findings': json.loads(findings_raw) if findings_raw else [],
        'steps': steps,
    }
