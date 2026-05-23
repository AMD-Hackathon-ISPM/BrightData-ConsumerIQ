FROM ghcr.io/ggerganov/llama.cpp:server
COPY models/Qwen3.50.8B.gguf /models/model.gguf
EXPOSE 8080
CMD ["-m", "/models/model.gguf", "--host", "0.0.0.0", "--port", "8080", \
     "--ctx-size", "2048", "--n-predict", "256", "--parallel", "2", "--log-disable"]
