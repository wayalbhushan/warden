package scanner_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/scanner"
)

func TestTestMissingAuth(t *testing.T) {
	// Dummy backend server returning 200 OK for /secure and 401 Unauthorized for /protected
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/secure/123":
			w.WriteHeader(http.StatusOK)
		case "/protected":
			w.WriteHeader(http.StatusUnauthorized)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	endpoints := []scanner.Endpoint{
		{
			Method:       "GET",
			Path:         "/secure/{id}",
			RequiresAuth: true,
		},
		{
			Method:       "GET",
			Path:         "/protected",
			RequiresAuth: true,
		},
		{
			Method:       "GET",
			Path:         "/public",
			RequiresAuth: false,
		},
	}

	findings := scanner.TestMissingAuth(endpoints, ts.URL)

	if len(findings) != 1 {
		t.Fatalf("expected 1 finding, got %d", len(findings))
	}

	finding := findings[0]
	if finding.Type != "Missing Authentication" || finding.Severity != "High" {
		t.Errorf("expected Type='Missing Authentication', Severity='High'; got %q, %q", finding.Type, finding.Severity)
	}
	if finding.Endpoint.Path != "/secure/{id}" {
		t.Errorf("expected endpoint path '/secure/{id}', got %q", finding.Endpoint.Path)
	}
}
