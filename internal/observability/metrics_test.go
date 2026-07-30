package observability_test

import (
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/observability"
)

func TestMetricsServer(t *testing.T) {
	// Initialize sample metric vectors so Prometheus exports their metric lines
	observability.RequestsTotal.WithLabelValues("GET", "200").Inc()
	observability.RequestDuration.WithLabelValues("GET").Observe(0.05)
	observability.SecurityBlocksTotal.WithLabelValues("SQLi").Inc()
	observability.RateLimitDropsTotal.Inc()

	observability.StartMetricsServer(":9099")

	time.Sleep(100 * time.Millisecond)

	resp, err := http.Get("http://localhost:9099/metrics")
	if err != nil {
		t.Fatalf("failed to fetch /metrics endpoint: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 OK from /metrics, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read /metrics body: %v", err)
	}

	bodyStr := string(body)

	expectedMetrics := []string{
		"warden_requests_total",
		"warden_request_duration_seconds",
		"warden_security_blocks_total",
		"warden_rate_limit_drops_total",
	}

	for _, metric := range expectedMetrics {
		if !strings.Contains(bodyStr, metric) {
			t.Errorf("expected metric %q in /metrics output", metric)
		}
	}
}
