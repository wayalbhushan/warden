package proxy_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/proxy"
)

func TestProxyForwarding(t *testing.T) {
	// Create mock upstream backend
	mockBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Warden-Gateway") != "active" {
			t.Errorf("expected X-Warden-Gateway request header to be 'active', got %q", r.Header.Get("X-Warden-Gateway"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer mockBackend.Close()

	// Initialize proxy targeting mock backend
	p, err := proxy.New(mockBackend.URL)
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	// Record request through proxy
	req := httptest.NewRequest(http.MethodGet, "/test-path", nil)
	rec := httptest.NewRecorder()

	p.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	if rec.Header().Get("X-Warden-Gateway") != "active" {
		t.Errorf("expected X-Warden-Gateway response header to be 'active', got %q", rec.Header().Get("X-Warden-Gateway"))
	}
}

func TestProxyBadGateway(t *testing.T) {
	// Initialize proxy with invalid/unreachable target URL
	p, err := proxy.New("http://127.0.0.1:59999")
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/error-path", nil)
	rec := httptest.NewRecorder()

	p.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected status 502 Bad Gateway, got %d", rec.Code)
	}

	if rec.Header().Get("X-Warden-Gateway") != "active" {
		t.Errorf("expected X-Warden-Gateway header on error response, got %q", rec.Header().Get("X-Warden-Gateway"))
	}
}
