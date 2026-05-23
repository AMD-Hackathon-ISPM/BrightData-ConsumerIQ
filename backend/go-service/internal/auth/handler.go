package auth

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	rdb  *redis.Client
	pool *pgxpool.Pool
}

func NewHandler(rdb *redis.Client, pool *pgxpool.Pool) *Handler {
	return &Handler{rdb: rdb, pool: pool}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" || body.Password == "" {
		writeErr(w, http.StatusBadRequest, "email and password required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bcrypt: %v", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	var userID int64
	err = h.pool.QueryRow(r.Context(),
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
		body.Email, string(hash),
	).Scan(&userID)
	if err != nil {
		writeErr(w, http.StatusConflict, "email already registered")
		return
	}

	token, err := CreateSession(r.Context(), h.rdb, SessionData{UserID: userID, Email: body.Email})
	if err != nil {
		log.Printf("create session: %v", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "user_id": userID})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	var userID int64
	var hash string
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, password_hash FROM users WHERE email = $1`,
		body.Email,
	).Scan(&userID, &hash)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := CreateSession(r.Context(), h.rdb, SessionData{UserID: userID, Email: body.Email})
	if err != nil {
		log.Printf("create session: %v", err)
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user_id": userID})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	if token == "" {
		writeErr(w, http.StatusBadRequest, "no token provided")
		return
	}
	if err := DeleteSession(r.Context(), h.rdb, token); err != nil {
		log.Printf("delete session: %v", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Validate(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	if token == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	data, err := ValidateSession(r.Context(), h.rdb, token)
	if err != nil {
		log.Printf("validate session: %v", err)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	if data == nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	w.Header().Set("X-User-Id", fmt.Sprintf("%d", data.UserID))
	w.Header().Set("X-User-Email", data.Email)
	w.WriteHeader(http.StatusOK)
}

func extractToken(r *http.Request) string {
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	if c, err := r.Cookie("session"); err == nil {
		return c.Value
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
