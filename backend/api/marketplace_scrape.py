import re
from urllib.parse import quote_plus

from fastapi import APIRouter
from pydantic import BaseModel

from backend.api.scrapingbee_client import (
    detectSourceFromUrl,
    normalizeSerpResults,
    normalizeText,
    scrapePageText,
    searchGoogle,
)

router = APIRouter(tags=["marketplace"])


class MarketplaceScrapeRequest(BaseModel):
    url: str
    keyword: str | None = None
    country_code: str = "cn"
    render_js: bool = True scroll: bool = False  
    wait_for: str | None = None 


class MarketplaceBatchScrapeRequest(BaseModel):
    urls: list[str]
    keyword: str | None = None
    country_code: str = "cn"
    render_js: bool = True


class MarketplaceDiscoveryRequest(BaseModel):
    keyword: str
    marketplace: str = "taobao"
    country_code: str = "cn"
    language: str = "en"
    limit: int = 5
    include_scrape: bool = True


def classifyMarketplaceUrl(url: str):
    lowered = url.lower()

        # Amazon detection (tambahin!)
    if "amazon.com" in lowered or "amazon.co" in lowered:
        if "/product-reviews/" in lowered or "reviews" in lowered:
            return "amazon_review_page"
        if "/dp/" in lowered or "/gp/product/" in lowered:
            return "amazon_product_page"
        return "amazon_page"

    if "pingjia.taobao.com" in lowered:
        return "taobao_review_page"

    if "world.taobao.com" in lowered or "beaut.taobao.com" in lowered or "fanyi.taobao.com" in lowered:
        return "taobao_content_page"

    if "s.taobao.com" in lowered:
        return "taobao_search_page"

    if "taobao.com" in lowered or "tmall.com" in lowered:
        return "taobao_page"

    return detectSourceFromUrl(url)


def isBlockedMarketplaceText(text: str):
    lowered = text.lower()
    blocked_markers = [
        "please log in",
        "sign in",
        "请登录",
        "请重新登录",
        "请按住滑块",
        "drag the slider",
        "captcha",
    ]

    return any(marker in lowered for marker in blocked_markers)


def extractPriceSignals(text: str):
    clean = normalizeText(text)
    prices = re.findall(r"(?:¥|￥|rp|idr|\$)\s?[0-9][0-9.,]*", clean, flags=re.IGNORECASE)
    return list(dict.fromkeys(prices))[:20]


def extractTaobaoSignals(text: str):
    clean = normalizeText(text)
    lines = clean.splitlines()
    joined = " ".join(lines)

    review_tag_pattern = re.compile(r"([\u4e00-\u9fffA-Za-z][\u4e00-\u9fffA-Za-z\s-]{1,30})\((\d+)\)")
    review_tags = [
        {"tag": match.group(1).strip(), "count": int(match.group(2))}
        for match in review_tag_pattern.finditer(joined)
    ][:20]

    product_lines = []
    for line in lines:
        has_price_context = "¥" in line or "￥" in line
        has_beauty_context = any(
            keyword in line.lower()
            for keyword in ["serum", "skincare", "cleanser", "pola", "cream", "toner", "essence"]
        )

        if len(line) > 18 and (has_price_context or has_beauty_context):
            product_lines.append(line)

    return {
        "marketplace": "taobao",
        "page_blocked": isBlockedMarketplaceText(clean),
        "prices": extractPriceSignals(clean),
        "review_tags": review_tags,
        "product_mentions": product_lines[:12],
    }


def extractMarketplaceSignals(url: str, text: str):
    page_type = classifyMarketplaceUrl(url)

    if page_type.startswith("taobao"):
        return extractTaobaoSignals(text)

    if "amazon" in page_type.lower() or "amazon.com" in url.lower():
        return extractAmazonSignals(text, url)

    return {
        "marketplace": detectSourceFromUrl(url),
        "page_blocked": isBlockedMarketplaceText(text),
        "prices": extractPriceSignals(text),
        "review_tags": [],
        "product_mentions": [],
    }


