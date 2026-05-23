from __future__ import annotations
import os
from typing import Iterable
import httpx

_EMBEDDINGS_URL = os.getenv(
    'EMBEDDINGS_URL',
    'http://consumeriq-embeddings.consumeriq.svc.cluster.local:8080',
)


class _EmbeddingsClient:
    def __init__(self, base_url: str) -> None:
        self._url = base_url.rstrip('/')

    def create_embedding(self, text: str) -> dict:
        payload = {'input': text, 'model': 'embeddings'}
        response = httpx.post(f'{self._url}/v1/embeddings', json=payload, timeout=30)
        response.raise_for_status()
        return response.json()


def createEmbedder() -> _EmbeddingsClient:
    return _EmbeddingsClient(_EMBEDDINGS_URL)


def embedTexts(embedder: _EmbeddingsClient, texts: Iterable[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for text in texts:
        response = embedder.create_embedding(text)
        vectors.append(response['data'][0]['embedding'])
    return vectors
