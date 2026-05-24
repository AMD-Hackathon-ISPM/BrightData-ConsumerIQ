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
    scrapeAmazonWithReviews,  # Added import for scrapeAmazonWithReviews
    debugWalmartReviewScrape,
    scrapeWalmartProduct,
    scrapeWalmartWithReviews,
)

router = APIRouter(tags=["marketplace"])


class MarketplaceScrapeRequest(BaseModel):
    url: str
    keyword: str | None = None
    country_code: str = "cn"
    render_js: bool = True scroll: bool = False  
    wait_for: str | None = None 
    include_reviews: bool = True
    max_review_pages: int = 1
    wait_ms: int | None = None
    block_resources: bool | None = None


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


class WalmartReviewDebugRequest(BaseModel):
    url: str
    country_code: str = "us"


def classifyMarketplaceUrl(url: str):
    lowered = url.lower()

        # Amazon detection (tambahin!)
    if "amazon.com" in lowered or "amazon.co" in lowered:
        if "/product-reviews/" in lowered or "reviews" in lowered:
            return "amazon_review_page"
        if "/dp/" in lowered or "/gp/product/" in lowered:
            return "amazon_product_page"
        return "amazon_page"

    if "walmart." in lowered:
        if "/reviews/product/" in lowered:
            return "walmart_review_page"
        if "/ip/" in lowered:
            return "walmart_product_page"
        return "walmart_page"

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


def extractWalmartSignals(text: str, url: str = ""):
    clean = normalizeText(text)
    lines = clean.splitlines()
    joined = " ".join(lines)

    rating_match = re.search(r"(\d+(?:\.\d+)?)\s+out of\s+5", joined, re.IGNORECASE)
    review_count_match = re.search(r"([\d,]+)\s+(?:reviews?|ratings?)", joined, re.IGNORECASE)

    product_mentions = []
    for line in lines:
        lowered = line.lower()
        has_product_context = any(
            marker in lowered
            for marker in [
                "about this item",
                "product details",
                "specifications",
                "brand",
                "walmart item",
                "seller",
                "shipping",
            ]
        )

        if len(line) > 20 and has_product_context:
            product_mentions.append(line)

    return {
        "marketplace": "walmart",
        "page_blocked": isBlockedMarketplaceText(clean),
        "prices": extractPriceSignals(clean),
        "review_tags": [],
        "product_mentions": product_mentions[:12],
        "walmart_specific": {
            "source_url": url,
            "average_rating": float(rating_match.group(1)) if rating_match else None,
            "total_reviews": int(review_count_match.group(1).replace(",", "")) if review_count_match else None,
        },
    }


def extractMarketplaceSignals(url: str, text: str):
    page_type = classifyMarketplaceUrl(url)

    if page_type.startswith("taobao"):
        return extractTaobaoSignals(text)

    if "amazon" in page_type.lower() or "amazon.com" in url.lower():
        return extractAmazonSignals(text, url)

    if "walmart" in page_type.lower() or "walmart." in url.lower():
        return extractWalmartSignals(text, url)

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

    if marketplace == "walmart":
        return f"site:walmart.com/ip {keyword} reviews price"

    if marketplace == "temu":
        return f"site:temu.com {keyword} reviews price"

    return f"site:{marketplace}.com {keyword} reviews price"


def shouldRetryWithFullAmazonRender(error: dict | None):
    if not isinstance(error, dict):
        return False

    message = str(error.get("message") or "").lower()

    return (
        "document is empty" in message
        or "block_resources=false" in message
        or "read timeout" in message
    )


@router.post("/api/marketplace-debug/walmart-reviews")
async def walmartReviewDebug(payload: WalmartReviewDebugRequest):
    result, error = debugWalmartReviewScrape(
        url=payload.url,
        country_code=payload.country_code,
    )

    if error:
        return error

    return {
        "status": "success",
        "source": "scrapingbee_debug",
        "debug": result,
    }


