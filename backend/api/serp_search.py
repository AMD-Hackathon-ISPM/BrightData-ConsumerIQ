from fastapi import APIRouter
from pydantic import BaseModel

from backend.api.scrapingbee_client import normalizeSerpResults, searchGoogle

router = APIRouter(tags=["serp"])


class SerpSearchRequest(BaseModel):
    query: str
    country_code: str = "us"
    language: str = "en"
    nb_results: int = 10


@router.post("/api/serp-search")
async def serpSearch(payload: SerpSearchRequest):
    data, error = searchGoogle(
        query=payload.query,
        country_code=payload.country_code,
        language=payload.language,
        nb_results=payload.nb_results,
    )

    if error:
        return error

    results = normalizeSerpResults(data)

    return {
        "status": "success",
        "source": "scrapingbee_google",
        "query": payload.query,
        "country_code": payload.country_code,
        "results": results,
        "raw_result_count": len(data.get("organic_results", [])),
    }
