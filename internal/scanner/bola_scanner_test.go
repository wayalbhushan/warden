package scanner_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/scanner"
)

func TestTestBOLA(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "Bearer tokenB" && r.URL.Path == "/documents/999" {
			// Simulating backend vulnerable to BOLA (User B successfully accessing User A's resource 999)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"document_id":"999","owner":"userA"}`))
			return
		}
		w.WriteHeader(http.StatusForbidden)
	}))
	defer ts.Close()

	endpoints := []scanner.Endpoint{
		{
			Method:       "GET",
			Path:         "/documents/{id}",
			RequiresAuth: true,
		},
		{
			Method:       "GET",
			Path:         "/public",
			RequiresAuth: false,
		},
	}

	cfg := scanner.ScanConfig{
		UserAToken:  "tokenA",
		UserBToken:  "tokenB",
		ResourceIDA: "999",
	}

	findings := scanner.TestBOLA(endpoints, ts.URL, cfg)

	if len(findings) != 1 {
		t.Fatalf("expected 1 BOLA finding, got %d", len(findings))
	}

	finding := findings[0]
	if finding.Type != "BOLA/IDOR Vulnerability" || finding.Severity != "Critical" {
		t.Errorf("expected Type='BOLA/IDOR Vulnerability', Severity='Critical'; got %q, %q", finding.Type, finding.Severity)
	}
	if finding.Endpoint.Path != "/documents/{id}" {
		t.Errorf("expected endpoint path '/documents/{id}', got %q", finding.Endpoint.Path)
	}
}
