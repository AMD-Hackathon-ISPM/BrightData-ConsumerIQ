from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.api.scrapingbeeClient import (
    detectSourceFromUrl,
    normalizeSerpResults,
    normalizeText,
    scrapePageText,
    searchGoogle,
)

router = APIRouter(tags=['social'])


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
    page_text, error = scrapePageText(
        url=url,
        country_code=country_code,
        render_js=render_js,
    )

    if error:
        return error

    clean_text = normalizeText(page_text)
    signals = extractSocialSignals(url, page_text)

    return {
        'status': 'success',
        'source': 'scrapingbee',
        'sourceUrl': url,
        'keyword': keyword,
        'countryCode': country_code,
        'signals': signals,
        'textPreview': clean_text[:2000],
        'rawTextLength': len(page_text),
    }


def runSocialDiscovery(
    keyword: str,
    country_code: str = 'us',
    language: str = 'en',
    limit: int = 5,
    include_scrape: bool = True,
) -> dict:
    query = (
        'site:reddit.com OR site:youtube.com OR site:tiktok.com '
        f'OR site:twitter.com {keyword}'
    )

    data, error = searchGoogle(query=query, country_code=country_code, language=language, nb_results=limit)

    if error:
        return error

    serp_results = normalizeSerpResults(data)

    if not include_scrape:
        return {
            'status': 'success',
            'keyword': keyword,
            'serpResults': serp_results,
            'scrapeResults': [],
        }

    scrape_results = []

    for result in serp_results[:limit]:
        source = result['source']

        if source not in ['reddit', 'twitter']:
            scrape_results.append({
                'status': 'skipped',
                'reason': f'{source} scraping parser is not implemented yet',
                'result': result,
            })
            continue

        scrape_result = runSocialScrape(
            url=result['url'], keyword=keyword, country_code=country_code, render_js=True,
        )

        signals = scrape_result.get('signals', [])
        text_preview = scrape_result.get('textPreview', '')

        if not signals and len(text_preview.strip()) < 100:
            scrape_results.append({
                'discovered': result,
                'scrape': {
                    'status': 'fallback',
                    'reason': 'Direct social scrape returned no usable content',
                    'source': result['source'],
                    'signals': [{
                        'source': result['source'],
                        'title': result['title'],
                        'snippet': result['description'],
                        'url': result['url'],
                        'origin': 'serp_fallback',
                    }],
                },
            })
            continue

        scrape_results.append({'discovered': result, 'scrape': scrape_result})

    return {
        'status': 'success',
        'keyword': keyword,
        'serpResults': serp_results,
        'scrapeResults': scrape_results,
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
