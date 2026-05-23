FROM ghcr.io/ggerganov/llama.cpp:server
COPY models/Llama3.23B.gguf /models/model.gguf
EXPOSE 8080
CMD ["-m", "/models/model.gguf", "--host", "0.0.0.0", "--port", "8080", \
     "--ctx-size", "4096", "--n-predict", "512", "--parallel", "1", "--log-disable"]
