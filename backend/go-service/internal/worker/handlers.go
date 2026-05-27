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


var rdb *goredis.Client

func Init(redisAddr string) {
	rdb = goredis.NewClient(&goredis.Options{Addr: redisAddr})
}

type FormReceivedPayload struct {
	FormID               string   `json:"form_id"`
	UserID               int64    `json:"user_id"`
	Category             string   `json:"category"`
	Keywords             []string `json:"keywords"`
	Country              string   `json:"country"`
	CountryCode          string   `json:"country_code"`
	Marketplace          string   `json:"marketplace"`
	ProductName          string   `json:"product_name"`
	ProductDescription   string   `json:"product_description"`
	UniqueSellingPoint   string   `json:"unique_selling_point"`
	MainFeatures         string   `json:"main_features"`
	CompetitiveAdvantage string   `json:"competitive_advantage"`
	PainPoint            string   `json:"pain_point"`
	CustomerSegment      string   `json:"customer_segment"`
	PriceRangeMin        int      `json:"price_range_min"`
	PriceRangeMax        int      `json:"price_range_max"`
}

func HandleFormReceived(ctx context.Context, t *asynq.Task) error {
	var p FormReceivedPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal FormReceivedPayload: %w", err)
	}

	log.Printf("[background] form_received form_id=%s user_id=%d category=%s country=%s keywords=%v",
		p.FormID, p.UserID, p.Category, p.CountryCode, p.Keywords)

	// Store pipeline key before triggering scrape so the frontend can poll immediately.
	// inference_task_id starts empty; the scraping task updates it after signals are stored.
	if rdb != nil {
		initial, _ := json.Marshal(map[string]string{
			"scrape_task_id":    "",
			"inference_task_id": "",
		})
		rdb.Set(ctx, "form_pipeline:"+p.FormID, string(initial), time.Hour)
	}

	scrapeTaskID, err := triggerScrape(ctx, p)
	if err != nil {
		log.Printf("[background] scrape trigger failed: %v", err)
	}

	if rdb != nil && scrapeTaskID != "" {
		updated, _ := json.Marshal(map[string]string{
			"scrape_task_id":    scrapeTaskID,
			"inference_task_id": "",
		})
		rdb.Set(ctx, "form_pipeline:"+p.FormID, string(updated), time.Hour)
	}

	return nil
}

func triggerScrape(ctx context.Context, p FormReceivedPayload) (string, error) {
	body, err := json.Marshal(map[string]any{
		"form_id":               p.FormID,
		"category":              p.Category,
		"keywords":              p.Keywords,
		"country":               p.CountryCode,
		"marketplace":           p.Marketplace,
		"product_name":          p.ProductName,
		"product_description":   p.ProductDescription,
		"unique_selling_point":  p.UniqueSellingPoint,
		"main_features":         p.MainFeatures,
		"competitive_advantage": p.CompetitiveAdvantage,
		"pain_point":            p.PainPoint,
		"customer_segment":      p.CustomerSegment,
		"price_range_min":       p.PriceRangeMin,
		"price_range_max":       p.PriceRangeMax,
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
	log.Printf("[background] scrape queued category=%s country=%s task_id=%s", p.Category, p.CountryCode, result.TaskId)
	return result.TaskId, nil
}

