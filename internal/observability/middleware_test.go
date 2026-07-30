package observability_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"github.com/bhushanwayal/warden/internal/observability"
)

func TestMetricsMiddleware(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	mw := observability.MetricsMiddleware(dummyHandler)

	req := httptest.NewRequest(http.MethodGet, "/test-metrics", nil)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200 OK, got %d", rec.Code)
	}

	// Fetch /metrics to verify counter and histogram updates
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.DefaultServeMux.ServeHTTP(w, r)
	}))
	_ = ts

	resp, err := http.Get("http://localhost:9099/metrics")
	if err != nil {
		t.Fatalf("failed to fetch metrics: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read metrics body: %v", err)
	}

	bodyStr := string(body)
	if !strings.Contains(bodyStr, `warden_requests_total{method="GET",status="200"}`) {
		t.Errorf("expected warden_requests_total with method=GET, status=200 in metrics output")
	}
	if !strings.Contains(bodyStr, `warden_request_duration_seconds_bucket{method="GET"`) {
		t.Errorf("expected warden_request_duration_seconds_bucket with method=GET in metrics output")
	}
}
