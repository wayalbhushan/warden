package scanner_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/scanner"
)

func TestTestRateLimit(t *testing.T) {
	// Server without rate limiting (returns 200 for all 50 requests)
	unlimitedServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer unlimitedServer.Close()

	endpoints := []scanner.Endpoint{
		{
			Method:       "GET",
			Path:         "/api/data/{id}",
			RequiresAuth: true,
		},
	}

	findings := scanner.TestRateLimit(endpoints, unlimitedServer.URL)
	if len(findings) != 1 {
		t.Fatalf("expected 1 finding for unlimited server, got %d", len(findings))
	}

	finding := findings[0]
	if finding.Type != "Missing Rate Limiting" || finding.Severity != "Medium" {
		t.Errorf("expected Type='Missing Rate Limiting', Severity='Medium'; got %q, %q", finding.Type, finding.Severity)
	}

	// Server with rate limiting (returns 429 for requests)
	rateLimitedServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer rateLimitedServer.Close()

	findingsLimited := scanner.TestRateLimit(endpoints, rateLimitedServer.URL)
	if len(findingsLimited) != 0 {
		t.Fatalf("expected 0 findings for rate limited server, got %d", len(findingsLimited))
	}
}
