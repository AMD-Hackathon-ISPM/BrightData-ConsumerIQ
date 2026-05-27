import re
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.brightdata.client import scrape_brightdata

router = APIRouter(tags=['marketplace'])


def normalizeText(text: str):
    return re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', text or '')).strip()


def detectSourceFromUrl(url: str):
    lowered = url.lower()
    if 'amazon.' in lowered:
        return 'amazon'
    if 'tokopedia.com' in lowered:
        return 'tokopedia'
    if 'alibaba.com' in lowered:
        return 'alibaba'
    if 'sephora.com' in lowered:
        return 'sephora'
    if 'lazada.' in lowered:
        return 'lazada'
    if 'walmart.com' in lowered:
        return 'walmart'
    if 'ebay.' in lowered:
        return 'ebay'
    return 'marketplace'


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
    marketplace: str = 'amazon'
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

    if marketplace == 'amazon':
        return f'site:amazon.com {keyword} reviews price'

    if marketplace == 'temu':
        return f'site:temu.com {keyword} reviews price'

    return f'site:{marketplace}.com {keyword} reviews price'


def shouldRetryWithFullAmazonRender(error: dict | None):
    return False


def _endpointForMarketplaceUrl(url: str, include_reviews: bool = True) -> str | None:
    lowered = url.lower()
    if 'tokopedia.com' in lowered:
        return 'tokopedia.products.collect_url'
    if 'alibaba.com' in lowered:
        return 'alibaba.products.collect_url'
    if 'sephora.com' in lowered:
        return 'sephora.products.collect_url'
    if 'walmart.com/search' in lowered:
        return 'walmart.products.search.collect_url'
    if 'walmart.com' in lowered:
        return 'walmart.products.collect_url'
    if 'lazada.' in lowered and include_reviews:
        return 'lazada.reviews.collect_url'
    if 'lazada.' in lowered:
        return 'lazada.products.search_gmv.collect_url'
    if 'amazon.' in lowered and ('/product-reviews/' in lowered or 'reviews' in lowered) and include_reviews:
        return 'amazon.reviews.collect_url'
    if 'amazon.' in lowered:
        return 'amazon.products.collect_url'
    return None


def _marketplaceDiscoveryEndpoint(marketplace: str) -> str | None:
    normalized = marketplace.lower().replace(' ', '.')
    mapping = {
        'amazon': 'amazon.products.discover_keyword',
        'etsy': 'etsy.products.discover_keyword',
        'lazada': 'lazada.products.discover_keyword',
        'tokopedia': 'tokopedia.products.discover_keyword',
        'tokped': 'tokopedia.products.discover_keyword',
        'walmart': 'walmart.products.discover_keyword',
        'google': 'google.shopping.discover_keyword',
        'google.shopping': 'google.shopping.discover_keyword',
    }
    return mapping.get(normalized)


def _lazadaDomain(country_code: str) -> str:
    domains = {
        'sg': 'https://www.lazada.sg',
        'my': 'https://www.lazada.com.my',
        'vn': 'https://www.lazada.vn',
        'ph': 'https://www.lazada.com.ph',
        'th': 'https://www.lazada.co.th',
        'id': 'https://www.lazada.co.id',
    }
    return domains.get(country_code.lower(), 'https://www.lazada.vn')


def _recordsFromResult(result: dict[str, Any]) -> list[dict[str, Any]]:
    records = result.get('records')
    if isinstance(records, list):
        return records
    if isinstance(records, dict):
        return [records]
    return []


