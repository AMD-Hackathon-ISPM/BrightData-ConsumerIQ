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
	CountryCode string   `json:"country_code"`
	Marketplace string   `json:"marketplace"`
}

func HandleFormReceived(ctx context.Context, t *asynq.Task) error {
	var p FormReceivedPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal FormReceivedPayload: %w", err)
	}

	log.Printf("[background] form_received form_id=%s user_id=%d category=%s country=%s keywords=%v",
		p.FormID, p.UserID, p.Category, p.CountryCode, p.Keywords)

	scrapeTaskID, err := triggerScrape(ctx, p.Category, p.Keywords, p.CountryCode, p.Marketplace)
	if err != nil {
		log.Printf("[background] scrape trigger failed: %v", err)
	}

	inferenceTaskID, err := triggerInference(ctx, p.Category, p.CountryCode)
	if err != nil {
		log.Printf("[background] inference trigger failed: %v", err)
	}

	if rdb != nil && (scrapeTaskID != "" || inferenceTaskID != "") {
		pipeline, _ := json.Marshal(map[string]string{
			"scrape_task_id":    scrapeTaskID,
			"inference_task_id": inferenceTaskID,
		})
		rdb.Set(ctx, "form_pipeline:"+p.FormID, string(pipeline), time.Hour)
	}

	return nil
}

func triggerScrape(ctx context.Context, category string, keywords []string, country string, marketplace string) (string, error) {
	body, err := json.Marshal(map[string]any{
		"category":    category,
		"keywords":    keywords,
		"country":     country,
		"marketplace": marketplace,
	})
	if err != nil {
		return "", fmt.Errorf("marshal scrape body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		pythonAPIBase+"/api/scrape-market-signals", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("scrape endpoint returned %d", resp.StatusCode)
	}
	var result struct {
		TaskId string `json:"taskId"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	log.Printf("[background] scrape queued category=%s country=%s task_id=%s", category, country, result.TaskId)
	return result.TaskId, nil
}

func triggerInference(ctx context.Context, category string, country string) (string, error) {
	if rdb != nil {
		depth, err := rdb.LLen(ctx, "inference").Result()
		if err == nil && depth >= inferenceQueueLimit {
			log.Printf("[background] inference queue at limit (%d), skipping category=%s", depth, category)
			return "", nil
		}
	}

	body, err := json.Marshal(map[string]any{"category": category, "country": country})
	if err != nil {
		return "", fmt.Errorf("marshal inference body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		pythonAPIBase+"/api/scan-market", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("inference endpoint returned %d", resp.StatusCode)
	}
	var result struct {
		TaskId string `json:"taskId"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	log.Printf("[background] inference queued category=%s country=%s task_id=%s", category, country, result.TaskId)
	return result.TaskId, nil
}
