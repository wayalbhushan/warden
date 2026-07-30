package scanner

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// TestBOLA tests endpoints for Broken Object Level Authorization (BOLA/IDOR) cross-user access vulnerabilities.
func TestBOLA(endpoints []Endpoint, targetURL string, cfg ScanConfig) []Finding {
	var findings []Finding

	if cfg.UserBToken == "" || cfg.ResourceIDA == "" {
		slog.Info("Skipping BOLA active scan: user_b_token or resource_id_a omitted from scan config")
		return findings
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	targetURL = strings.TrimSuffix(targetURL, "/")

	for _, ep := range endpoints {
		if !ep.RequiresAuth || !pathParamRegex.MatchString(ep.Path) {
			continue
		}

		resolvedPath := pathParamRegex.ReplaceAllString(ep.Path, cfg.ResourceIDA)
		if !strings.HasPrefix(resolvedPath, "/") {
			resolvedPath = "/" + resolvedPath
		}
		fullURL := targetURL + resolvedPath

		req, err := http.NewRequest(ep.Method, fullURL, nil)
		if err != nil {
			slog.Error("failed to create BOLA scanner HTTP request",
				slog.String("method", ep.Method),
				slog.String("url", fullURL),
				slog.String("error", err.Error()),
			)
			continue
		}

		// Inject User B's token to attempt cross-account resource access
		req.Header.Set("Authorization", "Bearer "+cfg.UserBToken)

		resp, err := client.Do(req)
		if err != nil {
			slog.Warn("BOLA scanner HTTP request failed",
				slog.String("method", ep.Method),
				slog.String("url", fullURL),
				slog.String("error", err.Error()),
			)
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			findings = append(findings, Finding{
				Endpoint: ep,
				Type:     "BOLA/IDOR Vulnerability",
				Severity: "Critical",
				Details:  fmt.Sprintf("User B successfully accessed User A's resource (%s) without authorization (HTTP %d)", cfg.ResourceIDA, resp.StatusCode),
			})
		}

		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}

	return findings
}
