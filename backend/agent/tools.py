from __future__ import annotations
import json
from typing import Any

from backend.api.scrapingbeeClient import (
    normalizeSerpResults,
    normalizeText,
    scrapePageText,
    searchGoogle,
)
from backend.api.marketplaceScrape import (
    MarketplaceDiscoveryRequest,
    buildMarketplaceDiscoveryQuery,
    extractMarketplaceSignals,
)
from backend.api.socialScrape import extractSocialSignals

TOOL_SCHEMAS: dict[str, dict] = {
    'serp_search': {
        'description': 'Search the web for information about any topic',
        'input': {
            'query': 'str — the search query',
            'country_code': 'str (optional, default \'us\')',
        },
    },
    'marketplace_discovery': {
        'description': 'Find product listings on marketplaces via Google SERP',
        'input': {
            'keyword': 'str — product to search',
            'marketplace': 'str (optional: \'taobao\' | \'amazon\' | \'temu\', default \'taobao\')',
            'country_code': 'str (optional, default \'cn\')',
        },
    },
    'social_discovery': {
        'description': 'Find Reddit and Twitter discussions about a topic',
        'input': {
            'keyword': 'str — topic to search',
            'country_code': 'str (optional, default \'us\')',
        },
    },
    'marketplace_scrape': {
        'description': 'Scrape a marketplace product page for prices, reviews, and signals',
        'input': {
            'url': 'str — full URL of a product or review page',
            'keyword': 'str (optional)',
        },
    },
    'social_scrape': {
        'description': 'Scrape a Reddit thread or Twitter page for posts and engagement',
        'input': {
            'url': 'str — full URL',
            'keyword': 'str (optional)',
        },
    },
}


def _compact(data: Any, max_chars: int = 3000) -> Any:
    serialized = json.dumps(data, ensure_ascii=False)
    if len(serialized) <= max_chars:
        return data
    return {'truncated': True, 'preview': serialized[:max_chars]}


def toolSerpSearch(query: str, country_code: str = 'us') -> dict:
    data, error = searchGoogle(query=query, country_code=country_code, nb_results=5)
    if error:
        return {'error': str(error)}
    results = normalizeSerpResults(data)
    return _compact({'results': results[:5]})


def toolMarketplaceDiscovery(
    keyword: str,
    marketplace: str = 'taobao',
    country_code: str = 'cn',
) -> dict:
    req = MarketplaceDiscoveryRequest(
        keyword=keyword,
        marketplace=marketplace,
        country_code=country_code,
        limit=4,
        include_scrape=False,
    )
    query = buildMarketplaceDiscoveryQuery(req)
    data, error = searchGoogle(query=query, country_code=country_code, nb_results=4)
    if error:
        return {'error': str(error)}
    results = normalizeSerpResults(data)
    return _compact({'marketplace': marketplace, 'keyword': keyword, 'results': results})


def toolSocialDiscovery(keyword: str, country_code: str = 'us') -> dict:
    query = f'site:reddit.com OR site:twitter.com {keyword}'
    data, error = searchGoogle(query=query, country_code=country_code, nb_results=5)
    if error:
        return {'error': str(error)}
    results = normalizeSerpResults(data)
    return _compact({'keyword': keyword, 'results': results})


def toolMarketplaceScrape(url: str, keyword: str | None = None) -> dict:
    text, error = scrapePageText(url=url)
    if error:
        return {'error': str(error)}
    clean = normalizeText(text)
    signals = extractMarketplaceSignals(url, text)
    return _compact({'url': url, 'signals': signals, 'textPreview': clean[:1000]})


def toolSocialScrape(url: str, keyword: str | None = None) -> dict:
    text, error = scrapePageText(url=url)
    if error:
        return {'error': str(error)}
    clean = normalizeText(text)
    signals = extractSocialSignals(url, text)
    return _compact({'url': url, 'signals': signals, 'textPreview': clean[:1000]})


_REGISTRY: dict[str, Any] = {
    'serp_search': toolSerpSearch,
    'marketplace_discovery': toolMarketplaceDiscovery,
    'social_discovery': toolSocialDiscovery,
    'marketplace_scrape': toolMarketplaceScrape,
    'social_scrape': toolSocialScrape,
}


def callTool(name: str, inputs: dict) -> dict:
    fn = _REGISTRY.get(name)
    if fn is None:
        return {'error': f'Unknown tool \'{name}\'. Available: {list(_REGISTRY)}'}
    try:
        clean_inputs = {k: v for k, v in inputs.items() if v is not None}
        return fn(**clean_inputs)
    except TypeError as exc:
        return {'error': f'Invalid inputs for \'{name}\': {exc}'}
    except Exception as exc:
        return {'error': f'Tool \'{name}\' raised: {exc}'}
