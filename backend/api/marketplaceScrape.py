import re
from urllib.parse import quote_plus

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.api.scrapingbeeClient import (
    detectSourceFromUrl,
    normalizeSerpResults,
    normalizeText,
    scrapePageText,
    searchGoogle,
    scrapeAmazonWithReviews,
)

router = APIRouter(tags=['marketplace'])


class MarketplaceScrapeRequest(BaseModel):
    url: str
    keyword: str | None = None
    country_code: str = 'cn'
    render_js: bool = True
    scroll: bool = False
    wait_for: str | None = None
    include_reviews: bool = True
    max_review_pages: int = 1
    wait_ms: int | None = None
    block_resources: bool | None = None


class MarketplaceBatchScrapeRequest(BaseModel):
    urls: list[str]
    keyword: str | None = None
    country_code: str = 'cn'
    render_js: bool = True


class MarketplaceDiscoveryRequest(BaseModel):
    keyword: str
    marketplace: str = 'taobao'
    country_code: str = 'cn'
    language: str = 'en'
    limit: int = 5
    include_scrape: bool = True


def classifyMarketplaceUrl(url: str):
    lowered = url.lower()

    if 'amazon.com' in lowered or 'amazon.co' in lowered:
        if '/product-reviews/' in lowered or 'reviews' in lowered:
            return 'amazon_review_page'
        if '/dp/' in lowered or '/gp/product/' in lowered:
            return 'amazon_product_page'
        return 'amazon_page'

    if 'pingjia.taobao.com' in lowered:
        return 'taobao_review_page'

    if 'world.taobao.com' in lowered or 'beaut.taobao.com' in lowered or 'fanyi.taobao.com' in lowered:
        return 'taobao_content_page'

    if 's.taobao.com' in lowered:
        return 'taobao_search_page'

    if 'taobao.com' in lowered or 'tmall.com' in lowered:
        return 'taobao_page'

    return detectSourceFromUrl(url)


def isBlockedMarketplaceText(text: str):
    lowered = text.lower()
    blocked_markers = [
        'please log in',
        'sign in',
        '请登录',
        '请重新登录',
        '请按住滑块',
        'drag the slider',
        'captcha',
    ]
    return any(marker in lowered for marker in blocked_markers)


def extractPriceSignals(text: str):
    clean = normalizeText(text)
    prices = re.findall(r'(?:¥|￥|rp|idr|\$)\s?[0-9][0-9.,]*', clean, flags=re.IGNORECASE)
    return list(dict.fromkeys(prices))[:20]


def extractTaobaoSignals(text: str):
    clean = normalizeText(text)
    lines = clean.splitlines()
    joined = ' '.join(lines)

    review_tag_pattern = re.compile(r'([一-鿿A-Za-z][一-鿿A-Za-z\s-]{1,30})\((\d+)\)')
    review_tags = [
        {'tag': match.group(1).strip(), 'count': int(match.group(2))}
        for match in review_tag_pattern.finditer(joined)
    ][:20]

    product_lines = []
    for line in lines:
        has_price_context = '¥' in line or '￥' in line
        has_beauty_context = any(
            keyword in line.lower()
            for keyword in ['serum', 'skincare', 'cleanser', 'pola', 'cream', 'toner', 'essence']
        )
        if len(line) > 18 and (has_price_context or has_beauty_context):
            product_lines.append(line)

    return {
        'marketplace': 'taobao',
        'pageBlocked': isBlockedMarketplaceText(clean),
        'prices': extractPriceSignals(clean),
        'reviewTags': review_tags,
        'productMentions': product_lines[:12],
    }


