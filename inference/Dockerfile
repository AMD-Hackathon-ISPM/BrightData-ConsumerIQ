FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3.11 libstdc++6 libgomp1 curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11
RUN python3.11 -m pip install --no-cache-dir "llama-cpp-python[server]" \
    --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
COPY models/Llama3.23B.gguf /models/model.gguf
EXPOSE 8080
CMD ["python3.11", "-m", "llama_cpp.server", \
     "--model", "/models/model.gguf", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "--n_ctx", "4096", \
     "--n_gpu_layers", "-1"]
