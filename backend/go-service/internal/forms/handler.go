package forms

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgconn"
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
	Country              string   `json:"country"`
	CountryCode          string   `json:"countryCode"`
	Marketplace          string   `json:"marketplace"`
	Competitors          []string `json:"competitors"`
	SearchIntentKeywords []string `json:"searchIntentKeywords"`
	CustomerSegment      string   `json:"customerSegment"`
	PainPoint            string   `json:"painPoint"`
	PriceRangeMin        int      `json:"priceRangeMin"`
	PriceRangeMax        int      `json:"priceRangeMax"`
	TargetMarketDetail   string   `json:"targetMarketDetail"`
	ProductName          string   `json:"productName"`
	ProductDescription   string   `json:"productDescription"`
	UniqueSellingPoint   string   `json:"uniqueSellingPoint"`
	MainFeatures         string   `json:"mainFeatures"`
	CompetitiveAdvantage string   `json:"competitiveAdvantage"`
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
	if p.WorkEmail == "" {
		writeErr(w, http.StatusBadRequest, "workEmail is required")
		return
	}

	var userID int64

	if bearer := r.Header.Get("Authorization"); strings.HasPrefix(bearer, "Bearer ") {
		token := strings.TrimPrefix(bearer, "Bearer ")
		if session, err := auth.ValidateSession(r.Context(), h.rdb, token); err == nil && session != nil {
			userID = session.UserID
		}
	}

	if userID == 0 {
		if p.Password == "" {
			writeErr(w, http.StatusBadRequest, "password is required")
			return
		}
		plainPassword := p.Password
		hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("bcrypt: %v", err)
			writeErr(w, http.StatusInternalServerError, "internal error")
			return
		}
		err = h.pool.QueryRow(r.Context(),
			`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
			p.WorkEmail, string(hash),
		).Scan(&userID)
		if err != nil {
			var pgErr *pgconn.PgError
			if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
				log.Printf("insert user: %v", err)
				writeErr(w, http.StatusInternalServerError, "internal error")
				return
			}
			var existingHash string
			if qErr := h.pool.QueryRow(r.Context(),
				`SELECT id, password_hash FROM users WHERE email = $1`,
				p.WorkEmail,
			).Scan(&userID, &existingHash); qErr != nil {
				log.Printf("select user: %v", qErr)
				writeErr(w, http.StatusInternalServerError, "internal error")
				return
			}
			if bcrypt.CompareHashAndPassword([]byte(existingHash), []byte(plainPassword)) != nil {
				writeErr(w, http.StatusUnauthorized, "email already registered with a different password")
				return
			}
		}
	}

	p.Password = ""
	payloadJSON, err := json.Marshal(p)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
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

	h.enqueueFormReceived(formID, userID, p.Industry, p.Country, p.CountryCode, p.Marketplace, p.SearchIntentKeywords)

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

func (h *Handler) enqueueFormReceived(formID string, userID int64, category, country, countryCode, marketplace string, keywords []string) {
	payload, err := json.Marshal(worker.FormReceivedPayload{
		FormID:      formID,
		UserID:      userID,
		Category:    category,
		Country:     country,
		CountryCode: countryCode,
		Marketplace: marketplace,
		Keywords:    keywords,
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
