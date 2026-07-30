package security_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/security"
)

func TestSecurityMiddleware(t *testing.T) {
	sigEngine := security.NewSignatureEngine()
	ssrfEngine := security.NewSSRPEngine()

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	secMw := security.NewSecurityMiddleware(sigEngine, ssrfEngine, nil)
	handler := secMw(dummyHandler)

	// Case 1: Clean Request -> 200 OK
	t.Run("Clean Request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rec.Code)
		}
	})

	// Case 2: SQLi Attack -> 403 Forbidden
	t.Run("SQLi Detection", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users?q='%20OR%20'1'='1", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", rec.Code)
		}
	})

	// Case 3: SSRF Attack -> 403 Forbidden
	t.Run("SSRF Detection", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/webhook?url=http://169.254.169.254/latest", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", rec.Code)
		}
	})
}