def buildMarketplaceDiscoveryQuery(payload: MarketplaceDiscoveryRequest):
    keyword = payload.keyword
    marketplace = payload.marketplace.lower()

    if marketplace == "taobao":
        return (
            "site:world.taobao.com/lang/en-us/shopping-guide OR "
            "site:pingjia.taobao.com OR site:beaut.taobao.com OR site:fanyi.taobao.com "
            f"{keyword}"
        )

    if marketplace == "amazon":
        return f"site:amazon.com {keyword} reviews price"

    if marketplace == "temu":
        return f"site:temu.com {keyword} reviews price"

    return f"site:{marketplace}.com {keyword} reviews price"


@router.post("/api/marketplace-scrape")
async def marketplaceScrape(payload: MarketplaceScrapeRequest):
    if "amazon.com" in payload.url.lower():
    result, error = scrapeAmazonWithReviews(
        url=payload.url,
        country_code=payload.country_code,
    )
    if not error:
        # result sudah berupa dict dengan reviews terstruktur!
        return {
            "status": "success",
            "source": "scrapingbee",
            "source_url": payload.url,
            "page_type": "amazon_product_page",
            "signals": {
                "marketplace": "amazon",
                "page_blocked": False,
                "prices": result.get("price", []),
                "review_tags": [],
                "product_mentions": [],
                "amazon_specific": {
                    "reviews": result.get("reviews", []),
                    "rating_summary": result.get("rating_summary", {}),
                }
            }
        }

    # Fallback ke generic untuk non-Amazon
    page_text, error = scrapePageText(...)

    if error:
        return error

    clean_text = normalizeText(page_text)
    signals = extractMarketplaceSignals(payload.url, page_text)

    return {
        "status": "success",
        "source": "scrapingbee",
        "source_url": payload.url,
        "page_type": classifyMarketplaceUrl(payload.url),
        "keyword": payload.keyword,
        "country_code": payload.country_code,
        "signals": signals,
        "text_preview": clean_text[:2500],
        "raw_text_length": len(page_text),
    }


@router.post("/api/marketplace-batch-scrape")
async def marketplaceBatchScrape(payload: MarketplaceBatchScrapeRequest):
    results = []

    for url in payload.urls:
        result = await marketplaceScrape(
            MarketplaceScrapeRequest(
                url=url,
                keyword=payload.keyword,
                country_code=payload.country_code,
                render_js=payload.render_js,
            )
        )
        results.append(result)

    return {
        "status": "success",
        "keyword": payload.keyword,
        "count": len(results),
        "results": results,
    }


@router.post("/api/marketplace-discovery")
async def marketplaceDiscovery(payload: MarketplaceDiscoveryRequest):
    query = buildMarketplaceDiscoveryQuery(payload)
    data, error = searchGoogle(
        query=query,
        country_code=payload.country_code,
        language=payload.language,
        nb_results=payload.limit,
    )

    if error:
        return error

    serp_results = normalizeSerpResults(data)
    marketplace_results = [
        result for result in serp_results if classifyMarketplaceUrl(result["url"]).startswith(payload.marketplace.lower())
    ]

    if not marketplace_results:
        marketplace_results = serp_results

    if not payload.include_scrape:
        return {
            "status": "success",
            "source": "scrapingbee_google",
            "query": query,
            "keyword": payload.keyword,
            "marketplace": payload.marketplace,
            "results": marketplace_results,
            "scrape_results": [],
        }

    scrape_results = []

    for result in marketplace_results[: payload.limit]:
        scrape_result = await marketplaceScrape(
            MarketplaceScrapeRequest(
                url=result["url"],
                keyword=payload.keyword,
                country_code=payload.country_code,
                render_js=True,
            )
        )

        scrape_results.append(
            {
                "discovered": result,
                "scrape": scrape_result,
            }
        )

    return {
        "status": "success",
        "source": "scrapingbee_google_then_scrapingbee",
        "query": query,
        "keyword": payload.keyword,
        "marketplace": payload.marketplace,
        "results": marketplace_results,
        "scrape_results": scrape_results,
    }


@router.get("/api/marketplace-url-template/taobao")
async def taobaoUrlTemplate(keyword: str):
    encoded_keyword = quote_plus(keyword)

    return {
        "keyword": keyword,
        "templates": {
            "search_url": f"https://s.taobao.com/search?q={encoded_keyword}",
            "recommended_dynamic_flow": "Use /api/marketplace-discovery first, then pass selected URLs to /api/marketplace-batch-scrape.",
        },
    }
