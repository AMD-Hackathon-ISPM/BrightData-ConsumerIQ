import re
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.brightdata.client import scrape_brightdata

router = APIRouter(tags=['social'])


def normalizeText(text: str):
    return re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', text or '')).strip()


def detectSourceFromUrl(url: str):
    lowered = url.lower()
    if 'reddit.com' in lowered:
        return 'reddit'
    if 'twitter.com' in lowered or 'x.com' in lowered:
        return 'twitter'
    if 'youtube.com' in lowered:
        return 'youtube'
    if 'tiktok.com' in lowered:
        return 'tiktok'
    return 'social'


def _endpointForSocialUrl(url: str) -> str | None:
    lowered = url.lower()

    if 'instagram.com' in lowered:
        if '/reel/' in lowered:
            return 'instagram.reels.collect_url'
        if '/p/' in lowered:
            return 'instagram.posts.collect_url'
        return 'instagram.profiles.collect_url'

    if 'x.com' in lowered or 'twitter.com' in lowered:
        if '/status/' in lowered:
            return 'x.posts.collect_url'
        return 'x.profiles.collect_url'

    if 'tiktok.com' in lowered or 'shop-' in lowered:
        if '/shop/c/' in lowered:
            return 'tiktok.shop.category.collect_url'
        if '/shop/store/' in lowered:
            return 'tiktok.shop.products.discover_shop'
        if '/view/product/' in lowered or '/pdp/' in lowered:
            return 'tiktok.shop.products.collect_url'
        if '/discover/' in lowered or '/channel/' in lowered or '/music/' in lowered or '/explore' in lowered:
            return 'tiktok.discover_pages.collect_url'
        if '/search?' in lowered:
            return 'tiktok.search_results.collect_url'
        if '/video/' in lowered:
            return 'tiktok.posts.collect_url'
        return 'tiktok.profiles.collect_url'

    return None


def _recordsFromResult(result: dict[str, Any]) -> list[dict[str, Any]]:
    records = result.get('records')
    if isinstance(records, list):
        return [record for record in records if isinstance(record, dict)]
    if isinstance(records, dict):
        return [records]
    return []


def _socialSignalFromRecord(record: dict[str, Any], fallback_source: str, fallback_url: str) -> dict[str, Any]:
    title = (
        record.get('description')
        or record.get('comment_text')
        or record.get('comment')
        or record.get('biography')
        or record.get('caption')
        or record.get('title')
        or record.get('profile_name')
        or record.get('nickname')
        or ''
    )
    return {
        'source': fallback_source,
        'title': str(title)[:300],
        'url': str(record.get('url') or record.get('post_url') or record.get('profile_url') or fallback_url),
        'origin': 'brightdata_dataset',
        'engagement': {
            'likes': record.get('likes') or record.get('digg_count') or record.get('num_likes'),
            'comments': record.get('num_comments') or record.get('comment_count'),
            'views': record.get('views') or record.get('play_count') or record.get('video_play_count'),
            'shares': record.get('share_count') or record.get('num_share_count'),
            'followers': record.get('followers') or record.get('profile_followers'),
        },
    }


class SocialScrapeRequest(BaseModel):
    url: str
    keyword: str | None = None
    country_code: str = 'us'
    render_js: bool = True


class SocialDiscoveryRequest(BaseModel):
    keyword: str
    country_code: str = 'us'
    language: str = 'en'
    limit: int = 5
    include_scrape: bool = True


def extractRedditSignals(text: str):
    clean = normalizeText(text)
    lines = clean.splitlines()
    signals = []

    for index, line in enumerate(lines):
        if line.startswith('r/'):
            title = lines[index - 1] if index > 0 else ''
            snippet = lines[index + 2] if index + 2 < len(lines) else ''
            engagement = ''

            for nearby in lines[index : index + 8]:
                if 'votes' in nearby or 'comments' in nearby:
                    engagement = nearby
                    break

            if title:
                signals.append({
                    'source': 'reddit',
                    'community': line,
                    'title': title,
                    'snippet': snippet,
                    'engagement': engagement,
                })

    return signals[:10]


