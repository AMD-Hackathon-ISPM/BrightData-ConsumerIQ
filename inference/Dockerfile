FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential cmake \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir --prefix=/install "llama-cpp-python[server]"

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libstdc++6 libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY models/Llama3.23B.gguf /models/model.gguf
EXPOSE 8080
CMD ["python", "-m", "llama_cpp.server", \
     "--model", "/models/model.gguf", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "--n_ctx", "4096"]
