import os
import re
import json
import html
import time
from pathlib import Path
from urllib.parse import urlparse
from functools import wraps

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SCRAPINGBEE_BASE_URL = "https://app.scrapingbee.com/api/v1/"
SCRAPINGBEE_GOOGLE_URL = "https://app.scrapingbee.com/api/v1/google"


def getScrapingBeeApiKey():
    return os.getenv("SCRAPINGBEE_API_KEY")


def normalizeText(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)


def requireApiKey():
    api_key = getScrapingBeeApiKey()
    if not api_key:
        return None, {
            "status": "error",
            "message": "SCRAPINGBEE_API_KEY is not configured",
        }
    return api_key, None


def retry_with_backoff(max_retries=3, backoff_factor=2):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                result, error = func(*args, **kwargs)
                if not error:
                    return result, None
                
                status_code = error.get("status_code", 0)
                if status_code in [429, 503, 504]:
                    wait_time = backoff_factor ** retries
                    print(f"⏳ Retry {retries + 1}/{max_retries} after {wait_time}s...")
                    time.sleep(wait_time)
                    retries += 1
                else:
                    return None, error
            
            return None, {
                "status": "error",
                "message": f"Max retries ({max_retries}) exceeded"
            }
        return wrapper
    return decorator


@retry_with_backoff(max_retries=3, backoff_factor=2)
def scrapePageText(
    url: str,
    country_code: str = "us",
    render_js: bool = True,
    wait_ms: int = 5000,
    scroll_to: str | None = None,
    wait_for: str | None = None,
    js_scenario: dict | None = None,
    extract_rules: dict | None = None,
    block_resources: bool | None = None,
    wait_browser: str | None = None,
    return_page_text: bool = True,
):
    api_key, error = requireApiKey()
    if error:
        return None, error

    params = {
        "api_key": api_key,
        "url": url,
        "render_js": "true" if render_js else "false",
        "premium_proxy": "true",  # ⭐ Fixed: cuma satu key
        "country_code": country_code,
        "return_page_text": "true",
        "wait": str(wait_ms),
    }

    # JS scenario
    if js_scenario:
        params["js_scenario"] = json.dumps(js_scenario)
    elif scroll_to or wait_for:
        instructions = [{"wait": min(wait_ms, 3000)}]
        if scroll_to:
            instructions.extend([
                {"scroll_to": scroll_to},
                {"wait": 2000},
                {"scroll_to": scroll_to},
                {"wait": 2000},
            ])
        if wait_for:
            instructions.extend([
                {"wait_for": wait_for},
                {"wait": 3000},
            ])
        params["js_scenario"] = json.dumps({"instructions": instructions})

    if extract_rules:
        params["extract_rules"] = json.dumps(extract_rules)
    elif return_page_text:
        params["return_page_text"] = "true"

    try:
        response = requests.get(
            SCRAPINGBEE_BASE_URL,
            params=params,
            timeout=(10, 60),
        )
    except requests.exceptions.ConnectTimeout:
        return None, {
            "status": "error",
            "source_url": url,
            "message": "Connection timeout - ScrapingBee API unreachable",
        }
    except requests.exceptions.ReadTimeout:
        return None, {
            "status": "error",
            "source_url": url,
            "message": "Read timeout - page took too long to load",
        }

    if response.status_code >= 400:
        return None, {
            "status": "error",
            "source_url": url,
            "status_code": response.status_code,
            "message": response.text[:1000],
        }

    return response.text, None


def scrapePageHtml(url: str, **kwargs):
    return scrapePageText(url, return_page_text=False, **kwargs)


def scrapeAndParse(url: str, **kwargs):
    """Scrape + auto-parse kalau hasilnya JSON (extract_rules)."""
    text, error = scrapePageText(url, **kwargs)
    if error:
        return None, error
    
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed, None
    except (json.JSONDecodeError, TypeError):
        pass
    
    return text, None

def extractAmazonAsin(url: str):
    match = re.search(r"/(?:dp|gp/product|product-reviews)/([A-Z0-9]{10})", url)
    return match.group(1) if match else None

def buildAmazonReviewsUrl(url: str, page: int = 1):
    parsed = urlparse(url)
    asin = extractAmazonAsin(url)

    if not asin:
        return None

    host = parsed.netloc or "www.amazon.com"

    return (
        f"https://{host}/product-reviews/{asin}"
        f"?reviewerType=all_reviews&sortBy=recent&pageNumber={page}"
    )

def isBlockedScrapeResult(result):
    text = json.dumps(result).lower() if isinstance(result, dict) else str(result).lower()
    blocked_markers = [
        "captcha",
        "enter the characters you see below",
        "sorry, we just need to make sure you're not a robot",
        "robot check",
        "redirected to login",
    ]
    return any(marker in text for marker in blocked_markers)


def isBlockedScrapeError(error):
    return isBlockedScrapeResult(error)


def cleanExtractedText(value):
    if value is None:
        return None

    if isinstance(value, list):
        for item in value:
            cleaned = cleanExtractedText(item)
            if cleaned:
                return cleaned
        return None

    if isinstance(value, dict):
        for key in ("text", "content", "name", "value"):
            if key in value:
                cleaned = cleanExtractedText(value.get(key))
                if cleaned:
                    return cleaned
        return None

    cleaned = re.sub(r"\s+", " ", str(value)).strip()
    return cleaned or None


def firstNonEmpty(*values):
    for value in values:
        cleaned = cleanExtractedText(value)
        if cleaned:
            return cleaned
    return None


def parseJsonDocuments(value):
    if value is None:
        return []

    items = value if isinstance(value, list) else [value]
    documents = []

    for item in items:
        if isinstance(item, (dict, list)):
            documents.append(item)
            continue

        text = cleanExtractedText(item)
        if not text:
            continue

        try:
            parsed = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            continue

        if isinstance(parsed, list):
            documents.extend(parsed)
        else:
            documents.append(parsed)

    return documents


