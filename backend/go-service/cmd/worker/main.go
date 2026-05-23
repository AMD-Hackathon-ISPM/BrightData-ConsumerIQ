package main

import (
	"log"
	"os"

	"github.com/hibiken/asynq"

	"github.com/consumeriq/goservice/internal/worker"
)

func main() {
	redisAddr := mustEnv("REDIS_ADDR")

	worker.Init(redisAddr)

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Queues: map[string]int{
				worker.QueueBackground: 10,
			},
			Concurrency: 20,
		},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc(worker.TaskFormReceived, worker.HandleFormReceived)

	log.Printf("go-worker listening on redis=%s queue=%s", redisAddr, worker.QueueBackground)
	if err := srv.Run(mux); err != nil {
		log.Fatalf("asynq server: %v", err)
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}
