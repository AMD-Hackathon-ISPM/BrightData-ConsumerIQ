from __future__ import annotations
import os
import re
from typing import Iterable
import httpx

_TRANSLATOR_URL = os.getenv(
    'TRANSLATOR_URL',
    'http://consumeriq-translator.consumeriq.svc.cluster.local:8080',
)

_cjkPattern = re.compile(r'[一-鿿]')


def _isCjk(text: str) -> bool:
    return bool(_cjkPattern.search(text))


def _translateText(text: str) -> str:
    prompt = (
        'Translate the following text to natural English. '
        'Return only the translation, no extra text.\n\n'
        f'Text: {text}\nTranslation:'
    )
    payload = {'prompt': prompt, 'max_tokens': 256, 'temperature': 0.2, 'stop': ['\n\n']}
    response = httpx.post(f'{_TRANSLATOR_URL}/v1/completions', json=payload, timeout=60)
    response.raise_for_status()
    return response.json()['choices'][0]['text'].strip()


_LLM_LOCAL_ENABLED = os.getenv('LLM_LOCAL_ENABLED', 'true').lower() == 'true'


def translateTextsIfNeeded(texts: Iterable[str]) -> list[str]:
    items = list(texts)
    if not _LLM_LOCAL_ENABLED:
        return items
    for i, text in enumerate(items):
        if _isCjk(text):
            try:
                items[i] = _translateText(text)
            except Exception as exc:
                print(f'[translator] skipped (call failed): {exc}')
    return items
