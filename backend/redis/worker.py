import gc
import json
import os
from typing import Any
import psycopg2
from celery import Celery

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


def _formatVector(values: list[float]) -> str:
    return '[' + ','.join(f'{value:.6f}' for value in values) + ']'


def _fetchRelevantSignals(categoryName: str, *, limit: int = 50) -> list[dict[str, Any]]:
    embedder = createEmbedder(verbose=False)
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
    llm = createLlm(verbose=False)
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


@celeryApp.task(name='runAgentTask', bind=True)
def runAgentTask(self, prompt: str, max_steps: int = 6) -> dict[str, Any]:
    from backend.agent.react_agent import runReactAgent
    from backend.agent.session import getRedisClient

    session_id = self.request.id
    redis_client = getRedisClient()
    llm = createLlm(verbose=False)
    try:
        result = runReactAgent(
            prompt,
            llm,
            max_steps=max_steps,
            redis_client=redis_client,
            session_id=session_id,
        )
    finally:
        del llm
        gc.collect()

    return result


@celeryApp.task(name='processLlmInsights')
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