def extractAmazonSignals(text: str, url: str = ''):
    clean = normalizeText(text)
    lines = clean.splitlines()
    joined = ' '.join(lines)

    review_count_match = re.search(r'([\d,]+)\s+(customer reviews?|ratings?|global ratings?)', joined, re.IGNORECASE)
    total_reviews = review_count_match.group(1).replace(',', '') if review_count_match else None

    star_match = re.search(r'(\d\.\d)\s+out of\s+5\s+stars?', joined, re.IGNORECASE)
    avg_rating = float(star_match.group(1)) if star_match else None

    histogram = {}
    for star in range(1, 6):
        pattern = rf'{star}\s*stars?\s*([\d,]+)\s*(\d+%)?'
        hist_match = re.search(pattern, joined, re.IGNORECASE)
        if hist_match:
            histogram[f'{star}_star'] = {
                'count': hist_match.group(1).replace(',', ''),
                'percentage': hist_match.group(2) if hist_match.group(2) else None,
            }

    review_blocks = re.findall(
        r'(Verified Purchase|Reviewed in .*? \d{1,2}, \d{4})(.*?)(?=Verified Purchase|Reviewed in |$)',
        clean,
        re.DOTALL | re.IGNORECASE,
    )
    individual_reviews = []
    for prefix, body in review_blocks[:5]:
        title_match = re.search(r'^([A-Z][A-Za-z\s]{10,100})', body.strip())
        title = title_match.group(1).strip() if title_match else 'No title'
        clean_body = re.sub(r'\s+', ' ', body).strip()[:300]
        individual_reviews.append({
            'verified': 'Verified Purchase' in prefix,
            'title': title,
            'body': clean_body,
        })

    product_mentions = []
    for line in lines:
        if any(marker in line for marker in ['About this item', 'Product Description', 'Features & details']):
            product_mentions.append(line)
        if re.search(r'(?:size|weight|dimension|volume|fl oz|ml|ounce|oz)\s*[:\-]\s*\d', line, re.IGNORECASE):
            product_mentions.append(line)

    review_tags = []
    tag_patterns = [
        r'(\w+\s*\w*)\s*\(([\d,]+)\)',
        r'([\w\s]+?)\s*reviews?\s*with\s*([\w\s]+)',
    ]
    for pattern in tag_patterns:
        for match in re.finditer(pattern, joined, re.IGNORECASE):
            tag_text = match.group(1).strip()
            tag_count = match.group(2).replace(',', '') if match.group(2) else '0'
            if len(tag_text) > 3 and len(tag_text) < 50:
                review_tags.append({
                    'tag': tag_text,
                    'count': int(tag_count) if tag_count.isdigit() else 0,
                })

    seller_match = re.search(r'Sold by[:\s]+([^.\n]+)', clean, re.IGNORECASE)
    seller = seller_match.group(1).strip() if seller_match else None

    fulfillment_match = re.search(r'Ships from[:\s]+([^.\n]+)', clean, re.IGNORECASE)
    fulfillment = fulfillment_match.group(1).strip() if fulfillment_match else None

    return {
        'marketplace': 'amazon',
        'pageBlocked': isBlockedMarketplaceText(clean),
        'prices': extractPriceSignals(clean),
        'reviewTags': review_tags[:20],
        'productMentions': product_mentions[:12],
        'amazonSpecific': {
            'totalReviews': total_reviews,
            'averageRating': avg_rating,
            'ratingHistogram': histogram,
            'individualReviews': individual_reviews,
            'seller': seller,
            'fulfillment': fulfillment,
            'primeEligible': 'prime' in clean.lower() or 'amazon prime' in clean.lower(),
        },
    }


def extractMarketplaceSignals(url: str, text: str):
    page_type = classifyMarketplaceUrl(url)

    if page_type.startswith('taobao'):
        return extractTaobaoSignals(text)

    if 'amazon' in page_type.lower() or 'amazon.com' in url.lower():
        return extractAmazonSignals(text, url)

    return {
        'marketplace': detectSourceFromUrl(url),
        'pageBlocked': isBlockedMarketplaceText(text),
        'prices': extractPriceSignals(text),
        'reviewTags': [],
        'productMentions': [],
    }


def buildMarketplaceDiscoveryQuery(payload: MarketplaceDiscoveryRequest):
    keyword = payload.keyword
    marketplace = payload.marketplace.lower()

    if marketplace == 'taobao':
        return (
            'site:world.taobao.com/lang/en-us/shopping-guide OR '
            'site:pingjia.taobao.com OR site:beaut.taobao.com OR site:fanyi.taobao.com '
            f'{keyword}'
        )

    if marketplace == 'amazon':
        return f'site:amazon.com {keyword} reviews price'

    if marketplace == 'temu':
        return f'site:temu.com {keyword} reviews price'

    return f'site:{marketplace}.com {keyword} reviews price'