def extractAmazonSignals(text: str, url: str = ""):
    clean = normalizeText(text)
    lines = clean.splitlines()
    joined = " ".join(lines)

    # === REVIEW EXTRACTION ===
    reviews = []
    
    # Pattern 1: "X,XXX customer reviews" atau "X,XXX ratings"
    review_count_match = re.search(r"([\d,]+)\s+(customer reviews?|ratings?|global ratings?)", joined, re.IGNORECASE)
    total_reviews = review_count_match.group(1).replace(",", "") if review_count_match else None

    # Pattern 2: Star rating "4.5 out of 5 stars"
    star_match = re.search(r"(\d\.\d)\s+out of\s+5\s+stars?", joined, re.IGNORECASE)
    avg_rating = float(star_match.group(1)) if star_match else None

    # Pattern 3: Review histogram (5 star, 4 star, etc.)
    histogram = {}
    for star in range(1, 6):
        pattern = rf"{star}\s*stars?\s*([\d,]+)\s*(\d+%)?"
        hist_match = re.search(pattern, joined, re.IGNORECASE)
        if hist_match:
            histogram[f"{star}_star"] = {
                "count": hist_match.group(1).replace(",", ""),
                "percentage": hist_match.group(2) if hist_match.group(2) else None
            }

    # Pattern 4: Individual review snippets
    # Amazon review format: "Reviewed in the United States on X" atau "Verified Purchase"
    review_blocks = re.findall(
        r"(Verified Purchase|Reviewed in .*? \d{1,2}, \d{4})(.*?)(?=Verified Purchase|Reviewed in |$)",
        clean,
        re.DOTALL | re.IGNORECASE
    )
    
    individual_reviews = []
    for prefix, body in review_blocks[:5]:  # Ambil 5 review pertama
        # Extract title (usually caps or first sentence)
        title_match = re.search(r"^([A-Z][A-Za-z\s]{10,100})", body.strip())
        title = title_match.group(1).strip() if title_match else "No title"
        
        # Clean body
        clean_body = re.sub(r'\s+', ' ', body).strip()[:300]
        
        individual_reviews.append({
            "verified": "Verified Purchase" in prefix,
            "title": title,
            "body": clean_body
        })

    # === PRODUCT MENTIONS ===
    product_mentions = []
    for line in lines:
        # Amazon product features (bullet points, about this item)
        if any(marker in line for marker in ["About this item", "Product Description", "Features & details"]):
            product_mentions.append(line)
        
        # Product specs
        if re.search(r"(?:size|weight|dimension|volume|fl oz|ml|ounce|oz)\s*[:\-]\s*\d", line, re.IGNORECASE):
            product_mentions.append(line)

    # === REVIEW TAGS (Amazon style) ===
    review_tags = []
    
    # "Most Helpful", "Positive", "Critical" etc.
    tag_patterns = [
        r"(\w+\s*\w*)\s*\(([\d,]+)\)",
        r"([\w\s]+?)\s*reviews?\s*with\s*([\w\s]+)",
    ]
    
    for pattern in tag_patterns:
        for match in re.finditer(pattern, joined, re.IGNORECASE):
            tag_text = match.group(1).strip()
            tag_count = match.group(2).replace(",", "") if match.group(2) else "0"
            
            if len(tag_text) > 3 and len(tag_text) < 50:
                review_tags.append({
                    "tag": tag_text,
                    "count": int(tag_count) if tag_count.isdigit() else 0
                })

    # === SELLER INFO ===
    seller_match = re.search(r"Sold by[:\s]+([^.\n]+)", clean, re.IGNORECASE)
    seller = seller_match.group(1).strip() if seller_match else None

    fulfillment_match = re.search(r"Ships from[:\s]+([^.\n]+)", clean, re.IGNORECASE)
    fulfillment = fulfillment_match.group(1).strip() if fulfillment_match else None

    return {
        "marketplace": "amazon",
        "page_blocked": isBlockedMarketplaceText(clean),
        "prices": extractPriceSignals(clean),
        "review_tags": review_tags[:20],
        "product_mentions": product_mentions[:12],
        "amazon_specific": {
            "total_reviews": total_reviews,
            "average_rating": avg_rating,
            "rating_histogram": histogram,
            "individual_reviews": individual_reviews,
            "seller": seller,
            "fulfillment": fulfillment,
            "prime_eligible": "prime" in clean.lower() or "amazon prime" in clean.lower(),
        }
    }