def _firstText(record: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = record.get(key)
        if value is not None and value != '':
            return str(value)
    return ''


def _buildMarketplaceSignals(records: list[dict[str, Any]], marketplace: str) -> dict[str, Any]:
    prices: list[str] = []
    mentions: list[str] = []
    review_tags: list[dict[str, Any]] = []

    for record in records[:20]:
        title = _firstText(record, 'title', 'product_name', 'name')
        price = record.get('final_price') or record.get('price') or record.get('initial_price')
        currency = record.get('currency') or ''
        reviews = record.get('reviews_count') or record.get('review_count') or record.get('reviews')
        rating = record.get('rating') or record.get('star_rating')
        sold = record.get('sold') or record.get('number_sold') or record.get('bought_past_month')
        gmv = record.get('gmv')

        if price is not None:
            prices.append(f'{currency} {price}'.strip())

        summary_parts = [part for part in [
            title,
            f'price={price}' if price is not None else '',
            f'rating={rating}' if rating is not None else '',
            f'reviews={reviews}' if reviews is not None else '',
            f'sold={sold}' if sold is not None else '',
            f'gmv={gmv}' if gmv is not None else '',
        ] if part]
        if summary_parts:
            mentions.append(' | '.join(summary_parts))

        for tag in record.get('review_tags') or []:
            review_tags.append({'tag': str(tag), 'count': 0})

    return {
        'marketplace': marketplace,
        'pageBlocked': False,
        'prices': list(dict.fromkeys(prices))[:20],
        'reviewTags': review_tags[:20],
        'productMentions': mentions[:12],
        'dataQuality': {
            'source': 'brightdata_dataset',
            'recordCount': len(records),
            'actualBuyerLocationAvailable': False,
            'notes': 'Bright Data marketplace product datasets expose aggregate listing/review/sold signals, not raw buyer-level city sales.',
        },
    }


def _discoveryInput(keyword: str, marketplace: str, country_code: str) -> dict[str, Any]:
    normalized = marketplace.lower()
    if normalized == 'lazada':
        return {'keyword': keyword, 'domain': _lazadaDomain(country_code)}
    if normalized == 'walmart':
        return {'keyword': keyword, 'domain': 'https://www.walmart.com/', 'all_variations': True}
    if normalized == 'amazon':
        return {'keyword': keyword, 'zipcode': ''}
    if normalized in ('google', 'google.shopping'):
        return {'keyword': keyword, 'country': country_code.upper()}
    return {'keyword': keyword, 'sort_by': ''}


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
    endpoint = _endpointForMarketplaceUrl(url, include_reviews=include_reviews)
    marketplace = detectSourceFromUrl(url)

    if endpoint is None:
        return {
            'status': 'unsupported_marketplace',
            'source': 'brightdata',
            'sourceUrl': url,
            'marketplace': marketplace,
            'error': 'No Bright Data endpoint is configured for this URL.',
        }

    result = scrape_brightdata(endpoint_key=endpoint, input_records=[{'url': url}])
    records = _recordsFromResult(result)

    return {
        **result,
        'sourceUrl': url,
        'pageType': classifyMarketplaceUrl(url),
        'keyword': keyword,
        'countryCode': country_code,
        'signals': _buildMarketplaceSignals(records, marketplace),
    }


def runMarketplaceDiscovery(
    keyword: str,
    marketplace: str = 'amazon',
    country_code: str = 'cn',
    language: str = 'en',
    limit: int = 5,
    include_scrape: bool = True,
) -> dict:
    endpoint = _marketplaceDiscoveryEndpoint(marketplace)
    if endpoint is None:
        return {
            'status': 'unsupported_marketplace',
            'source': 'brightdata',
            'keyword': keyword,
            'marketplace': marketplace,
            'error': 'No Bright Data keyword discovery endpoint is configured for this marketplace.',
        }

    result = scrape_brightdata(
        endpoint_key=endpoint,
        input_records=[_discoveryInput(keyword, marketplace, country_code)],
    )
    records = _recordsFromResult(result)[:limit]
    results = [
        {
            'title': _firstText(record, 'title', 'product_name', 'name'),
            'url': _firstText(record, 'url', 'canonical_url'),
            'description': _firstText(record, 'description', 'product_description', 'short_description'),
            'source': marketplace.lower(),
            'record': record,
        }
        for record in records
    ]

    return {
        **result,
        'keyword': keyword,
        'marketplace': marketplace,
        'countryCode': country_code,
        'language': language,
        'results': results,
        'scrapeResults': [],
        'signals': _buildMarketplaceSignals(records, marketplace.lower()),
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

