package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	goredis "github.com/redis/go-redis/v9"
)

var pythonAPIBase = strings.TrimRight(
	func() string {
		if v := os.Getenv("PYTHON_API_URL"); v != "" {
			return v
		}
		return "http://consumeriq-api.consumeriq.svc.cluster.local:8000"
	}(),
	"/",
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

const inferenceQueueLimit = 10

var rdb *goredis.Client

func Init(redisAddr string) {
	rdb = goredis.NewClient(&goredis.Options{Addr: redisAddr})
}

type FormReceivedPayload struct {
	FormID      string   `json:"form_id"`
	UserID      int64    `json:"user_id"`
	Category    string   `json:"category"`
	Keywords    []string `json:"keywords"`
	Country     string   `json:"country"`
	Marketplace string   `json:"marketplace"`
}

func HandleFormReceived(ctx context.Context, t *asynq.Task) error {
	var p FormReceivedPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal FormReceivedPayload: %w", err)
	}

	log.Printf("[background] form_received form_id=%s user_id=%d category=%s country=%s keywords=%v",
		p.FormID, p.UserID, p.Category, p.Country, p.Keywords)

	if err := triggerScrape(ctx, p.Category, p.Keywords, p.Country, p.Marketplace); err != nil {
		log.Printf("[background] scrape trigger failed: %v", err)
	}

	if err := triggerInference(ctx, p.Category, p.Country); err != nil {
		log.Printf("[background] inference trigger failed: %v", err)
	}

	return nil
}

func triggerScrape(ctx context.Context, category string, keywords []string, country string, marketplace string) error {
	body, err := json.Marshal(map[string]any{
		"category":    category,
		"keywords":    keywords,
		"country":     country,
		"marketplace": marketplace,
	})
	if err != nil {
		return fmt.Errorf("marshal scrape body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		pythonAPIBase+"/api/scrape-market-signals", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("scrape endpoint returned %d", resp.StatusCode)
	}
	log.Printf("[background] scrape queued category=%s country=%s", category, country)
	return nil
}

func triggerInference(ctx context.Context, category string, country string) error {
	if rdb != nil {
		depth, err := rdb.LLen(ctx, "inference").Result()
		if err == nil && depth >= inferenceQueueLimit {
			log.Printf("[background] inference queue at limit (%d), skipping category=%s", depth, category)
			return nil
		}
	}

	body, err := json.Marshal(map[string]any{"category": category, "country": country})
	if err != nil {
		return fmt.Errorf("marshal inference body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		pythonAPIBase+"/api/scan-market", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("inference endpoint returned %d", resp.StatusCode)
	}
	log.Printf("[background] inference queued category=%s country=%s", category, country)
	return nil
}
