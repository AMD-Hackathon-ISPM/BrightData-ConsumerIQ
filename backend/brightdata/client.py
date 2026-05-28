from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from pydantic import ValidationError

from backend.brightdata.endpoints import get_endpoint, validate_endpoint_input
from backend.brightdata.schemas import BRIGHTDATA_SCHEMA_REGISTRY, BrightDataErrorPayload

BRIGHTDATA_SCRAPE_URL = 'https://api.brightdata.com/datasets/v3/scrape'
BRIGHTDATA_PROGRESS_URL = 'https://api.brightdata.com/datasets/v3/progress'
BRIGHTDATA_SNAPSHOT_URL = 'https://api.brightdata.com/datasets/v3/snapshot'

load_dotenv(Path(__file__).resolve().parents[1] / '.env')


def get_brightdata_token() -> str | None:
    return (
        os.getenv('BRIGHTDATA_API_TOKEN')
        or os.getenv('BRIGHT_DATA_API_TOKEN')
        or os.getenv('BRIGHTDATA_TOKEN')
    )


def _merge_default_input(default_input: dict[str, Any], input_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not default_input:
        return input_records
    return [{**default_input, **record} for record in input_records]


def _validation_summary(dataset_key: str | None, data: Any) -> dict[str, Any]:
    if isinstance(data, dict) and data.get('snapshot_id'):
        return {
            'status': 'pending_snapshot',
            'reason': 'Bright Data returned a snapshot_id instead of records. Poll progress and download when ready.',
            'snapshotId': data.get('snapshot_id'),
        }

    if dataset_key is None:
        return {'status': 'skipped', 'reason': 'No schema key configured for this endpoint'}

    model = BRIGHTDATA_SCHEMA_REGISTRY.get(dataset_key)
    if model is None:
        return {'status': 'skipped', 'reason': f'Unknown Bright Data schema key: {dataset_key}'}

    try:
        model.model_validate(data)
        return {'status': 'valid', 'schemaKey': dataset_key}
    except ValidationError as payload_error:
        try:
            BrightDataErrorPayload.model_validate(data)
            return {'status': 'valid_error_payload', 'schemaKey': 'brightdata.error'}
        except ValidationError:
            return {
                'status': 'invalid',
                'schemaKey': dataset_key,
                'errorCount': len(payload_error.errors()),
                'errors': payload_error.errors()[:5],
            }


def scrape_brightdata(
    *,
    input_records: list[dict[str, Any]],
    endpoint_key: str | None = None,
    dataset_id: str | None = None,
    dataset_key: str | None = None,
    scrape_type: str | None = None,
    discover_by: str | None = None,
    notify: bool = False,
    include_errors: bool = True,
    timeout_seconds: int = 120,
) -> dict[str, Any]:
    endpoint = get_endpoint(endpoint_key) if endpoint_key else None

    if endpoint_key and endpoint is None:
        return {
            'status': 'configuration_error',
            'source': 'brightdata',
            'error': f'Unknown Bright Data endpoint: {endpoint_key}',
        }

    if endpoint:
        input_records = _merge_default_input(endpoint.default_input, input_records)
        input_errors = validate_endpoint_input(endpoint, input_records)
        if input_errors:
            return {
                'status': 'validation_error',
                'source': 'brightdata',
                'endpoint': endpoint.key,
                'errors': input_errors,
            }

        dataset_id = dataset_id or endpoint.resolved_dataset_id()
        dataset_key = dataset_key or endpoint.dataset_key
        scrape_type = scrape_type or endpoint.scrape_type
        discover_by = discover_by or endpoint.discover_by

    if not dataset_id:
        return {
            'status': 'configuration_error',
            'source': 'brightdata',
            'endpoint': endpoint_key,
            'error': 'Bright Data dataset_id is not configured for this request',
            'nextStep': 'Set the endpoint dataset env var or pass dataset_id directly to /api/brightdata/scrape.',
        }

    token = get_brightdata_token()
    if not token:
        return {
            'status': 'configuration_error',
            'source': 'brightdata',
            'endpoint': endpoint_key,
            'datasetId': dataset_id,
            'error': 'BRIGHTDATA_API_TOKEN is not configured',
        }

    params: dict[str, Any] = {
        'dataset_id': dataset_id,
        'notify': str(notify).lower(),
        'include_errors': str(include_errors).lower(),
    }
    if scrape_type:
        params['type'] = scrape_type
    if discover_by:
        params['discover_by'] = discover_by

    try:
        response = requests.post(
            BRIGHTDATA_SCRAPE_URL,
            params=params,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            json={'input': input_records},
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        return {
            'status': 'request_error',
            'source': 'brightdata',
            'endpoint': endpoint_key,
            'datasetId': dataset_id,
            'error': str(exc),
        }

    try:
        data = response.json()
    except ValueError:
        data = {'rawText': response.text}

    if response.status_code >= 400:
        return {
            'status': 'http_error',
            'source': 'brightdata',
            'endpoint': endpoint_key,
            'datasetId': dataset_id,
            'httpStatus': response.status_code,
            'response': data,
        }

    validation = _validation_summary(dataset_key, data)

    snapshot_id = data.get('snapshot_id') if isinstance(data, dict) else None

    return {
        'status': 'snapshot_pending' if snapshot_id else 'success',
        'source': 'brightdata',
        'endpoint': endpoint_key,
        'datasetId': dataset_id,
        'datasetKey': dataset_key,
        'query': {
            'type': scrape_type,
            'discoverBy': discover_by,
            'notify': notify,
            'includeErrors': include_errors,
        },
        'input': input_records,
        'snapshotId': snapshot_id,
        'records': data,
        'validation': validation,
    }


def get_snapshot_progress(snapshot_id: str, timeout_seconds: int = 30) -> dict[str, Any]:
    token = get_brightdata_token()
    if not token:
        return {
            'status': 'configuration_error',
            'source': 'brightdata',
            'snapshotId': snapshot_id,
            'error': 'BRIGHTDATA_API_TOKEN is not configured',
        }

    try:
        response = requests.get(
            f'{BRIGHTDATA_PROGRESS_URL}/{snapshot_id}',
            headers={'Authorization': f'Bearer {token}'},
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        return {
            'status': 'request_error',
            'source': 'brightdata',
            'snapshotId': snapshot_id,
            'error': str(exc),
        }

    try:
        data = response.json()
    except ValueError:
        data = {'rawText': response.text}

    if response.status_code >= 400:
        return {
            'status': 'http_error',
            'source': 'brightdata',
            'snapshotId': snapshot_id,
            'httpStatus': response.status_code,
            'response': data,
        }

    return {
        'status': 'success',
        'source': 'brightdata',
        'snapshotId': snapshot_id,
        'progress': data,
    }


def download_snapshot(
    snapshot_id: str,
    *,
    dataset_key: str | None = None,
    output_format: str = 'json',
    timeout_seconds: int = 120,
) -> dict[str, Any]:
    token = get_brightdata_token()
    if not token:
        return {
            'status': 'configuration_error',
            'source': 'brightdata',
            'snapshotId': snapshot_id,
            'error': 'BRIGHTDATA_API_TOKEN is not configured',
        }

    try:
        response = requests.get(
            f'{BRIGHTDATA_SNAPSHOT_URL}/{snapshot_id}',
            params={'format': output_format},
            headers={'Authorization': f'Bearer {token}'},
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        return {
            'status': 'request_error',
            'source': 'brightdata',
            'snapshotId': snapshot_id,
            'error': str(exc),
        }

    try:
        data = response.json()
    except ValueError:
        data = {'rawText': response.text}

    if response.status_code >= 400:
        return {
            'status': 'http_error',
            'source': 'brightdata',
            'snapshotId': snapshot_id,
            'httpStatus': response.status_code,
            'response': data,
        }

    validation = _validation_summary(dataset_key, data)

    return {
        'status': 'success',
        'source': 'brightdata',
        'snapshotId': snapshot_id,
        'datasetKey': dataset_key,
        'records': data,
        'validation': validation,
    }


def _snapshot_progress_status(progress: Any) -> str:
    if isinstance(progress, dict):
        for key in ('status', 'state'):
            value = progress.get(key)
            if isinstance(value, str):
                return value.lower()
        for key in ('snapshot', 'data', 'result'):
            value = progress.get(key)
            nested = _snapshot_progress_status(value)
            if nested:
                return nested
    return ''


def _snapshot_is_ready(progress: Any) -> bool:
    if isinstance(progress, dict):
        for key in ('ready', 'is_ready', 'completed'):
            if progress.get(key) is True:
                return True
    status = _snapshot_progress_status(progress)
    return status in {'ready', 'completed', 'complete', 'done', 'success', 'finished'}


def resolve_snapshot_if_needed(
    result: dict[str, Any],
    *,
    dataset_key: str | None = None,
    max_wait_seconds: int = 90,
    poll_interval_seconds: int = 5,
    timeout_seconds: int = 120,
) -> dict[str, Any]:
    snapshot_id = result.get('snapshotId')
    if result.get('status') != 'snapshot_pending' or not snapshot_id:
        return result

    dataset_key = dataset_key or result.get('datasetKey')
    deadline = time.monotonic() + max_wait_seconds
    progress_checks: list[Any] = []

    while time.monotonic() < deadline:
        progress_result = get_snapshot_progress(snapshot_id, timeout_seconds=min(timeout_seconds, 30))
        progress_checks.append(progress_result.get('progress', progress_result))

        if progress_result.get('status') == 'success' and _snapshot_is_ready(progress_result.get('progress')):
            downloaded = download_snapshot(
                snapshot_id,
                dataset_key=dataset_key,
                timeout_seconds=timeout_seconds,
            )
            return {
                **result,
                **downloaded,
                'endpoint': result.get('endpoint'),
                'query': result.get('query'),
                'input': result.get('input'),
                'snapshotProgress': progress_checks,
            }

        time.sleep(poll_interval_seconds)

    return {
        **result,
        'status': 'snapshot_timeout',
        'snapshotProgress': progress_checks,
        'error': f'Bright Data snapshot was not ready after {max_wait_seconds} seconds.',
    }
