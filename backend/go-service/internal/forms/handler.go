package forms

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/consumeriq/goservice/internal/auth"
	"github.com/consumeriq/goservice/internal/worker"
)

type FounderFormPayload struct {
	FullName             string   `json:"fullName"`
	WorkEmail            string   `json:"workEmail"`
	Password             string   `json:"password"`
	WorkspaceName        string   `json:"workspaceName"`
	Industry             string   `json:"industry"`
	Region               string   `json:"region"`
	Marketplace          string   `json:"marketplace"`
	Competitors          []string `json:"competitors"`
	SearchIntentKeywords []string `json:"searchIntentKeywords"`
	CustomerSegment      string   `json:"customerSegment"`
	PainPoint            string   `json:"painPoint"`
	PriceRangeMin        int      `json:"priceRangeMin"`
	PriceRangeMax        int      `json:"priceRangeMax"`
}

type Handler struct {
	pool      *pgxpool.Pool
	rdb       *redis.Client
	taskQueue *asynq.Client
}

func NewHandler(pool *pgxpool.Pool, rdb *redis.Client, taskQueue *asynq.Client) *Handler {
	return &Handler{pool: pool, rdb: rdb, taskQueue: taskQueue}
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	var p FounderFormPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if p.WorkEmail == "" || p.Password == "" {
		writeErr(w, http.StatusBadRequest, "workEmail and password are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bcrypt: %v", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	p.Password = ""
	payloadJSON, err := json.Marshal(p)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	var userID int64
	err = h.pool.QueryRow(r.Context(),
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
		p.WorkEmail, string(hash),
	).Scan(&userID)
	if err != nil {
		writeErr(w, http.StatusConflict, "email already registered")
		return
	}

	var formID string
	err = h.pool.QueryRow(r.Context(),
		`INSERT INTO founderForms (id, user_id, status, createdAt, payload)
		 VALUES (gen_random_uuid()::text, $1, 'received', $2, $3::jsonb)
		 RETURNING id`,
		userID, time.Now().UTC(), string(payloadJSON),
	).Scan(&formID)
	if err != nil {
		log.Printf("insert founderForms: %v", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	token, err := auth.CreateSession(r.Context(), h.rdb, auth.SessionData{
		UserID: userID,
		Email:  p.WorkEmail,
	})
	if err != nil {
		log.Printf("create session: %v", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Enqueue background orchestration: Go worker will trigger the Python
	// scraping queue, then the inference queue, using the form's keywords.
	h.enqueueFormReceived(formID, userID, p.Industry, p.SearchIntentKeywords)

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":      formID,
		"status":  "received",
		"token":   token,
		"user_id": userID,
	})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	formID := r.PathValue("id")

	var status string
	var createdAt time.Time
	var payloadRaw json.RawMessage
	err := h.pool.QueryRow(r.Context(),
		`SELECT status, createdAt, payload
		 FROM founderForms
		 WHERE id = $1 AND user_id = $2`,
		formID, userID,
	).Scan(&status, &createdAt, &payloadRaw)
	if err != nil {
		writeErr(w, http.StatusNotFound, "form not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":        formID,
		"status":    status,
		"createdAt": createdAt.Format(time.RFC3339),
		"payload":   payloadRaw,
	})
}

func (h *Handler) enqueueFormReceived(formID string, userID int64, category string, keywords []string) {
	payload, err := json.Marshal(worker.FormReceivedPayload{
		FormID:   formID,
		UserID:   userID,
		Category: category,
		Keywords: keywords,
	})
	if err != nil {
		log.Printf("enqueueFormReceived marshal: %v", err)
		return
	}
	task := asynq.NewTask(worker.TaskFormReceived, payload)
	if _, err := h.taskQueue.Enqueue(task, asynq.Queue(worker.QueueBackground)); err != nil {
		log.Printf("enqueueFormReceived: %v", err)
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
