package auth

import (
	"context"
	"net/http"
	"strconv"
)

type contextKey string

const ctxKeyUserID contextKey = "user_id"

func UserIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("X-User-Id")
		if raw == "" {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		userID, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		ctx := context.WithValue(r.Context(), ctxKeyUserID, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserIDFromContext(ctx context.Context) int64 {
	id, _ := ctx.Value(ctxKeyUserID).(int64)
	return id
}