def extractTwitterSignals(text: str):
    clean = normalizeText(text)
    lines = clean.splitlines()
    signals = []

    for index, line in enumerate(lines):
        if not line.startswith('@'):
            continue

        author = line
        tweet_parts = []

        for nearby in lines[index + 1 : index + 8]:
            nearby_lower = nearby.lower()
            if nearby.startswith('@'):
                break
            if any(marker in nearby_lower for marker in ['reposts', 'likes', 'views', 'replies']):
                break
            if len(nearby) > 20:
                tweet_parts.append(nearby)

        tweet_text = ' '.join(tweet_parts).strip()
        engagement = ''

        for nearby in lines[index : index + 12]:
            nearby_lower = nearby.lower()
            if any(marker in nearby_lower for marker in ['reposts', 'likes', 'views', 'replies']):
                engagement = nearby
                break

        if tweet_text:
            signals.append({
                'source': 'twitter',
                'author': author,
                'text': tweet_text,
                'engagement': engagement,
            })

    return signals[:10]


def extractSocialSignals(url: str, text: str):
    source = detectSourceFromUrl(url)

    if source == 'reddit':
        return extractRedditSignals(text)

    if source == 'twitter':
        return extractTwitterSignals(text)

    return []


def runSocialScrape(
    url: str,
    keyword: str | None = None,
    country_code: str = 'us',
    render_js: bool = True,
) -> dict:
    endpoint = _endpointForSocialUrl(url)
    if endpoint is None:
        return {
            'status': 'unsupported_social_source',
            'source': 'brightdata',
            'sourceUrl': url,
            'keyword': keyword,
            'countryCode': country_code,
            'error': 'No Bright Data social endpoint is configured for this URL.',
        }

    result = scrape_brightdata(
        endpoint_key=endpoint,
        input_records=[{'url': url}],
    )
    records = _recordsFromResult(result)
    source = detectSourceFromUrl(url)

    return {
        **result,
        'sourceUrl': url,
        'keyword': keyword,
        'countryCode': country_code,
        'signals': [
            _socialSignalFromRecord(record, source, url)
            for record in records[:10]
        ],
    }


def runSocialDiscovery(
    keyword: str,
    country_code: str = 'us',
    language: str = 'en',
    limit: int = 5,
    include_scrape: bool = True,
) -> dict:
    country = country_code.upper() if country_code else ''
    result = scrape_brightdata(
        endpoint_key='tiktok.posts.discover_keyword',
        input_records=[{'search_keyword': keyword, 'country': country}],
    )
    records = _recordsFromResult(result)
    serp_results = [
        {
            'title': str(record.get('description') or record.get('title') or '')[:300],
            'description': str(record.get('profile_biography') or record.get('description') or '')[:500],
            'url': str(record.get('url') or record.get('post_url') or ''),
            'source': 'tiktok',
            'record': record,
        }
        for record in records[:limit]
    ]

    return {
        **result,
        'keyword': keyword,
        'countryCode': country_code,
        'language': language,
        'serpResults': serp_results,
        'scrapeResults': [],
    }


@router.post('/api/social-scrape', status_code=202)
async def socialScrape(payload: SocialScrapeRequest):
    from backend.redis.worker import scrapeSocialPage
    task = scrapeSocialPage.delay(payload.url, payload.keyword, payload.country_code, payload.render_js)
    return JSONResponse(status_code=202, content={'taskId': task.id, 'status': 'queued', 'queue': 'scraping'})


@router.post('/api/social-discovery', status_code=202)
async def socialDiscovery(payload: SocialDiscoveryRequest):
    from backend.redis.worker import scrapeSocialDiscovery
    task = scrapeSocialDiscovery.delay(
        payload.keyword, payload.country_code, payload.language,
        payload.limit, payload.include_scrape,
    )
    return JSONResponse(status_code=202, content={'taskId': task.id, 'status': 'queued', 'queue': 'scraping'})
