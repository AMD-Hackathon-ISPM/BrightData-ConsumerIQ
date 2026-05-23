package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	sessionPrefix = "session:"
	sessionTTL    = 24 * time.Hour
	tokenBytes    = 32
)

type SessionData struct {
	UserID    int64     `json:"user_id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

func generateToken() (string, error) {
	b := make([]byte, tokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func CreateSession(ctx context.Context, rdb *redis.Client, data SessionData) (string, error) {
	token, err := generateToken()
	if err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	data.CreatedAt = time.Now()

	payload, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("marshal session: %w", err)
	}

	if err := rdb.Set(ctx, sessionPrefix+token, payload, sessionTTL).Err(); err != nil {
		return "", fmt.Errorf("redis set: %w", err)
	}
	return token, nil
}

func ValidateSession(ctx context.Context, rdb *redis.Client, token string) (*SessionData, error) {
	raw, err := rdb.Get(ctx, sessionPrefix+token).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("redis get: %w", err)
	}

	var data SessionData
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}

	rdb.Expire(ctx, sessionPrefix+token, sessionTTL)
	return &data, nil
}

func DeleteSession(ctx context.Context, rdb *redis.Client, token string) error {
	return rdb.Del(ctx, sessionPrefix+token).Err()
}
