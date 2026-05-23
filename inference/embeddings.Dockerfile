FROM ghcr.io/ggerganov/llama.cpp:server
COPY models/multilingualMiniLML12v2.gguf /models/model.gguf
EXPOSE 8080
CMD ["-m", "/models/model.gguf", "--host", "0.0.0.0", "--port", "8080", \
     "--embeddings", "--parallel", "4", "--log-disable"]