def walkJson(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walkJson(child)
    elif isinstance(value, list):
        for child in value:
            yield from walkJson(child)


def findJsonLdProduct(value):
    for document in parseJsonDocuments(value):
        for node in walkJson(document):
            node_type = node.get("@type")
            type_values = node_type if isinstance(node_type, list) else [node_type]

            if any(str(item).lower() == "product" for item in type_values if item):
                return node

    return {}


def nestedValue(data, *path):
    current = data

    for key in path:
        if isinstance(current, dict):
            current = current.get(key)
        elif isinstance(current, list) and isinstance(key, int) and 0 <= key < len(current):
            current = current[key]
        else:
            return None

    return current


def normalizeOffer(offers):
    if isinstance(offers, list):
        return offers[0] if offers else {}
    return offers if isinstance(offers, dict) else {}


def normalizeBrand(brand):
    if isinstance(brand, dict):
        return cleanExtractedText(brand.get("name"))
    return cleanExtractedText(brand)


def normalizeImage(image):
    if isinstance(image, list):
        return cleanExtractedText(image[0]) if image else None
    return cleanExtractedText(image)


def parseRating(value):
    text = cleanExtractedText(value)
    if not text:
        return None

    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None

    try:
        return float(match.group(1))
    except ValueError:
        return None


def parseCount(value):
    text = cleanExtractedText(value)
    if not text:
        return None

    match = re.search(r"([\d,]+)", text)
    if not match:
        return None

    return int(match.group(1).replace(",", ""))


def scrapeAmazonReviewPage(url: str, country_code: str = "us", page: int = 1):
    review_url = buildAmazonReviewsUrl(url, page)

    if not review_url:
        return None, {
            "status": "error",
            "message": "Could not extract Amazon ASIN from URL",
            "source_url": url,
        }

    extract_rules = {
        "reviews": {
            "selector": "[data-hook='review']",
            "type": "list",
            "output": {
                "title": {"selector": "[data-hook='review-title']", "output": "text"},
                "body": {"selector": "[data-hook='review-body']", "output": "text"},
                "stars": {
                    "selector": "[data-hook='review-star-rating'] span, [data-hook='cmps-review-star-rating'] span",
                    "output": "text",
                },
                "author": {"selector": ".a-profile-name", "output": "text"},
                "date": {"selector": "[data-hook='review-date']", "output": "text"},
                "verified": {"selector": "[data-hook='avp-badge']", "output": "text"},
            },
        },
        "average_rating": {"selector": "[data-hook='rating-out-of-text']", "output": "text"},
        "total_reviews": {"selector": "[data-hook='total-review-count']", "output": "text"},
    }

    result, error = scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        extract_rules=extract_rules,
    )

    if not error and isinstance(result, dict) and result.get("reviews"):
        return result, None

    return scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=True,
        wait_ms=8000,
        wait_browser="load",
        block_resources=False,
        extract_rules=extract_rules,
    )


def scrapeAmazonWithReviews(url: str, country_code: str = "us", max_pages: int = 3):
    all_reviews = []
    rating_summary = {}

    for page in range(1, max_pages + 1):
        result, error = scrapeAmazonReviewPage(url, country_code=country_code, page=page)

        if error:
            if isBlockedScrapeError(error):
                return None, {
                    "status": "blocked",
                    "source_url": error.get("source_url", url) if isinstance(error, dict) else url,
                    "message": "Amazon redirected ScrapingBee to login/CAPTCHA before reviews were available",
                    "next_step": "Use a permitted data source fallback now, then switch this path to Bright Data Amazon reviews once credits are active.",
                }
            return None, error

        if isBlockedScrapeResult(result):
            return None, {
                "status": "blocked",
                "message": "Amazon CAPTCHA/block page detected",
                "source_url": url,
            }

        reviews = result.get("reviews", []) if isinstance(result, dict) else []

        if not reviews:
            break

        all_reviews.extend(reviews)

        if page == 1:
            rating_summary = {
                "average_rating": result.get("average_rating"),
                "total_reviews": result.get("total_reviews"),
            }

    return {
        "reviews": all_reviews,
        "rating_summary": rating_summary,
        "review_count_scraped": len(all_reviews),
    }, None



def extractWalmartItemId(url: str):
    parsed = urlparse(url)
    path_parts = [part for part in parsed.path.split("/") if part]

    if "reviews" in path_parts and "product" in path_parts:
        for part in reversed(path_parts):
            if re.fullmatch(r"\d+", part):
                return part

    if "ip" in path_parts:
        ip_index = path_parts.index("ip")
        for part in reversed(path_parts[ip_index + 1:]):
            match = re.search(r"(\d{5,})", part)
            if match:
                return match.group(1)

    match = re.search(r"/(?:ip|reviews/product)/(?:[^/?#]+/)?(\d{5,})", parsed.path)
    return match.group(1) if match else None


def buildWalmartReviewsUrl(url: str, page: int = 1):
    parsed = urlparse(url)
    item_id = extractWalmartItemId(url)

    if not item_id:
        return None

    host = parsed.netloc if "walmart." in parsed.netloc else "www.walmart.com"
    return f"https://{host}/reviews/product/{item_id}?page={page}"


def buildWalmartReviewsUrlFromId(url: str, item_id: str, page: int = 1):
    parsed = urlparse(url)
    host = parsed.netloc if "walmart." in parsed.netloc else "www.walmart.com"
    return f"https://{host}/reviews/product/{item_id}?page={page}"


def findWalmartReviewItemIdInHtml(html: str):
    if not html:
        return None

    normalized = html.replace("\\/", "/")
    matches = re.findall(r"/reviews/product/(\d+)", normalized)

    if not matches:
        return None

    return matches[0]


