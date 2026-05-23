import os
import re
import json
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
        # "return_page_text": "true",
        "wait": str(wait_ms),
    }

    if block_resources is not None:
        params["block_resources"] = "false" if block_resources is False else "true"

    if wait_browser:
        params["wait_browser"] = wait_browser
   
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

    # Extract rules
    if extract_rules:
        params["extract_rules"] = json.dumps(extract_rules)
    else:
        params["return_page_text"] = "true"

    try:
        response = requests.get(
            SCRAPINGBEE_BASE_URL,
            params=params,
            timeout=(20, 120),
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

    js_scenario = {
        "instructions": [
            {"wait": 3000},
            {"scroll_y": 1200},
            {"wait": 1500},
        ]
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

    result, error = scrapeAndParse(
        url=review_url,
        country_code=country_code,
        render_js=True,
        wait_ms=8000,
        wait_browser="load",
        block_resources=False,
        extract_rules=extract_rules,
    )

    return result, error

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
                "status": "error",
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
