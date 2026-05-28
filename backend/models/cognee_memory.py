from __future__ import annotations

import asyncio
import os
from typing import Any

_COGNEE_ENABLED = os.getenv('COGNEE_ENABLED', 'false').lower() == 'true'
_COGNEE_USE_LOCAL = os.getenv('COGNEE_USE_LOCAL_INFERENCE', 'false').lower() == 'true'

_COGNEE_LLM_PROVIDER = os.getenv('COGNEE_LLM_PROVIDER', 'openai')
_COGNEE_LLM_MODEL = os.getenv('COGNEE_LLM_MODEL', 'gpt-4o-mini')
_COGNEE_LLM_API_KEY = os.getenv('COGNEE_LLM_API_KEY') or os.getenv('OPENAI_API_KEY', '')
_COGNEE_LLM_ENDPOINT = os.getenv('COGNEE_LLM_ENDPOINT') or os.getenv('OPENAI_BASE_URL', '')
_COGNEE_EMBEDDING_MODEL = os.getenv('COGNEE_EMBEDDING_MODEL', 'text-embedding-3-small')
_COGNEE_EMBEDDING_ENDPOINT = os.getenv('COGNEE_EMBEDDING_ENDPOINT') or _COGNEE_LLM_ENDPOINT

_COGNEE_LOCAL_LLM_URL = os.getenv(
    'COGNEE_LOCAL_LLM_URL',
    'http://consumeriq-inference.consumeriq.svc.cluster.local:8080/v1',
)
_COGNEE_LOCAL_LLM_MODEL = os.getenv('COGNEE_LOCAL_LLM_MODEL', 'llama-3.2-3b')
_COGNEE_LOCAL_EMBEDDING_URL = os.getenv(
    'COGNEE_LOCAL_EMBEDDING_URL',
    'http://consumeriq-embeddings.consumeriq.svc.cluster.local:8080/v1',
)
_COGNEE_LOCAL_EMBEDDING_MODEL = os.getenv(
    'COGNEE_LOCAL_EMBEDDING_MODEL',
    'paraphrase-multilingual-MiniLM-L12-v2',
)
_COGNEE_LOCAL_EMBEDDING_DIMS = int(os.getenv('COGNEE_LOCAL_EMBEDDING_DIMS', '384'))


def is_enabled() -> bool:
    if not _COGNEE_ENABLED:
        return False
    if _COGNEE_USE_LOCAL:
        return True
    return bool(_COGNEE_LLM_API_KEY)


def _dataset_name(category: str, country: str) -> str:
    raw = f'market_{category or "general"}_{country or "global"}'
    return ''.join(ch if ch.isalnum() or ch == '_' else '_' for ch in raw).lower()


async def _configure() -> Any:
    import cognee

    if _COGNEE_USE_LOCAL:
        cognee.config.set_llm_provider('openai')
        cognee.config.set_llm_endpoint(_COGNEE_LOCAL_LLM_URL)
        cognee.config.set_llm_model(_COGNEE_LOCAL_LLM_MODEL)
        cognee.config.set_llm_api_key('local-not-required')

        cognee.config.set_embedding_provider('openai')
        cognee.config.set_embedding_endpoint(_COGNEE_LOCAL_EMBEDDING_URL)
        cognee.config.set_embedding_model(_COGNEE_LOCAL_EMBEDDING_MODEL)
        cognee.config.set_embedding_api_key('local-not-required')
        try:
            cognee.config.set_embedding_dimensions(_COGNEE_LOCAL_EMBEDDING_DIMS)
        except AttributeError:
            pass
        return cognee

    cognee.config.set_llm_provider(_COGNEE_LLM_PROVIDER)
    cognee.config.set_llm_model(_COGNEE_LLM_MODEL)
    cognee.config.set_llm_api_key(_COGNEE_LLM_API_KEY)
    if _COGNEE_LLM_ENDPOINT:
        try:
            cognee.config.set_llm_endpoint(_COGNEE_LLM_ENDPOINT)
        except AttributeError:
            pass
    cognee.config.set_embedding_model(_COGNEE_EMBEDDING_MODEL)
    cognee.config.set_embedding_api_key(_COGNEE_LLM_API_KEY)
    if _COGNEE_EMBEDDING_ENDPOINT:
        try:
            cognee.config.set_embedding_endpoint(_COGNEE_EMBEDDING_ENDPOINT)
        except AttributeError:
            pass
    return cognee


