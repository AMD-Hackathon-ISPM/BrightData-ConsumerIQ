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

type FormReceivedPayload struct {
	FormID   string   `json:"form_id"`
	UserID   int64    `json:"user_id"`
	Category string   `json:"category"`
	Keywords []string `json:"keywords"`
}

func HandleFormReceived(ctx context.Context, t *asynq.Task) error {
	var p FormReceivedPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal FormReceivedPayload: %w", err)
	}

	log.Printf("[background] form_received form_id=%s user_id=%d category=%s keywords=%v",
		p.FormID, p.UserID, p.Category, p.Keywords)

	if err := triggerScrape(ctx, p.Category, p.Keywords); err != nil {
		log.Printf("[background] scrape trigger failed: %v", err)
	}

	if err := triggerInference(ctx, p.Category); err != nil {
		log.Printf("[background] inference trigger failed: %v", err)
	}

	return nil
}

func triggerScrape(ctx context.Context, category string, keywords []string) error {
	body, err := json.Marshal(map[string]any{"category": category, "keywords": keywords})
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
	log.Printf("[background] scrape queued category=%s", category)
	return nil
}

func triggerInference(ctx context.Context, category string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		pythonAPIBase+"/api/scan-market/"+category, http.NoBody)
	if err != nil {
		return err
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("inference endpoint returned %d", resp.StatusCode)
	}
	log.Printf("[background] inference queued category=%s", category)
	return nil
}
