from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from backend.brightdata.client import download_snapshot, get_snapshot_progress, scrape_brightdata
from backend.brightdata.endpoints import get_endpoint_registry

router = APIRouter(prefix='/api/brightdata', tags=['brightdata'])


class BrightDataScrapeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    endpoint: str | None = None
    input: list[dict[str, Any]]
    dataset_id: str | None = None
    dataset_key: str | None = None
    scrape_type: str | None = Field(default=None, alias='type')
    discover_by: str | None = None
    notify: bool = False
    include_errors: bool = True
    timeout_seconds: int = 120


class BrightDataDownloadSnapshotRequest(BaseModel):
    dataset_key: str | None = None
    format: str = 'json'
    timeout_seconds: int = 120


@router.get('/endpoints')
async def brightdataEndpoints():
    return get_endpoint_registry()


@router.post('/scrape')
async def brightdataScrape(payload: BrightDataScrapeRequest):
    return scrape_brightdata(
        endpoint_key=payload.endpoint,
        input_records=payload.input,
        dataset_id=payload.dataset_id,
        dataset_key=payload.dataset_key,
        scrape_type=payload.scrape_type,
        discover_by=payload.discover_by,
        notify=payload.notify,
        include_errors=payload.include_errors,
        timeout_seconds=payload.timeout_seconds,
    )


@router.post('/scrape/{endpoint_key:path}')
async def brightdataScrapeEndpoint(endpoint_key: str, payload: BrightDataScrapeRequest):
    return scrape_brightdata(
        endpoint_key=endpoint_key,
        input_records=payload.input,
        dataset_id=payload.dataset_id,
        dataset_key=payload.dataset_key,
        scrape_type=payload.scrape_type,
        discover_by=payload.discover_by,
        notify=payload.notify,
        include_errors=payload.include_errors,
        timeout_seconds=payload.timeout_seconds,
    )


@router.get('/snapshots/{snapshot_id}/progress')
async def brightdataSnapshotProgress(snapshot_id: str, timeout_seconds: int = 30):
    return get_snapshot_progress(snapshot_id=snapshot_id, timeout_seconds=timeout_seconds)


@router.post('/snapshots/{snapshot_id}/download')
async def brightdataSnapshotDownload(snapshot_id: str, payload: BrightDataDownloadSnapshotRequest):
    return download_snapshot(
        snapshot_id=snapshot_id,
        dataset_key=payload.dataset_key,
        output_format=payload.format,
        timeout_seconds=payload.timeout_seconds,
    )
