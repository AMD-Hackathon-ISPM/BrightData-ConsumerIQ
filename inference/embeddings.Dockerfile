FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn fastembed
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"
COPY inference/embeddings_server.py .
EXPOSE 8080
CMD ["python", "embeddings_server.py"]
