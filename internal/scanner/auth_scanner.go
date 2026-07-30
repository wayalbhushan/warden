package scanner

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"
)

var pathParamRegex = regexp.MustCompile(`\{[^}]+\}`)

// TestMissingAuth scans protected endpoints without authentication headers to detect Missing Authentication vulnerabilities.
func TestMissingAuth(endpoints []Endpoint, targetURL string) []Finding {
	var findings []Finding

	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        1000,
			MaxIdleConnsPerHost: 100,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	targetURL = strings.TrimSuffix(targetURL, "/")

	for _, ep := range endpoints {
		if !ep.RequiresAuth {
			continue
		}

		resolvedPath := pathParamRegex.ReplaceAllString(ep.Path, "123")
		if !strings.HasPrefix(resolvedPath, "/") {
			resolvedPath = "/" + resolvedPath
		}
		fullURL := targetURL + resolvedPath

		req, err := http.NewRequest(ep.Method, fullURL, nil)
		if err != nil {
			slog.Error("failed to create scanner HTTP request",
				slog.String("method", ep.Method),
				slog.String("url", fullURL),
				slog.String("error", err.Error()),
			)
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			slog.Warn("scanner HTTP request failed",
				slog.String("method", ep.Method),
				slog.String("url", fullURL),
				slog.String("error", err.Error()),
			)
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			findings = append(findings, Finding{
				Endpoint: ep,
				Type:     "Missing Authentication",
				Severity: "High",
				Details:  fmt.Sprintf("Endpoint returned HTTP %d without authentication tokens", resp.StatusCode),
			})
		}

		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}

	return findings
}
