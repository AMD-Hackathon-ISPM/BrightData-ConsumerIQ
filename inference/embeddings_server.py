from __future__ import annotations
import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastembed import TextEmbedding
import uvicorn

_MODEL_NAME = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
_model = TextEmbedding(_MODEL_NAME)

app = FastAPI()


class EmbeddingsRequest(BaseModel):
    input: str | list[str]
    model: str = 'embeddings'


@app.post('/v1/embeddings')
def create_embeddings(request: EmbeddingsRequest):
    texts = request.input if isinstance(request.input, list) else [request.input]
    vectors = list(_model.embed(texts))
    return {
        'object': 'list',
        'data': [{'object': 'embedding', 'index': i, 'embedding': v.tolist()} for i, v in enumerate(vectors)],
        'model': _MODEL_NAME,
    }


@app.get('/health')
def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8080)
