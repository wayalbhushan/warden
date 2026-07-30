package security_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/security"
)

func TestSignatureEngine(t *testing.T) {
	engine := security.NewSignatureEngine()

	tests := []struct {
		name         string
		targetURL    string
		expectMatch  bool
		expectThreat string
	}{
		{
			name:         "Clean Request Path & Query",
			targetURL:    "/api/users/123?q=search",
			expectMatch:  false,
			expectThreat: "",
		},
		{
			name:         "SQLi in Path",
			targetURL:    "/api/users/123';%20DROP%20TABLE%20users;--",
			expectMatch:  true,
			expectThreat: "SQLi",
		},
		{
			name:         "SQLi in Query Parameter",
			targetURL:    "/api/search?q='%20OR%20'1'='1",
			expectMatch:  true,
			expectThreat: "SQLi",
		},
		{
			name:         "NoSQLi in Query Parameter Key",
			targetURL:    "/api/login?user[$ne]=admin",
			expectMatch:  true,
			expectThreat: "NoSQLi",
		},
		{
			name:         "Command Injection in Query Parameter",
			targetURL:    "/api/ping?host=127.0.0.1;cat%20/etc/passwd",
			expectMatch:  true,
			expectThreat: "CommandInjection",
		},
		{
			name:         "Command Injection with Bash",
			targetURL:    "/api/exec?cmd=;/bin/bash",
			expectMatch:  true,
			expectThreat: "CommandInjection",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.targetURL, nil)

			matched, threat := engine.AnalyzeRequest(req)
			if matched != tc.expectMatch {
				t.Errorf("expected matched=%v, got %v for %s", tc.expectMatch, matched, tc.targetURL)
			}
			if threat != tc.expectThreat {
				t.Errorf("expected threatType=%q, got %q for %s", tc.expectThreat, threat, tc.targetURL)
			}
		})
	}
}
