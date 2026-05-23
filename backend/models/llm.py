from __future__ import annotations
import os
import httpx

_INFERENCE_URL = os.getenv(
    'INFERENCE_URL',
    'http://consumeriq-inference.consumeriq.svc.cluster.local:8080',
)


class _LlmClient:
    def __init__(self, base_url: str) -> None:
        self._url = base_url.rstrip('/')

    def create_completion(
        self,
        *,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.2,
        stop: list[str] | None = None,
    ) -> dict:
        payload = {
            'prompt': prompt,
            'max_tokens': max_tokens,
            'temperature': temperature,
            'stop': stop or [],
        }
        response = httpx.post(f'{self._url}/v1/completions', json=payload, timeout=120)
        response.raise_for_status()
        return response.json()


def createLlm() -> _LlmClient:
    return _LlmClient(_INFERENCE_URL)