def resolveWalmartReviewsUrl(url: str, country_code: str = "us", page: int = 1):
    html, error = scrapePageHtml(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if error:
        html, error = scrapePageHtml(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    if not error:
        review_item_id = findWalmartReviewItemIdInHtml(html)

        if review_item_id:
            return buildWalmartReviewsUrlFromId(url, review_item_id, page), None

    fallback_url = buildWalmartReviewsUrl(url, page)

    if fallback_url:
        return fallback_url, None

    return None, {
        "status": "error",
        "message": "Could not extract Walmart review URL from page HTML or item ID",
        "source_url": url,
    }


def walmartProductExtractRules():
    return {
        "title": {"selector": "h1, [data-testid='product-title']", "output": "text"},
        "price": {
            "selector": "[itemprop='price'], [data-automation-id='product-price'], [data-testid='price-wrap']",
            "output": "text",
        },
        "brand": {
            "selector": "[data-testid='product-brand'], [itemprop='brand'], a[href*='/brand/']",
            "output": "text",
        },
        "description": {
            "selector": "[data-testid='product-description-content'], [data-testid='product-description'], [itemprop='description']",
            "output": "text",
        },
        "average_rating": {
            "selector": "[itemprop='ratingValue'], [data-testid='reviews-and-ratings']",
            "output": "text",
        },
        "total_reviews": {
            "selector": "[itemprop='reviewCount'], a[href*='/reviews/product/']",
            "output": "text",
        },
        "seller": {
            "selector": "[data-testid='seller-name'], [data-automation-id='seller-name']",
            "output": "text",
        },
        "availability": {
            "selector": "[data-testid='fulfillment-shipping-text'], [data-automation-id='fulfillment-shipping-text']",
            "output": "text",
        },
        "next_data": {"selector": "script#__NEXT_DATA__", "output": "text"},
        "json_ld": {
            "selector": "script[type='application/ld+json']",
            "type": "list",
            "output": "text",
        },
    }


def walmartReviewExtractRules():
    return {
        "reviews": {
            "selector": "[data-testid='review-item'], [data-automation-id='review'], [itemprop='review']",
            "type": "list",
            "output": {
                "title": {
                    "selector": "[data-testid='review-title'], [itemprop='name'], h3",
                    "output": "text",
                },
                "body": {
                    "selector": "[data-testid='review-text'], [itemprop='reviewBody'], p",
                    "output": "text",
                },
                "rating": {
                    "selector": "[itemprop='ratingValue'], [aria-label*='out of 5'], [aria-label*='stars']",
                    "output": "text",
                },
                "author": {
                    "selector": "[data-testid='review-author'], [itemprop='author'], .f7",
                    "output": "text",
                },
                "date": {
                    "selector": "[data-testid='review-date'], time",
                    "output": "text",
                },
            },
        },
        "average_rating": {
            "selector": "[itemprop='ratingValue'], [data-testid='reviews-and-ratings']",
            "output": "text",
        },
        "total_reviews": {
            "selector": "[itemprop='reviewCount']",
            "output": "text",
        },
        "next_data": {"selector": "script#__NEXT_DATA__", "output": "text"},
        "json_ld": {
            "selector": "script[type='application/ld+json']",
            "type": "list",
            "output": "text",
        },
    }


def normalizeWalmartProduct(result: dict, url: str):
    product_ld = findJsonLdProduct(result.get("json_ld")) or findJsonLdProduct(result.get("next_data"))
    offer = normalizeOffer(product_ld.get("offers"))
    aggregate_rating = product_ld.get("aggregateRating") if isinstance(product_ld, dict) else {}
    item_id = extractWalmartItemId(url)

    availability = firstNonEmpty(
        result.get("availability"),
        str(offer.get("availability", "")).split("/")[-1] if offer else None,
    )

    return {
        "item_id": item_id,
        "assumed_reviews_url": buildWalmartReviewsUrl(url, 1),
        "url": url,
        "title": firstNonEmpty(result.get("title"), product_ld.get("name")),
        "brand": firstNonEmpty(result.get("brand"), normalizeBrand(product_ld.get("brand"))),
        "price": firstNonEmpty(result.get("price"), offer.get("price"), nestedValue(offer, "priceSpecification", "price")),
        "currency": firstNonEmpty(offer.get("priceCurrency"), nestedValue(offer, "priceSpecification", "priceCurrency")),
        "description": firstNonEmpty(result.get("description"), product_ld.get("description")),
        "image": normalizeImage(product_ld.get("image")),
        "sku": firstNonEmpty(product_ld.get("sku"), item_id),
        "gtin": firstNonEmpty(product_ld.get("gtin13"), product_ld.get("gtin12"), product_ld.get("gtin")),
        "seller": firstNonEmpty(result.get("seller"), nestedValue(offer, "seller", "name")),
        "availability": availability,
        "average_rating": parseRating(firstNonEmpty(result.get("average_rating"), nestedValue(aggregate_rating, "ratingValue"))),
        "total_reviews": parseCount(firstNonEmpty(result.get("total_reviews"), nestedValue(aggregate_rating, "reviewCount"), nestedValue(aggregate_rating, "ratingCount"))),
    }


def hasUsefulWalmartProduct(product: dict):
    return bool(product.get("title") or product.get("price") or product.get("description"))


def normalizeJsonReview(node: dict):
    rating = firstNonEmpty(
        node.get("rating"),
        node.get("ratingValue"),
        node.get("overallRating"),
        nestedValue(node, "reviewRating", "ratingValue"),
    )

    author = node.get("author")
    author_name = nestedValue(author, "name") if isinstance(author, dict) else author

    body = firstNonEmpty(
        node.get("body"),
        node.get("text"),
        node.get("reviewText"),
        node.get("reviewBody"),
        node.get("comments"),
    )

    title = firstNonEmpty(node.get("title"), node.get("headline"), node.get("name"), node.get("reviewTitle"))

    if not body and not title:
        return None

    badges = json.dumps(node.get("badges", node.get("badge", ""))).lower()

    return {
        "title": title,
        "body": body,
        "rating": parseRating(rating),
        "author": firstNonEmpty(author_name, node.get("customerName"), node.get("userNickname"), node.get("nickname")),
        "date": firstNonEmpty(node.get("datePublished"), node.get("submissionTime"), node.get("reviewSubmissionTime")),
        "verified": bool(node.get("verifiedPurchaser")) or "verified" in badges,
    }


def isReviewLikeJson(node: dict):
    node_type = node.get("@type")
    type_values = node_type if isinstance(node_type, list) else [node_type]

    if any(str(item).lower() == "review" for item in type_values if item):
        return True

    lowered_keys = {str(key).lower() for key in node.keys()}
    text_keys = {"reviewtext", "reviewbody", "reviewtitle", "comments", "headline"}
    rating_keys = {"rating", "ratingvalue", "overallrating", "reviewrating"}

    return bool(lowered_keys & text_keys) and bool(lowered_keys & rating_keys)


def extractWalmartReviewsFromJson(value):
    reviews = []

    for document in parseJsonDocuments(value):
        for node in walkJson(document):
            if not isReviewLikeJson(node):
                continue

            review = normalizeJsonReview(node)
            if review:
                reviews.append(review)

    return reviews


def normalizeExtractedWalmartReview(item: dict):
    review = {
        "title": cleanExtractedText(item.get("title")),
        "body": cleanExtractedText(item.get("body")),
        "rating": parseRating(item.get("rating")),
        "author": cleanExtractedText(item.get("author")),
        "date": cleanExtractedText(item.get("date")),
        "verified": None,
    }

    if not review["title"] and not review["body"]:
        return None

    return review


def dedupeReviews(reviews: list[dict]):
    seen = set()
    unique_reviews = []

    for review in reviews:
        key = (
            cleanExtractedText(review.get("title")) or "",
            cleanExtractedText(review.get("body")) or "",
            cleanExtractedText(review.get("author")) or "",
        )

        if key in seen:
            continue

        seen.add(key)
        unique_reviews.append(review)

    return unique_reviews


def normalizeWalmartReviewResult(result: dict, review_url: str):
    reviews = []
    raw_reviews = result.get("reviews", [])

    if not isinstance(raw_reviews, list):
        raw_reviews = []

    for item in raw_reviews:
        if isinstance(item, dict):
            review = normalizeExtractedWalmartReview(item)
            if review:
                reviews.append(review)

    reviews.extend(extractWalmartReviewsFromJson(result.get("json_ld")))
    reviews.extend(extractWalmartReviewsFromJson(result.get("next_data")))
    reviews = dedupeReviews(reviews)

    product_ld = findJsonLdProduct(result.get("json_ld")) or findJsonLdProduct(result.get("next_data"))
    aggregate_rating = product_ld.get("aggregateRating") if isinstance(product_ld, dict) else {}

    return {
        "source_url": review_url,
        "reviews": reviews,
        "rating_summary": {
            "average_rating": parseRating(firstNonEmpty(result.get("average_rating"), nestedValue(aggregate_rating, "ratingValue"))),
            "total_reviews": parseCount(firstNonEmpty(result.get("total_reviews"), nestedValue(aggregate_rating, "reviewCount"), nestedValue(aggregate_rating, "ratingCount"))),
        },
    }


def parseWalmartReviewTextPage(text: str, source_url: str):
    clean = normalizeText(text)
    lines = clean.splitlines()
    reviews = []

    date_pattern = re.compile(
        r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}$",
        re.IGNORECASE,
    )
    rating_pattern = re.compile(r"(\d+(?:\.\d+)?)\s+out of\s+5\s+stars?\s+review", re.IGNORECASE)
    flat_text = re.sub(r"\s+", " ", clean).strip()
    review_count_match = re.search(r"Showing\s+\d+-\d+\s+of\s+([\d,]+)\s+reviews", flat_text, re.IGNORECASE)
    average_rating_match = re.search(
        r"Customer ratings\s+(?:&|and)\s+reviews.*?(\d+(?:\.\d+)?)\s+out of\s+5",
        flat_text,
        re.IGNORECASE,
    )

    if not average_rating_match:
        average_rating_match = re.search(
            r"\b(\d+(?:\.\d+)?)\s+out of\s+5\s+\d+(?:\.\d+)?\s+out of\s+5\s+stars",
            flat_text,
            re.IGNORECASE,
        )

    date_indexes = [index for index, line in enumerate(lines) if date_pattern.match(line)]

    for position, date_index in enumerate(date_indexes):
        next_date_index = date_indexes[position + 1] if position + 1 < len(date_indexes) else len(lines)
        block = lines[date_index:next_date_index]

        if len(block) < 4:
            continue

        date = block[0]
        author = block[1] if len(block) > 1 else None
        rating = None
        rating_index = None

        for index, line in enumerate(block):
            rating_match = rating_pattern.search(line)

            if rating_match:
                rating = parseRating(rating_match.group(1))
                rating_index = index
                break

        if rating_index is None:
            continue

        title = None
        body_lines = []

        for line in block[rating_index + 1:]:
            lowered = line.lower()

            if (
                line == "* * *"
                or lowered.startswith("review from")
                or lowered.startswith("helpful?")
                or lowered.startswith("report ")
                or lowered.startswith("view all reviews")
                or lowered.startswith("we'd love")
            ):
                break

            if not title:
                title = line
                continue

            body_lines.append(line)

        body = cleanExtractedText(" ".join(body_lines))

        if not title and not body:
            continue

        reviews.append({
            "title": cleanExtractedText(title),
            "body": body,
            "rating": rating,
            "author": cleanExtractedText(author),
            "date": date,
            "verified": None,
            "source": "walmart_product_page_preview",
        })

    flat_date_pattern = re.compile(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}",
        re.IGNORECASE,
    )
    flat_date_matches = list(flat_date_pattern.finditer(flat_text))

    for index, date_match in enumerate(flat_date_matches):
        start = date_match.end()
        end = flat_date_matches[index + 1].start() if index + 1 < len(flat_date_matches) else len(flat_text)
        block = flat_text[start:end].strip()

        rating_match = rating_pattern.search(block)
        if not rating_match:
            continue

        seller_author_text = block[:rating_match.start()].strip()
        author = re.split(
            r"\s+(?:Sold\s+(?:and\s+shipped\s+)?by|Delivered\s+by|Ships\s+from|Walmart\.com)\b",
            seller_author_text,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()

        body_text = block[rating_match.end():].strip()
        verified = bool(re.match(r"Verified Purchase\b", body_text, flags=re.IGNORECASE))
        body_text = re.sub(r"^Verified Purchase\s+", "", body_text, flags=re.IGNORECASE).strip()
        body_text = re.split(
            r"\s+(?:Helpful\?|Report\b|View all reviews\b|Customer ratings\b)",
            body_text,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()

        if not body_text:
            continue

        reviews.append({
            "title": None,
            "body": cleanExtractedText(body_text),
            "rating": parseRating(rating_match.group(1)),
            "author": cleanExtractedText(author),
            "date": date_match.group(0),
            "verified": verified,
            "source": "walmart_review_page_text",
        })

    return {
        "source_url": source_url,
        "reviews": dedupeReviews(reviews),
        "rating_summary": {
            "average_rating": parseRating(average_rating_match.group(1)) if average_rating_match else None,
            "total_reviews": parseCount(review_count_match.group(1)) if review_count_match else None,
        },
    }


def scrapeWalmartProductPreviewReviews(url: str, country_code: str = "us"):
    product_text, text_error = scrapePageText(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if text_error:
        product_text, text_error = scrapePageText(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    if text_error or not product_text:
        return None, text_error

    preview_reviews = parseWalmartReviewTextPage(product_text, url)
    return preview_reviews, None


def scrapeWalmartReviewTextFallback(review_url: str, country_code: str = "us"):
    review_text, text_error = scrapePageText(
        url=review_url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if text_error:
        review_text, text_error = scrapePageText(
            url=review_url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    if text_error or not review_text:
        return None, text_error

    parsed_reviews = parseWalmartReviewTextPage(review_text, review_url)
    return parsed_reviews, None


def debugWalmartReviewScrape(url: str, country_code: str = "us"):
    review_url, resolve_error = resolveWalmartReviewsUrl(url, country_code=country_code, page=1)
    assumed_review_url = buildWalmartReviewsUrl(url, 1)

    debug = {
        "product_url": url,
        "assumed_review_url": assumed_review_url,
        "resolved_review_url": review_url,
        "resolve_error": resolve_error,
    }

    if review_url:
        review_text, review_text_error = scrapePageText(
            url=review_url,
            country_code=country_code,
            render_js=False,
            wait_ms=0,
            block_resources=False,
        )

        if review_text_error:
            review_text, review_text_error = scrapePageText(
                url=review_url,
                country_code=country_code,
                render_js=True,
                wait_ms=8000,
                wait_browser="load",
                block_resources=False,
            )

        normalized_review_text = normalizeText(review_text or "")
        debug["review_page"] = {
            "error": review_text_error,
            "text_length": len(review_text or ""),
            "preview": normalized_review_text[:3000],
            "contains_review_markers": {
                "customer_ratings": "customer ratings" in normalized_review_text.lower(),
                "out_of_5_stars_review": "out of 5 stars review" in normalized_review_text.lower(),
                "showing_reviews": "showing" in normalized_review_text.lower() and "reviews" in normalized_review_text.lower(),
                "captcha": "captcha" in normalized_review_text.lower(),
                "robot": "robot" in normalized_review_text.lower(),
            },
        }

    product_text, product_text_error = scrapePageText(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if product_text_error:
        product_text, product_text_error = scrapePageText(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    normalized_product_text = normalizeText(product_text or "")
    preview_reviews = parseWalmartReviewTextPage(product_text or "", url)

    debug["product_page"] = {
        "error": product_text_error,
        "text_length": len(product_text or ""),
        "preview": normalized_product_text[:3000],
        "parsed_preview_review_count": len(preview_reviews.get("reviews", [])),
        "parsed_preview_reviews": preview_reviews.get("reviews", [])[:5],
        "contains_review_markers": {
            "customer_ratings": "customer ratings" in normalized_product_text.lower(),
            "out_of_5_stars_review": "out of 5 stars review" in normalized_product_text.lower(),
            "showing_reviews": "showing" in normalized_product_text.lower() and "reviews" in normalized_product_text.lower(),
            "captcha": "captcha" in normalized_product_text.lower(),
            "robot": "robot" in normalized_product_text.lower(),
        },
    }

    return debug, None


def shouldRetryWalmartScrape(error):
    if not isinstance(error, dict):
        return False

    message = str(error.get("message") or "").lower()
    return "document is empty" in message or "read timeout" in message or "block_resources=false" in message


def scrapeWalmartProduct(url: str, country_code: str = "us"):
    result, error = scrapeAndParse(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        extract_rules=walmartProductExtractRules(),
    )

    product = normalizeWalmartProduct(result, url) if isinstance(result, dict) else {}

    if error or not hasUsefulWalmartProduct(product) or isBlockedScrapeResult(result):
        result, error = scrapeAndParse(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
            extract_rules=walmartProductExtractRules(),
        )

    if error:
        return None, error

    if not isinstance(result, dict):
        return None, {
            "status": "error",
            "source_url": url,
            "message": "Walmart product extraction did not return structured JSON",
        }

    if isBlockedScrapeResult(result):
        return None, {
            "status": "blocked",
            "source_url": url,
            "message": "Walmart blocked or challenged the ScrapingBee request before product data was available",
        }

    return normalizeWalmartProduct(result, url), None


def scrapeWalmartReviewPage(url: str, country_code: str = "us", page: int = 1):
    review_url, resolve_error = resolveWalmartReviewsUrl(url, country_code=country_code, page=page)

    if resolve_error:
        return None, resolve_error

    result, error = scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        extract_rules=walmartReviewExtractRules(),
    )

    normalized = normalizeWalmartReviewResult(result, review_url) if isinstance(result, dict) else {"reviews": []}

    if not error and normalized.get("reviews"):
        return normalized, None

    result, error = scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=True,
        wait_ms=8000,
        wait_browser="load",
        block_resources=False,
        js_scenario={
            "instructions": [
                {"wait": 3000},
                {"scroll_y": 1600},
                {"wait": 2000},
            ]
        },
        extract_rules=walmartReviewExtractRules(),
    )

    if error:
        review_text_result, review_text_error = scrapeWalmartReviewTextFallback(review_url, country_code=country_code)

        if review_text_result and review_text_result.get("reviews"):
            return review_text_result, None

        preview_reviews, preview_error = scrapeWalmartProductPreviewReviews(url, country_code=country_code)

        if preview_reviews and preview_reviews.get("reviews"):
            return preview_reviews, None

        return None, error

    if not isinstance(result, dict):
        review_text_result, review_text_error = scrapeWalmartReviewTextFallback(review_url, country_code=country_code)

        if review_text_result and review_text_result.get("reviews"):
            return review_text_result, None

        return None, {
            "status": "error",
            "source_url": review_url,
            "message": "Walmart review extraction did not return structured JSON",
            "fallback_error": review_text_error,
        }

    if isBlockedScrapeResult(result):
        return None, {
            "status": "blocked",
            "source_url": review_url,
            "message": "Walmart blocked or challenged the ScrapingBee request before reviews were available",
        }

    normalized = normalizeWalmartReviewResult(result, review_url)

    if normalized.get("reviews"):
        return normalized, None

    review_text_result, review_text_error = scrapeWalmartReviewTextFallback(review_url, country_code=country_code)

    if review_text_result and review_text_result.get("reviews"):
        return review_text_result, None

    preview_reviews, preview_error = scrapeWalmartProductPreviewReviews(url, country_code=country_code)

    if preview_reviews and preview_reviews.get("reviews"):
        return preview_reviews, None

    return normalized, None


def scrapeWalmartWithReviews(url: str, country_code: str = "us", max_pages: int = 1):
    product, product_error = scrapeWalmartProduct(url, country_code=country_code)

    if product_error:
        product = {
            "item_id": extractWalmartItemId(url),
            "assumed_reviews_url": buildWalmartReviewsUrl(url, 1),
            "url": url,
            "title": None,
            "brand": None,
            "price": None,
            "currency": None,
            "description": None,
            "image": None,
            "sku": extractWalmartItemId(url),
            "gtin": None,
            "seller": None,
            "availability": None,
            "average_rating": None,
            "total_reviews": None,
            "product_error": product_error,
        }

    all_reviews = []
    rating_summary = {}
    review_error = None

    for page in range(1, max_pages + 1):
        page_result, error = scrapeWalmartReviewPage(url, country_code=country_code, page=page)

        if error:
            review_error = error
            break

        reviews = page_result.get("reviews", [])

        if not reviews:
            break

        all_reviews.extend(reviews)

        if page == 1:
            rating_summary = page_result.get("rating_summary", {})

    if not all_reviews:
        preview_result, preview_error = scrapeWalmartProductPreviewReviews(url, country_code=country_code)

        if preview_result and preview_result.get("reviews"):
            all_reviews = preview_result.get("reviews", [])
            rating_summary = preview_result.get("rating_summary", {})
            review_error = None
        elif preview_error and not review_error:
            review_error = preview_error

    return {
        "product": product,
        "reviews": dedupeReviews(all_reviews),
        "rating_summary": rating_summary,
        "review_count_scraped": len(all_reviews),
        "review_source": "scrapingbee_live" if all_reviews else "blocked_or_empty_live_scrape",
        "review_error": review_error,
    }, None

def extractWalmartItemId(url: str):
    parsed = urlparse(url)
    path_parts = [part for part in parsed.path.split("/") if part]

    if "reviews" in path_parts and "product" in path_parts:
        for part in reversed(path_parts):
            if re.fullmatch(r"\d+", part):
                return part

    if "ip" in path_parts:
        ip_index = path_parts.index("ip")
        for part in reversed(path_parts[ip_index + 1:]):
            match = re.search(r"(\d{5,})", part)
            if match:
                return match.group(1)

    match = re.search(r"/(?:ip|reviews/product)/(?:[^/?#]+/)?(\d{5,})", parsed.path)
    return match.group(1) if match else None


def buildWalmartReviewsUrl(url: str, page: int = 1):
    parsed = urlparse(url)
    item_id = extractWalmartItemId(url)

    if not item_id:
        return None

    host = parsed.netloc if "walmart." in parsed.netloc else "www.walmart.com"
    return f"https://{host}/reviews/product/{item_id}?page={page}"


def buildWalmartReviewsUrlFromId(url: str, item_id: str, page: int = 1):
    parsed = urlparse(url)
    host = parsed.netloc if "walmart." in parsed.netloc else "www.walmart.com"
    return f"https://{host}/reviews/product/{item_id}?page={page}"


def findWalmartReviewItemIdInHtml(html: str):
    if not html:
        return None

    normalized = html.replace("\\/", "/")
    matches = re.findall(r"/reviews/product/(\d+)", normalized)

    if not matches:
        return None

    return matches[0]


def resolveWalmartReviewsUrl(url: str, country_code: str = "us", page: int = 1):
    html, error = scrapePageHtml(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if error:
        html, error = scrapePageHtml(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    if not error:
        review_item_id = findWalmartReviewItemIdInHtml(html)

        if review_item_id:
            return buildWalmartReviewsUrlFromId(url, review_item_id, page), None

    fallback_url = buildWalmartReviewsUrl(url, page)

    if fallback_url:
        return fallback_url, None

    return None, {
        "status": "error",
        "message": "Could not extract Walmart review URL from page HTML or item ID",
        "source_url": url,
    }


def walmartProductExtractRules():
    return {
        "title": {"selector": "h1, [data-testid='product-title']", "output": "text"},
        "price": {
            "selector": "[itemprop='price'], [data-automation-id='product-price'], [data-testid='price-wrap']",
            "output": "text",
        },
        "brand": {
            "selector": "[data-testid='product-brand'], [itemprop='brand'], a[href*='/brand/']",
            "output": "text",
        },
        "description": {
            "selector": "[data-testid='product-description-content'], [data-testid='product-description'], [itemprop='description']",
            "output": "text",
        },
        "average_rating": {
            "selector": "[itemprop='ratingValue'], [data-testid='reviews-and-ratings']",
            "output": "text",
        },
        "total_reviews": {
            "selector": "[itemprop='reviewCount'], a[href*='/reviews/product/']",
            "output": "text",
        },
        "seller": {
            "selector": "[data-testid='seller-name'], [data-automation-id='seller-name']",
            "output": "text",
        },
        "availability": {
            "selector": "[data-testid='fulfillment-shipping-text'], [data-automation-id='fulfillment-shipping-text']",
            "output": "text",
        },
        "next_data": {"selector": "script#__NEXT_DATA__", "output": "text"},
        "json_ld": {
            "selector": "script[type='application/ld+json']",
            "type": "list",
            "output": "text",
        },
    }


def walmartReviewExtractRules():
    return {
        "reviews": {
            "selector": "[data-testid='review-item'], [data-automation-id='review'], [itemprop='review']",
            "type": "list",
            "output": {
                "title": {
                    "selector": "[data-testid='review-title'], [itemprop='name'], h3",
                    "output": "text",
                },
                "body": {
                    "selector": "[data-testid='review-text'], [itemprop='reviewBody'], p",
                    "output": "text",
                },
                "rating": {
                    "selector": "[itemprop='ratingValue'], [aria-label*='out of 5'], [aria-label*='stars']",
                    "output": "text",
                },
                "author": {
                    "selector": "[data-testid='review-author'], [itemprop='author'], .f7",
                    "output": "text",
                },
                "date": {
                    "selector": "[data-testid='review-date'], time",
                    "output": "text",
                },
            },
        },
        "average_rating": {
            "selector": "[itemprop='ratingValue'], [data-testid='reviews-and-ratings']",
            "output": "text",
        },
        "total_reviews": {
            "selector": "[itemprop='reviewCount']",
            "output": "text",
        },
        "next_data": {"selector": "script#__NEXT_DATA__", "output": "text"},
        "json_ld": {
            "selector": "script[type='application/ld+json']",
            "type": "list",
            "output": "text",
        },
    }


def normalizeWalmartProduct(result: dict, url: str):
    product_ld = findJsonLdProduct(result.get("json_ld")) or findJsonLdProduct(result.get("next_data"))
    offer = normalizeOffer(product_ld.get("offers"))
    aggregate_rating = product_ld.get("aggregateRating") if isinstance(product_ld, dict) else {}
    item_id = extractWalmartItemId(url)

    availability = firstNonEmpty(
        result.get("availability"),
        str(offer.get("availability", "")).split("/")[-1] if offer else None,
    )

    return {
        "item_id": item_id,
        "assumed_reviews_url": buildWalmartReviewsUrl(url, 1),
        "url": url,
        "title": firstNonEmpty(result.get("title"), product_ld.get("name")),
        "brand": firstNonEmpty(result.get("brand"), normalizeBrand(product_ld.get("brand"))),
        "price": firstNonEmpty(result.get("price"), offer.get("price"), nestedValue(offer, "priceSpecification", "price")),
        "currency": firstNonEmpty(offer.get("priceCurrency"), nestedValue(offer, "priceSpecification", "priceCurrency")),
        "description": firstNonEmpty(result.get("description"), product_ld.get("description")),
        "image": normalizeImage(product_ld.get("image")),
        "sku": firstNonEmpty(product_ld.get("sku"), item_id),
        "gtin": firstNonEmpty(product_ld.get("gtin13"), product_ld.get("gtin12"), product_ld.get("gtin")),
        "seller": firstNonEmpty(result.get("seller"), nestedValue(offer, "seller", "name")),
        "availability": availability,
        "average_rating": parseRating(firstNonEmpty(result.get("average_rating"), nestedValue(aggregate_rating, "ratingValue"))),
        "total_reviews": parseCount(firstNonEmpty(result.get("total_reviews"), nestedValue(aggregate_rating, "reviewCount"), nestedValue(aggregate_rating, "ratingCount"))),
    }


def hasUsefulWalmartProduct(product: dict):
    return bool(product.get("title") or product.get("price") or product.get("description"))


def normalizeJsonReview(node: dict):
    rating = firstNonEmpty(
        node.get("rating"),
        node.get("ratingValue"),
        node.get("overallRating"),
        nestedValue(node, "reviewRating", "ratingValue"),
    )

    author = node.get("author")
    author_name = nestedValue(author, "name") if isinstance(author, dict) else author

    body = firstNonEmpty(
        node.get("body"),
        node.get("text"),
        node.get("reviewText"),
        node.get("reviewBody"),
        node.get("comments"),
    )

    title = firstNonEmpty(node.get("title"), node.get("headline"), node.get("name"), node.get("reviewTitle"))

    if not body and not title:
        return None

    badges = json.dumps(node.get("badges", node.get("badge", ""))).lower()

    return {
        "title": title,
        "body": body,
        "rating": parseRating(rating),
        "author": firstNonEmpty(author_name, node.get("customerName"), node.get("userNickname"), node.get("nickname")),
        "date": firstNonEmpty(node.get("datePublished"), node.get("submissionTime"), node.get("reviewSubmissionTime")),
        "verified": bool(node.get("verifiedPurchaser")) or "verified" in badges,
    }


def isReviewLikeJson(node: dict):
    node_type = node.get("@type")
    type_values = node_type if isinstance(node_type, list) else [node_type]

    if any(str(item).lower() == "review" for item in type_values if item):
        return True

    lowered_keys = {str(key).lower() for key in node.keys()}
    text_keys = {"reviewtext", "reviewbody", "reviewtitle", "comments", "headline"}
    rating_keys = {"rating", "ratingvalue", "overallrating", "reviewrating"}

    return bool(lowered_keys & text_keys) and bool(lowered_keys & rating_keys)


def extractWalmartReviewsFromJson(value):
    reviews = []

    for document in parseJsonDocuments(value):
        for node in walkJson(document):
            if not isReviewLikeJson(node):
                continue

            review = normalizeJsonReview(node)
            if review:
                reviews.append(review)

    return reviews


def normalizeExtractedWalmartReview(item: dict):
    review = {
        "title": cleanExtractedText(item.get("title")),
        "body": cleanExtractedText(item.get("body")),
        "rating": parseRating(item.get("rating")),
        "author": cleanExtractedText(item.get("author")),
        "date": cleanExtractedText(item.get("date")),
        "verified": None,
    }

    if not review["title"] and not review["body"]:
        return None

    return review


def dedupeReviews(reviews: list[dict]):
    seen = set()
    unique_reviews = []

    for review in reviews:
        key = (
            cleanExtractedText(review.get("title")) or "",
            cleanExtractedText(review.get("body")) or "",
            cleanExtractedText(review.get("author")) or "",
        )

        if key in seen:
            continue

        seen.add(key)
        unique_reviews.append(review)

    return unique_reviews


def normalizeWalmartReviewResult(result: dict, review_url: str):
    reviews = []
    raw_reviews = result.get("reviews", [])

    if not isinstance(raw_reviews, list):
        raw_reviews = []

    for item in raw_reviews:
        if isinstance(item, dict):
            review = normalizeExtractedWalmartReview(item)
            if review:
                reviews.append(review)

    reviews.extend(extractWalmartReviewsFromJson(result.get("json_ld")))
    reviews.extend(extractWalmartReviewsFromJson(result.get("next_data")))
    reviews = dedupeReviews(reviews)

    product_ld = findJsonLdProduct(result.get("json_ld")) or findJsonLdProduct(result.get("next_data"))
    aggregate_rating = product_ld.get("aggregateRating") if isinstance(product_ld, dict) else {}

    return {
        "source_url": review_url,
        "reviews": reviews,
        "rating_summary": {
            "average_rating": parseRating(firstNonEmpty(result.get("average_rating"), nestedValue(aggregate_rating, "ratingValue"))),
            "total_reviews": parseCount(firstNonEmpty(result.get("total_reviews"), nestedValue(aggregate_rating, "reviewCount"), nestedValue(aggregate_rating, "ratingCount"))),
        },
    }


def parseWalmartReviewTextPage(text: str, source_url: str):
    clean = normalizeText(text)
    lines = clean.splitlines()
    reviews = []

    date_pattern = re.compile(
        r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}$",
        re.IGNORECASE,
    )
    rating_pattern = re.compile(r"(\d+(?:\.\d+)?)\s+out of\s+5\s+stars?\s+review", re.IGNORECASE)
    flat_text = re.sub(r"\s+", " ", clean).strip()
    review_count_match = re.search(r"Showing\s+\d+-\d+\s+of\s+([\d,]+)\s+reviews", flat_text, re.IGNORECASE)
    average_rating_match = re.search(
        r"Customer ratings\s+(?:&|and)\s+reviews.*?(\d+(?:\.\d+)?)\s+out of\s+5",
        flat_text,
        re.IGNORECASE,
    )

    if not average_rating_match:
        average_rating_match = re.search(
            r"\b(\d+(?:\.\d+)?)\s+out of\s+5\s+\d+(?:\.\d+)?\s+out of\s+5\s+stars",
            flat_text,
            re.IGNORECASE,
        )

    date_indexes = [index for index, line in enumerate(lines) if date_pattern.match(line)]

    for position, date_index in enumerate(date_indexes):
        next_date_index = date_indexes[position + 1] if position + 1 < len(date_indexes) else len(lines)
        block = lines[date_index:next_date_index]

        if len(block) < 4:
            continue

        date = block[0]
        author = block[1] if len(block) > 1 else None
        rating = None
        rating_index = None

        for index, line in enumerate(block):
            rating_match = rating_pattern.search(line)

            if rating_match:
                rating = parseRating(rating_match.group(1))
                rating_index = index
                break

        if rating_index is None:
            continue

        title = None
        body_lines = []

        for line in block[rating_index + 1:]:
            lowered = line.lower()

            if (
                line == "* * *"
                or lowered.startswith("review from")
                or lowered.startswith("helpful?")
                or lowered.startswith("report ")
                or lowered.startswith("view all reviews")
                or lowered.startswith("we'd love")
            ):
                break

            if not title:
                title = line
                continue

            body_lines.append(line)

        body = cleanExtractedText(" ".join(body_lines))

        if not title and not body:
            continue

        reviews.append({
            "title": cleanExtractedText(title),
            "body": body,
            "rating": rating,
            "author": cleanExtractedText(author),
            "date": date,
            "verified": None,
            "source": "walmart_product_page_preview",
        })

    flat_date_pattern = re.compile(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}",
        re.IGNORECASE,
    )
    flat_date_matches = list(flat_date_pattern.finditer(flat_text))

    for index, date_match in enumerate(flat_date_matches):
        start = date_match.end()
        end = flat_date_matches[index + 1].start() if index + 1 < len(flat_date_matches) else len(flat_text)
        block = flat_text[start:end].strip()

        rating_match = rating_pattern.search(block)
        if not rating_match:
            continue

        seller_author_text = block[:rating_match.start()].strip()
        author = re.split(
            r"\s+(?:Sold\s+(?:and\s+shipped\s+)?by|Delivered\s+by|Ships\s+from|Walmart\.com)\b",
            seller_author_text,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()

        body_text = block[rating_match.end():].strip()
        verified = bool(re.match(r"Verified Purchase\b", body_text, flags=re.IGNORECASE))
        body_text = re.sub(r"^Verified Purchase\s+", "", body_text, flags=re.IGNORECASE).strip()
        body_text = re.split(
            r"\s+(?:Helpful\?|Report\b|View all reviews\b|Customer ratings\b)",
            body_text,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()

        if not body_text:
            continue

        reviews.append({
            "title": None,
            "body": cleanExtractedText(body_text),
            "rating": parseRating(rating_match.group(1)),
            "author": cleanExtractedText(author),
            "date": date_match.group(0),
            "verified": verified,
            "source": "walmart_review_page_text",
        })

    return {
        "source_url": source_url,
        "reviews": dedupeReviews(reviews),
        "rating_summary": {
            "average_rating": parseRating(average_rating_match.group(1)) if average_rating_match else None,
            "total_reviews": parseCount(review_count_match.group(1)) if review_count_match else None,
        },
    }


def scrapeWalmartProductPreviewReviews(url: str, country_code: str = "us"):
    product_text, text_error = scrapePageText(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if text_error:
        product_text, text_error = scrapePageText(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    if text_error or not product_text:
        return None, text_error

    preview_reviews = parseWalmartReviewTextPage(product_text, url)
    return preview_reviews, None


def scrapeWalmartReviewTextFallback(review_url: str, country_code: str = "us"):
    review_text, text_error = scrapePageText(
        url=review_url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if text_error:
        review_text, text_error = scrapePageText(
            url=review_url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    if text_error or not review_text:
        return None, text_error

    parsed_reviews = parseWalmartReviewTextPage(review_text, review_url)
    return parsed_reviews, None


def debugWalmartReviewScrape(url: str, country_code: str = "us"):
    review_url, resolve_error = resolveWalmartReviewsUrl(url, country_code=country_code, page=1)
    assumed_review_url = buildWalmartReviewsUrl(url, 1)

    debug = {
        "product_url": url,
        "assumed_review_url": assumed_review_url,
        "resolved_review_url": review_url,
        "resolve_error": resolve_error,
    }

    if review_url:
        review_text, review_text_error = scrapePageText(
            url=review_url,
            country_code=country_code,
            render_js=False,
            wait_ms=0,
            block_resources=False,
        )

        if review_text_error:
            review_text, review_text_error = scrapePageText(
                url=review_url,
                country_code=country_code,
                render_js=True,
                wait_ms=8000,
                wait_browser="load",
                block_resources=False,
            )

        normalized_review_text = normalizeText(review_text or "")
        debug["review_page"] = {
            "error": review_text_error,
            "text_length": len(review_text or ""),
            "preview": normalized_review_text[:3000],
            "contains_review_markers": {
                "customer_ratings": "customer ratings" in normalized_review_text.lower(),
                "out_of_5_stars_review": "out of 5 stars review" in normalized_review_text.lower(),
                "showing_reviews": "showing" in normalized_review_text.lower() and "reviews" in normalized_review_text.lower(),
                "captcha": "captcha" in normalized_review_text.lower(),
                "robot": "robot" in normalized_review_text.lower(),
            },
        }

    product_text, product_text_error = scrapePageText(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        block_resources=False,
    )

    if product_text_error:
        product_text, product_text_error = scrapePageText(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
        )

    normalized_product_text = normalizeText(product_text or "")
    preview_reviews = parseWalmartReviewTextPage(product_text or "", url)

    debug["product_page"] = {
        "error": product_text_error,
        "text_length": len(product_text or ""),
        "preview": normalized_product_text[:3000],
        "parsed_preview_review_count": len(preview_reviews.get("reviews", [])),
        "parsed_preview_reviews": preview_reviews.get("reviews", [])[:5],
        "contains_review_markers": {
            "customer_ratings": "customer ratings" in normalized_product_text.lower(),
            "out_of_5_stars_review": "out of 5 stars review" in normalized_product_text.lower(),
            "showing_reviews": "showing" in normalized_product_text.lower() and "reviews" in normalized_product_text.lower(),
            "captcha": "captcha" in normalized_product_text.lower(),
            "robot": "robot" in normalized_product_text.lower(),
        },
    }

    return debug, None


def shouldRetryWalmartScrape(error):
    if not isinstance(error, dict):
        return False

    message = str(error.get("message") or "").lower()
    return "document is empty" in message or "read timeout" in message or "block_resources=false" in message


def scrapeWalmartProduct(url: str, country_code: str = "us"):
    result, error = scrapeAndParse(
        url=url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        extract_rules=walmartProductExtractRules(),
    )

    product = normalizeWalmartProduct(result, url) if isinstance(result, dict) else {}

    if error or not hasUsefulWalmartProduct(product) or isBlockedScrapeResult(result):
        result, error = scrapeAndParse(
            url=url,
            country_code=country_code,
            render_js=True,
            wait_ms=8000,
            wait_browser="load",
            block_resources=False,
            extract_rules=walmartProductExtractRules(),
        )

    if error:
        return None, error

    if not isinstance(result, dict):
        return None, {
            "status": "error",
            "source_url": url,
            "message": "Walmart product extraction did not return structured JSON",
        }

    if isBlockedScrapeResult(result):
        return None, {
            "status": "blocked",
            "source_url": url,
            "message": "Walmart blocked or challenged the ScrapingBee request before product data was available",
        }

    return normalizeWalmartProduct(result, url), None


def scrapeWalmartReviewPage(url: str, country_code: str = "us", page: int = 1):
    review_url, resolve_error = resolveWalmartReviewsUrl(url, country_code=country_code, page=page)

    if resolve_error:
        return None, resolve_error

    result, error = scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=False,
        wait_ms=0,
        extract_rules=walmartReviewExtractRules(),
    )

    normalized = normalizeWalmartReviewResult(result, review_url) if isinstance(result, dict) else {"reviews": []}

    if not error and normalized.get("reviews"):
        return normalized, None

    result, error = scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=True,
        wait_ms=8000,
        wait_browser="load",
        block_resources=False,
        js_scenario={
            "instructions": [
                {"wait": 3000},
                {"scroll_y": 1600},
                {"wait": 2000},
            ]
        },
        extract_rules=walmartReviewExtractRules(),
    )

    if error:
        review_text_result, review_text_error = scrapeWalmartReviewTextFallback(review_url, country_code=country_code)

        if review_text_result and review_text_result.get("reviews"):
            return review_text_result, None

        preview_reviews, preview_error = scrapeWalmartProductPreviewReviews(url, country_code=country_code)

        if preview_reviews and preview_reviews.get("reviews"):
            return preview_reviews, None

        return None, error

    if not isinstance(result, dict):
        review_text_result, review_text_error = scrapeWalmartReviewTextFallback(review_url, country_code=country_code)

        if review_text_result and review_text_result.get("reviews"):
            return review_text_result, None

        return None, {
            "status": "error",
            "source_url": review_url,
            "message": "Walmart review extraction did not return structured JSON",
            "fallback_error": review_text_error,
        }

    if isBlockedScrapeResult(result):
        return None, {
            "status": "blocked",
            "source_url": review_url,
            "message": "Walmart blocked or challenged the ScrapingBee request before reviews were available",
        }

    normalized = normalizeWalmartReviewResult(result, review_url)

    if normalized.get("reviews"):
        return normalized, None

    review_text_result, review_text_error = scrapeWalmartReviewTextFallback(review_url, country_code=country_code)

    if review_text_result and review_text_result.get("reviews"):
        return review_text_result, None

    preview_reviews, preview_error = scrapeWalmartProductPreviewReviews(url, country_code=country_code)

    if preview_reviews and preview_reviews.get("reviews"):
        return preview_reviews, None

    return normalized, None


def scrapeWalmartWithReviews(url: str, country_code: str = "us", max_pages: int = 1):
    product, product_error = scrapeWalmartProduct(url, country_code=country_code)

    if product_error:
        item_id = extractWalmartItemId(url)
        product = {
            "item_id": item_id,
            "assumed_reviews_url": buildWalmartReviewsUrl(url, 1),
            "url": url,
            "title": None,
            "brand": None,
            "price": None,
            "currency": None,
            "description": None,
            "image": None,
            "sku": item_id,
            "gtin": None,
            "seller": None,
            "availability": None,
            "average_rating": None,
            "total_reviews": None,
            "product_error": product_error,
        }

    all_reviews = []
    rating_summary = {}
    review_error = None

    for page in range(1, max_pages + 1):
        page_result, error = scrapeWalmartReviewPage(url, country_code=country_code, page=page)

        if error:
            review_error = error
            break

        reviews = page_result.get("reviews", [])

        if not reviews:
            break

        all_reviews.extend(reviews)

        if page == 1:
            rating_summary = page_result.get("rating_summary", {})

    if not all_reviews:
        preview_result, preview_error = scrapeWalmartProductPreviewReviews(url, country_code=country_code)

        if preview_result and preview_result.get("reviews"):
            all_reviews = preview_result.get("reviews", [])
            rating_summary = preview_result.get("rating_summary", {})
            review_error = None
        elif preview_error and not review_error:
            review_error = preview_error

    return {
        "product": product,
        "reviews": dedupeReviews(all_reviews),
        "rating_summary": rating_summary,
        "review_count_scraped": len(all_reviews),
        "review_source": "scrapingbee_live" if all_reviews else "blocked_or_empty_live_scrape",
        "review_error": review_error,
    }, None

def searchGoogle(query: str, country_code: str = "us", language: str = "en", nb_results: int = 10):
    api_key, error = requireApiKey()
    if error:
        return None, error

    response = requests.get(
        SCRAPINGBEE_GOOGLE_URL,
        params={
            "api_key": api_key,
            "search": query,
            "country_code": country_code,
            "language": language,
            "nb_results": str(nb_results),
        },
        timeout=(10, 60),
    )

    if response.status_code >= 400:
        return None, {
            "status": "error",
            "status_code": response.status_code,
            "message": response.text[:1000],
        }

    return response.json(), None


def detectSourceFromUrl(url: str):
    lowered = url.lower()
    host = urlparse(url).netloc.lower()

    if "reddit.com" in host:
        return "reddit"
    if "twitter.com" in host or "x.com" in host:
        return "twitter"
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "tiktok.com" in host:
        return "tiktok"
    if "taobao.com" in host or "tmall.com" in host:
        return "taobao"
    if "amazon." in host:
        return "amazon"
    if "walmart." in host:
        return "walmart"
    if "temu." in host:
        return "temu"

    return "web"


def normalizeSerpResults(data: dict):
    organic_results = data.get("organic_results", [])
    results = []

    for item in organic_results:
        url = item.get("url") or item.get("link")
        title = item.get("title", "")
        description = item.get("description") or item.get("snippet", "")

        if not url:
            continue

        results.append({
            "title": title,
            "url": url,
            "description": description,
            "source": detectSourceFromUrl(url),
        })

    return results
