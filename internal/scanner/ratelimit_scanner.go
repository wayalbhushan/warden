package scanner

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// TestRateLimit fires a burst of 50 concurrent requests at a GET endpoint to test for active rate limiting.
func TestRateLimit(endpoints []Endpoint, targetURL string) []Finding {
	var findings []Finding

	// Find the first GET endpoint to test safely
	var testEp *Endpoint
	for i := range endpoints {
		if strings.ToUpper(endpoints[i].Method) == "GET" {
			testEp = &endpoints[i]
			break
		}
	}

	if testEp == nil {
		slog.Info("Skipping Rate Limit scan: no GET endpoint found in OpenAPI spec")
		return findings
	}

	targetURL = strings.TrimSuffix(targetURL, "/")
	resolvedPath := pathParamRegex.ReplaceAllString(testEp.Path, "123")
	if !strings.HasPrefix(resolvedPath, "/") {
		resolvedPath = "/" + resolvedPath
	}
	fullURL := targetURL + resolvedPath

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	const requestCount = 50
	var hitRateLimit atomic.Bool
	var wg sync.WaitGroup

	for i := 0; i < requestCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			req, err := http.NewRequest("GET", fullURL, nil)
			if err != nil {
				return
			}

			resp, err := client.Do(req)
			if err != nil {
				return
			}

			if resp.StatusCode == http.StatusTooManyRequests {
				hitRateLimit.Store(true)
			}

			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
		}()
	}

	wg.Wait()

	if !hitRateLimit.Load() {
		findings = append(findings, Finding{
			Endpoint: *testEp,
			Type:     "Missing Rate Limiting",
			Severity: "Medium",
			Details:  fmt.Sprintf("Fired %d concurrent requests to %s but received no HTTP 429 Too Many Requests responses", requestCount, testEp.Path),
		})
	}

	return findings
}