@router.post("/api/marketplace-scrape")
async def marketplaceScrape(payload: MarketplaceScrapeRequest):
    if "walmart." in payload.url.lower():
        country_code = "us" if payload.country_code == "cn" else payload.country_code

        if payload.include_reviews:
            result, error = scrapeWalmartWithReviews(
                url=payload.url,
                country_code=country_code,
                max_pages=payload.max_review_pages,
            )

            if error:
                return {
                    "status": "success",
                    "source": "scrapingbee_with_fallback",
                    "source_url": payload.url,
                    "page_type": "walmart_product_page",
                    "signals": {
                        "marketplace": "walmart",
                        "page_blocked": True,
                        "prices": [],
                        "review_tags": [],
                        "product_mentions": [],
                        "walmart_specific": {
                            "product": {},
                            "reviews": [],
                            "rating_summary": {},
                            "review_count_scraped": 0,
                            "review_source": "blocked_or_timed_out_live_scrape",
                            "blocked_reason": error.get("message") if isinstance(error, dict) else str(error),
                        },
                    },
                }

            product = result.get("product", {})
            reviews = result.get("reviews", [])

            return {
                "status": "success",
                "source": "scrapingbee",
                "source_url": payload.url,
                "page_type": "walmart_product_page",
                "signals": {
                    "marketplace": "walmart",
                    "page_blocked": False,
                    "prices": [product.get("price")] if product.get("price") else [],
                    "review_tags": [],
                    "product_mentions": [product.get("description")] if product.get("description") else [],
                    "walmart_specific": {
                        "product": product,
                        "reviews": reviews,
                        "rating_summary": result.get("rating_summary", {}),
                        "review_count_scraped": result.get("review_count_scraped", 0),
                        "review_source": result.get("review_source"),
                        "review_error": result.get("review_error"),
                    },
                },
            }

        product, error = scrapeWalmartProduct(
            url=payload.url,
            country_code=country_code,
        )

        if error:
            return error

        return {
            "status": "success",
            "source": "scrapingbee",
            "source_url": payload.url,
            "page_type": "walmart_product_page",
            "keyword": payload.keyword,
            "country_code": country_code,
            "signals": {
                "marketplace": "walmart",
                "page_blocked": False,
                "prices": [product.get("price")] if product.get("price") else [],
                "review_tags": [],
                "product_mentions": [product.get("description")] if product.get("description") else [],
                "walmart_specific": {
                    "product": product,
                    "reviews": [],
                    "rating_summary": {
                        "average_rating": product.get("average_rating"),
                        "total_reviews": product.get("total_reviews"),
                    },
                    "review_count_scraped": 0,
                    "review_source": "not_requested",
                },
            },
        }

    if "amazon." in payload.url.lower():
        country_code = "us" if payload.country_code == "cn" else payload.country_code

        if payload.include_reviews:
            result, error = scrapeAmazonWithReviews(
                url=payload.url,
                country_code=country_code,
                max_pages=payload.max_review_pages,
            )

            if not error:
                return {
                    "status": "success",
                    "source": "scrapingbee",
                    "source_url": payload.url,
                    "page_type": "amazon_review_page",
                    "signals": {
                        "marketplace": "amazon",
                        "page_blocked": False,
                        "prices": [],
                        "review_tags": [],
                        "product_mentions": [],
                        "amazon_specific": {
                            "reviews": result.get("reviews", []),
                            "rating_summary": result.get("rating_summary", {}),
                            "review_count_scraped": result.get("review_count_scraped", 0),
                            "review_source": "scrapingbee_live",
                        },
                    },
                }

            return {
                "status": "success",
                "source": "scrapingbee_with_fallback",
                "source_url": payload.url,
                "page_type": "amazon_product_page",
                "signals": {
                    "marketplace": "amazon",
                    "page_blocked": True,
                    "prices": [],
                    "review_tags": [],
                    "product_mentions": [],
                    "amazon_specific": {
                        "reviews": [],
                        "rating_summary": {},
                        "review_count_scraped": 0,
                        "review_source": "blocked_or_timed_out_live_scrape",
                        "blocked_reason": error.get("message") if isinstance(error, dict) else str(error),
                        "live_review_error_status": error.get("status") if isinstance(error, dict) else None,
                    },
                },
>>>>>>> 89bb938 (fallback and review fix)
            }
        }

        page_text, error = scrapePageText(
            url=payload.url,
            country_code=country_code,
            render_js=payload.render_js,
            wait_ms=payload.wait_ms if payload.wait_ms is not None else 0,
            wait_for=payload.wait_for,
            scroll_to="#averageCustomerReviewsAnchor" if payload.scroll else None,
            block_resources=payload.block_resources,
        )

        if error and payload.block_resources is None and shouldRetryWithFullAmazonRender(error):
            page_text, error = scrapePageText(
                url=payload.url,
                country_code=country_code,
                render_js=payload.render_js,
                wait_ms=3000,
                wait_for=payload.wait_for,
                scroll_to="#averageCustomerReviewsAnchor" if payload.scroll else None,
                block_resources=False,
            )

        if error and not payload.render_js and shouldRetryWithFullAmazonRender(error):
            page_text, error = scrapePageText(
                url=payload.url,
                country_code=country_code,
                render_js=True,
                wait_ms=8000,
                wait_for=payload.wait_for,
                scroll_to="#averageCustomerReviewsAnchor" if payload.scroll else None,
                block_resources=False,
            )

        if error:
            return error

        clean_text = normalizeText(page_text)
        signals = extractMarketplaceSignals(payload.url, page_text)

        return {
            "status": "success",
            "source": "scrapingbee",
            "source_url": payload.url,
            "page_type": "amazon_product_page",
            "keyword": payload.keyword,
            "country_code": country_code,
            "signals": signals,
            "text_preview": clean_text[:2500],
            "raw_text_length": len(page_text),
        }

    page_text, error = scrapePageText(
        url=payload.url,
        country_code=payload.country_code,
        render_js=payload.render_js,
        wait_ms=payload.wait_ms if payload.wait_ms is not None else 5000,
        wait_for=payload.wait_for,
        scroll_to="body" if payload.scroll else None,
        block_resources=payload.block_resources,
    )

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


@router.get("/api/marketplace-url-template/walmart")
async def walmartUrlTemplate(keyword: str):
    encoded_keyword = quote_plus(keyword)

    return {
        "keyword": keyword,
        "templates": {
            "search_url": f"https://www.walmart.com/search?q={encoded_keyword}",
            "product_url_pattern": "https://www.walmart.com/ip/{product-slug}/{item_id}",
            "reviews_url_pattern": "https://www.walmart.com/reviews/product/{item_id}?page=1",
            "recommended_dynamic_flow": "Use /api/marketplace-discovery with marketplace=walmart, then scrape selected /ip/ URLs.",
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
