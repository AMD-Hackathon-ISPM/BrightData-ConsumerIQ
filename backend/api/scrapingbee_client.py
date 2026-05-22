import os
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

    # Extract rules
    if extract_rules:
        params["extract_rules"] = json.dumps(extract_rules)

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


def scrapeAmazonWithReviews(url: str, country_code: str = "us"):
    """Optimized scraper untuk Amazon product + reviews."""
    
    js_scenario = {
        "instructions": [
            {"wait": 3000},
            {"scroll_to": "#reviewsMedley"},
            {"wait": 3000},
            {"scroll_to": "#reviewsMedley"},
            {"wait": 2000},
            {"click": "[data-hook='see-all-reviews-link-foot']"},
            {"wait": 3000},
            {"scroll_to": "[data-hook='review']"},
            {"wait": 2000},
        ]
    }

    extract_rules = {
        "reviews": {
            "selector": "[data-hook='review']",
            "type": "list",
            "output": {
                "title": {"selector": "[data-hook='review-title'] span", "type": "text"},
                "body": {"selector": "[data-hook='review-body'] span", "type": "text"},
                "stars": {"selector": "[data-hook='review-star-rating'] span", "type": "text"},
                "author": {"selector": ".a-profile-name", "type": "text"},
                "date": {"selector": "[data-hook='review-date']", "type": "text"},
                "verified": {"selector": "[data-hook='avp-badge']", "type": "text"}
            }
        },
        "rating_summary": {
            "selector": "#averageCustomerReviews",
            "output": {
                "avg_rating": {"selector": "[data-hook='rating-out-of-text']", "type": "text"},
                "total_reviews": {"selector": "[data-hook='total-review-count']", "type": "text"}
            }
        },
        "price": {"selector": ".a-price .a-offscreen", "type": "text"}
    }

    return scrapeAndParse(
        url=url,
        country_code=country_code,
        render_js=True,
        wait_ms=15000,
        js_scenario=js_scenario,
        extract_rules=extract_rules,
    )


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