def shouldRetryWithFullAmazonRender(error: dict | None):
    if not isinstance(error, dict):
        return False
    message = str(error.get('message') or '').lower()
    return (
        'document is empty' in message
        or 'block_resources=false' in message
        or 'read timeout' in message
    )


def runMarketplaceScrape(
    url: str,
    keyword: str | None = None,
    country_code: str = 'cn',
    render_js: bool = True,
    include_reviews: bool = True,
    max_review_pages: int = 1,
    wait_ms: int = 0,
    wait_for: str | None = None,
    scroll: bool = False,
    block_resources: bool | None = None,
) -> dict:
    if 'amazon.' in url.lower():
        country_code = 'us' if country_code == 'cn' else country_code

        if include_reviews:
            result, error = scrapeAmazonWithReviews(
                url=url, country_code=country_code, max_pages=max_review_pages,
            )

            if not error:
                return {
                    'status': 'success',
                    'source': 'scrapingbee',
                    'sourceUrl': url,
                    'pageType': 'amazon_review_page',
                    'signals': {
                        'marketplace': 'amazon',
                        'pageBlocked': False,
                        'prices': [],
                        'reviewTags': [],
                        'productMentions': [],
                        'amazonSpecific': {
                            'reviews': result.get('reviews', []),
                            'ratingSummary': result.get('ratingSummary', {}),
                            'reviewCountScraped': result.get('reviewCountScraped', 0),
                            'reviewSource': 'scrapingbee_live',
                        },
                    },
                }

            return {
                'status': 'success',
                'source': 'scrapingbee_with_fallback',
                'sourceUrl': url,
                'pageType': 'amazon_product_page',
                'signals': {
                    'marketplace': 'amazon',
                    'pageBlocked': True,
                    'prices': [],
                    'reviewTags': [],
                    'productMentions': [],
                    'amazonSpecific': {
                        'reviews': [],
                        'ratingSummary': {},
                        'reviewCountScraped': 0,
                        'reviewSource': 'blocked_or_timed_out_live_scrape',
                        'blockedReason': error.get('message') if isinstance(error, dict) else str(error),
                        'liveReviewErrorStatus': error.get('status') if isinstance(error, dict) else None,
                    },
                },
            }

        page_text, error = scrapePageText(
            url=url,
            country_code=country_code,
            render_js=render_js,
            wait_ms=wait_ms,
            wait_for=wait_for,
            scroll_to='#averageCustomerReviewsAnchor' if scroll else None,
            block_resources=block_resources,
        )

        if error and block_resources is None and shouldRetryWithFullAmazonRender(error):
            page_text, error = scrapePageText(
                url=url,
                country_code=country_code,
                render_js=render_js,
                wait_ms=3000,
                wait_for=wait_for,
                scroll_to='#averageCustomerReviewsAnchor' if scroll else None,
                block_resources=False,
            )

        if error and not render_js and shouldRetryWithFullAmazonRender(error):
            page_text, error = scrapePageText(
                url=url,
                country_code=country_code,
                render_js=True,
                wait_ms=8000,
                wait_for=wait_for,
                scroll_to='#averageCustomerReviewsAnchor' if scroll else None,
                block_resources=False,
            )

        if error:
            return error

        clean_text = normalizeText(page_text)
        signals = extractMarketplaceSignals(url, page_text)

        return {
            'status': 'success',
            'source': 'scrapingbee',
            'sourceUrl': url,
            'pageType': 'amazon_product_page',
            'keyword': keyword,
            'countryCode': country_code,
            'signals': signals,
            'textPreview': clean_text[:2500],
            'rawTextLength': len(page_text),
        }

    page_text, error = scrapePageText(
        url=url,
        country_code=country_code,
        render_js=render_js,
        wait_ms=wait_ms if wait_ms else 5000,
        wait_for=wait_for,
        scroll_to='body' if scroll else None,
        block_resources=block_resources,
    )

    if error:
        return error

    clean_text = normalizeText(page_text)
    signals = extractMarketplaceSignals(url, page_text)

    return {
        'status': 'success',
        'source': 'scrapingbee',
        'sourceUrl': url,
        'pageType': classifyMarketplaceUrl(url),
        'keyword': keyword,
        'countryCode': country_code,
        'signals': signals,
        'textPreview': clean_text[:2500],
        'rawTextLength': len(page_text),
    }


