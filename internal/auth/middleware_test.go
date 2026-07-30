package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/auth"
	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddleware(t *testing.T) {
	secret := "middleware-test-secret"
	validator := auth.NewJWTValidator(secret)

	// Dummy downstream handler asserting injected context claims
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.GetClaims(r.Context())
		if !ok || claims == nil {
			t.Error("expected claims to be present in request context")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		if claims["sub"] != "user-456" {
			t.Errorf("expected claim sub 'user-456', got %v", claims["sub"])
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	authMw := auth.NewAuthMiddleware(validator)
	protected := authMw(dummyHandler)

	// Case 1: Missing Authorization Header -> 401
	t.Run("Missing Authorization Header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		rec := httptest.NewRecorder()

		protected.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rec.Code)
		}
	})

	// Case 2: Malformed Header (Basic instead of Bearer) -> 401
	t.Run("Malformed Authorization Header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")
		rec := httptest.NewRecorder()

		protected.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rec.Code)
		}
	})

	// Case 3: Invalid / Forged Bearer Token -> 401
	t.Run("Forged Bearer Token", func(t *testing.T) {
		claims := jwt.MapClaims{
			"sub": "user-456",
			"exp": time.Now().Add(1 * time.Hour).Unix(),
		}
		forgedToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		forgedStr, _ := forgedToken.SignedString([]byte("wrong-secret"))

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+forgedStr)
		rec := httptest.NewRecorder()

		protected.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rec.Code)
		}
	})

	// Case 4: Valid Bearer Token -> 200 OK
	t.Run("Valid Bearer Token", func(t *testing.T) {
		claims := jwt.MapClaims{
			"sub": "user-456",
			"exp": time.Now().Add(1 * time.Hour).Unix(),
		}
		validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		validStr, _ := validToken.SignedString([]byte(secret))

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+validStr)
		rec := httptest.NewRecorder()

		protected.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rec.Code)
		}
	})
}