async def ingest_signals(
    category: str,
    country: str,
    signals: list[dict[str, Any]],
    tag: str = 'market',
) -> dict[str, Any]:
    if not is_enabled() or not signals:
        return {'status': 'skipped'}

    cognee = await _configure()
    dataset = _dataset_name(f'{tag}_{category}', country)

    documents: list[str] = []
    for signal in signals:
        text = (signal.get('signalText') or '').strip()
        if not text:
            continue
        source = signal.get('sourceType') or 'unknown'
        url = signal.get('sourceUrl') or ''
        prefix = f'[source:{source} category:{category} country:{country}]'
        documents.append(f'{prefix} {text}\nURL: {url}' if url else f'{prefix} {text}')

    if not documents:
        return {'status': 'empty'}

    await cognee.add(documents, dataset_name=dataset)
    await cognee.cognify([dataset])
    return {'status': 'completed', 'dataset': dataset, 'documents': len(documents)}


async def ingest_dashboard(
    category: str,
    country: str,
    dashboard: dict[str, Any],
) -> dict[str, Any]:
    if not is_enabled() or not isinstance(dashboard, dict) or not dashboard:
        return {'status': 'skipped'}

    cognee = await _configure()
    dataset = _dataset_name(f'dashboard_{category}', country)

    snippets: list[str] = []
    cm = dashboard.get('competitorMirror') or {}
    for entry in (cm.get('competitors') or []):
        if isinstance(entry, dict):
            snippets.append(
                f"[entity:competitor category:{category}] {entry.get('brand', '')} — "
                f"sku {entry.get('sku', '')}, price {entry.get('avgPrice', '')}, "
                f"rating {entry.get('rating', '')} ({entry.get('reviews', '')} reviews), "
                f"monthly sales {entry.get('monthlySales', '')}"
            )

    dp = dashboard.get('demandPulse') or {}
    rising = ((dp.get('claimTrends') or {}).get('rising') or [])
    for claim in rising:
        if isinstance(claim, dict):
            snippets.append(
                f"[entity:rising_claim category:{category}] {claim.get('name', '')} "
                f"({claim.get('change', '')}%, volume {claim.get('volume', '')})"
            )

    lc = dashboard.get('launchCompass') or {}
    for city in (lc.get('citySales') or []):
        if isinstance(city, dict):
            snippets.append(
                f"[entity:city_signal category:{category} country:{country}] {city.get('city', '')} — "
                f"{city.get('sales', '')} ({city.get('growth', '')}), {city.get('signal', '')}"
            )

    if not snippets:
        return {'status': 'empty'}

    await cognee.add(snippets, dataset_name=dataset)
    await cognee.cognify([dataset])
    return {'status': 'completed', 'dataset': dataset, 'documents': len(snippets)}


async def search_memory(
    query: str,
    category: str = '',
    country: str = '',
    search_type: str = 'graph_completion',
) -> list[Any]:
    if not is_enabled() or not query.strip():
        return []

    cognee = await _configure()
    from cognee.api.v1.search import SearchType

    type_map = {
        'graph_completion': SearchType.GRAPH_COMPLETION,
        'rag': SearchType.RAG_COMPLETION,
        'insights': SearchType.INSIGHTS,
        'chunks': SearchType.CHUNKS,
    }
    st = type_map.get(search_type.lower(), SearchType.GRAPH_COMPLETION)

    datasets: list[str] = []
    if category:
        datasets.append(_dataset_name(f'market_{category}', country))
        datasets.append(_dataset_name(f'dashboard_{category}', country))
        datasets.append(_dataset_name(f'compliance_{category}', country))

    kwargs: dict[str, Any] = {'query_text': query, 'query_type': st}
    if datasets:
        kwargs['datasets'] = datasets

    return await cognee.search(**kwargs)


def run_async(coro: Any) -> Any:
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            return loop.run_until_complete(coro)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)
