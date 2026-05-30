package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/consumeriq/goservice/internal/auth"
	"github.com/consumeriq/goservice/internal/forms"
)

func main() {
	ctx := context.Background()

	rdb := redis.NewClient(&redis.Options{
		Addr: mustEnv("REDIS_ADDR"),
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}

	pool, err := pgxpool.New(ctx, mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("pgxpool: %v", err)
	}
	defer pool.Close()

	taskQueue := asynq.NewClient(asynq.RedisClientOpt{Addr: mustEnv("REDIS_ADDR")})
	defer taskQueue.Close()

	authH := auth.NewHandler(rdb, pool)
	formsH := forms.NewHandler(pool, rdb, taskQueue)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /auth/register", authH.Register)
	mux.HandleFunc("POST /auth/login", authH.Login)
	mux.HandleFunc("POST /auth/logout", authH.Logout)
	mux.HandleFunc("GET /auth/session", authH.Session)

	mux.HandleFunc("POST /go-api/founder-form/submit", formsH.Submit)

	mux.HandleFunc("GET /internal/auth/validate", authH.Validate)

	protected := http.NewServeMux()
	protected.HandleFunc("GET /go-api/founder-form/{id}", formsH.Get)

	mux.Handle("/go-api/founder-form/{id}", auth.UserIDMiddleware(protected))

	addr := ":" + getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("go-service listening on %s", addr)
	log.Fatal(srv.ListenAndServe())
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
