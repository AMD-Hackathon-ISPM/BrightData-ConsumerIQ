from __future__ import annotations


def _trunc(s: str, n: int = 80) -> str:
    return s[:n] + '...' if len(s) > n else s


def _summarizeSerpSearch(result: dict) -> str:
    results = result.get('results', [])
    lines = [f'Found {len(results)} web results:']
    for r in results[:3]:
        lines.append(f'  • {_trunc(r.get("title", ""), 60)} — {r.get("url", "")}')
        desc = r.get('description', '')
        if desc:
            lines.append(f'    {_trunc(desc, 100)}')
    return '\n'.join(lines)


def _summarizeMarketplaceDiscovery(result: dict) -> str:
    marketplace = result.get('marketplace', '?')
    keyword = result.get('keyword', '?')
    results = result.get('results', [])
    lines = [f"Found {len(results)} listings for '{keyword}' on {marketplace}:"]
    for r in results[:3]:
        lines.append(f'  • {_trunc(r.get("title", ""), 70)} — {r.get("url", "")}')
    return '\n'.join(lines)


def _summarizeSocialDiscovery(result: dict) -> str:
    keyword = result.get('keyword', '?')
    results = result.get('results', [])
    lines = [f"Found {len(results)} social posts for '{keyword}':"]
    for r in results[:3]:
        source = r.get('source', '?')
        lines.append(f'  • [{source}] {_trunc(r.get("title", ""), 80)}')
    return '\n'.join(lines)


def _summarizeMarketplaceScrape(result: dict) -> str:
    url = result.get('url', '?')
    signals = result.get('signals', {})
    prices = signals.get('prices', [])[:4]
    tags = [t.get('tag', '') for t in signals.get('review_tags', [])[:4]]
    blocked = signals.get('page_blocked', False)
    lines = [f'Scraped: {_trunc(url, 70)}']
    lines.append(f'  Prices: {", ".join(prices) or "none found"}')
    lines.append(f'  Top review tags: {", ".join(tags) or "none"}')
    if blocked:
        lines.append('  WARNING: page was blocked/login-gated')
    amazon = signals.get('amazon_specific', {})
    if amazon:
        rating = amazon.get('average_rating')
        total = amazon.get('total_reviews')
        if rating:
            lines.append(f'  Amazon rating: {rating}/5 ({total} reviews)')
        reviews = amazon.get('individual_reviews', [])
        for rev in reviews[:2]:
            lines.append(f'  Review: "{_trunc(rev.get("body", ""), 80)}"')
    mentions = signals.get('product_mentions', [])[:2]
    for m in mentions:
        lines.append(f'  Mention: {_trunc(m, 80)}')
    return '\n'.join(lines)


def _summarizeSocialScrape(result: dict) -> str:
    url = result.get('url', '?')
    signals = result.get('signals', [])
    lines = [f'Scraped: {_trunc(url, 70)}']
    lines.append(f'  Found {len(signals)} posts/signals:')
    for s in signals[:4]:
        source = s.get('source', '?')
        community = s.get('community', '')
        title = s.get('title', s.get('text', ''))
        engagement = s.get('engagement', '')
        suffix = f' in {community}' if community else ''
        eng_str = f' [{engagement}]' if engagement else ''
        lines.append(f'  • [{source}{suffix}]{eng_str} {_trunc(title, 80)}')
    return '\n'.join(lines)


_HANDLERS = {
    'serp_search': _summarizeSerpSearch,
    'marketplace_discovery': _summarizeMarketplaceDiscovery,
    'social_discovery': _summarizeSocialDiscovery,
    'marketplace_scrape': _summarizeMarketplaceScrape,
    'social_scrape': _summarizeSocialScrape,
}


def summarizeObservation(tool_name: str, result: dict) -> str:
    if 'error' in result:
        return f'Tool error: {result["error"]}'
    if result.get('truncated'):
        return f'[Result was truncated] Preview: {_trunc(result.get("preview", ""), 200)}'
    handler = _HANDLERS.get(tool_name, lambda r: str(r)[:300])
    return handler(result)


def keyFinding(tool_name: str, action_input: dict, result: dict) -> str:
    """Single-line bullet for the running findings list persisted in Redis."""
    if 'error' in result:
        return f'[{tool_name}] ERROR — {result["error"]}'
    summary = summarizeObservation(tool_name, result)
    first_line = summary.splitlines()[0] if summary else 'no data'
    query = action_input.get('query') or action_input.get('keyword') or action_input.get('url', '')
    return f'[{tool_name}] {_trunc(query, 40)} → {first_line}'