def runMarketplaceDiscovery(
    keyword: str,
    marketplace: str = 'taobao',
    country_code: str = 'cn',
    language: str = 'en',
    limit: int = 5,
    include_scrape: bool = True,
) -> dict:
    payload = MarketplaceDiscoveryRequest(
        keyword=keyword, marketplace=marketplace, country_code=country_code,
        language=language, limit=limit, include_scrape=include_scrape,
    )
    query = buildMarketplaceDiscoveryQuery(payload)
    data, error = searchGoogle(query=query, country_code=country_code, language=language, nb_results=limit)

    if error:
        return error

    serp_results = normalizeSerpResults(data)
    marketplace_results = [
        r for r in serp_results if classifyMarketplaceUrl(r['url']).startswith(marketplace.lower())
    ]
    if not marketplace_results:
        marketplace_results = serp_results

    if not include_scrape:
        return {
            'status': 'success',
            'source': 'scrapingbee_google',
            'query': query,
            'keyword': keyword,
            'marketplace': marketplace,
            'results': marketplace_results,
            'scrapeResults': [],
        }

    scrape_results = []
    for result in marketplace_results[:limit]:
        scrape_result = runMarketplaceScrape(
            url=result['url'], keyword=keyword, country_code=country_code, render_js=True,
        )
        scrape_results.append({'discovered': result, 'scrape': scrape_result})

    return {
        'status': 'success',
        'source': 'scrapingbee_google_then_scrapingbee',
        'query': query,
        'keyword': keyword,
        'marketplace': marketplace,
        'results': marketplace_results,
        'scrapeResults': scrape_results,
    }


@router.post('/api/marketplace-scrape', status_code=202)
async def marketplaceScrape(payload: MarketplaceScrapeRequest):
    from backend.redis.worker import scrapeMarketplacePage
    task = scrapeMarketplacePage.delay(
        payload.url, payload.keyword, payload.country_code,
        payload.render_js, payload.include_reviews, payload.max_review_pages,
        payload.wait_ms if payload.wait_ms is not None else 0,
        payload.wait_for, payload.scroll, payload.block_resources,
    )
    return JSONResponse(status_code=202, content={'taskId': task.id, 'status': 'queued', 'queue': 'scraping'})


@router.post('/api/marketplace-batch-scrape', status_code=202)
async def marketplaceBatchScrape(payload: MarketplaceBatchScrapeRequest):
    from backend.redis.worker import scrapeMarketplacePageBatch
    task = scrapeMarketplacePageBatch.delay(
        payload.urls, payload.keyword, payload.country_code, payload.render_js,
    )
    return JSONResponse(status_code=202, content={
        'taskId': task.id, 'count': len(payload.urls), 'status': 'queued', 'queue': 'scraping',
    })


@router.post('/api/marketplace-discovery', status_code=202)
async def marketplaceDiscovery(payload: MarketplaceDiscoveryRequest):
    from backend.redis.worker import scrapeMarketplaceDiscovery
    task = scrapeMarketplaceDiscovery.delay(
        payload.keyword, payload.marketplace, payload.country_code,
        payload.language, payload.limit, payload.include_scrape,
    )
    return JSONResponse(status_code=202, content={'taskId': task.id, 'status': 'queued', 'queue': 'scraping'})


@router.get('/api/marketplace-url-template/taobao')
async def taobaoUrlTemplate(keyword: str):
    encoded_keyword = quote_plus(keyword)
    return {
        'keyword': keyword,
        'templates': {
            'searchUrl': f'https://s.taobao.com/search?q={encoded_keyword}',
            'recommendedDynamicFlow': 'Use /api/marketplace-discovery first, then pass selected URLs to /api/marketplace-batch-scrape.',
        },
    }
