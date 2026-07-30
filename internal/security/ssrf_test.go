package security_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bhushanwayal/warden/internal/security"
)

func TestSSRPEngine(t *testing.T) {
	engine := security.NewSSRPEngine()

	tests := []struct {
		name         string
		targetURL    string
		expectMatch  bool
		expectThreat string
	}{
		{
			name:         "Clean External Webhook",
			targetURL:    "/api/webhook?url=https://google.com",
			expectMatch:  false,
			expectThreat: "",
		},
		{
			name:         "Not a URL Parameter",
			targetURL:    "/api/user?name=bhushan",
			expectMatch:  false,
			expectThreat: "",
		},
		{
			name:         "Cloud Metadata IP",
			targetURL:    "/api/fetch?target=http://169.254.169.254/latest/meta-data/",
			expectMatch:  true,
			expectThreat: "SSRF",
		},
		{
			name:         "Localhost Hostname",
			targetURL:    "/api/preview?webhook=http://localhost:8080/admin",
			expectMatch:  true,
			expectThreat: "SSRF",
		},
		{
			name:         "Private IP Subnet (10.x)",
			targetURL:    "/api/proxy?url=http://10.0.0.5/internal-api",
			expectMatch:  true,
			expectThreat: "SSRF",
		},
		{
			name:         "Loopback IP Direct",
			targetURL:    "/api/proxy?url=http://127.0.0.1:9000/metrics",
			expectMatch:  true,
			expectThreat: "SSRF",
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
