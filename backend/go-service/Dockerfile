FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /go-service ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /go-worker  ./cmd/worker

# Single image ships both binaries.
# K8s selects which one to run via the `command` field in the deployment.
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /go-service /go-service
COPY --from=builder /go-worker  /go-worker
EXPOSE 8080
ENTRYPOINT ["/go-service"]
