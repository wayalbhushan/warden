package ratelimit_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/ratelimit"
)

func TestDistributedRateLimiterConcurrency(t *testing.T) {
	// Connect to local Redis container
	client, err := ratelimit.NewRedisClient("redis://localhost:6379")
	if err != nil {
		t.Skipf("skipping live Redis concurrency integration test (Redis unavailable): %v", err)
	}
	defer client.Close()

	ctx := context.Background()
	testIP := "192.168.1.100"

	// Clear out test keys to ensure a clean slate
	_ = client.Del(ctx, "warden:ratelimit:tb:"+testIP).Err()
	_ = client.Del(ctx, "rate_limit:"+testIP).Err()

	// Initialize RedisTokenBucket rate limiter (limit = 10 requests per 1 minute)
	tokenBucket := ratelimit.NewTokenBucket(client)
	mw := ratelimit.NewRateLimitMiddleware(tokenBucket, 10, time.Minute)

	// Create test HTTP server wrapping middleware
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	testServer := httptest.NewServer(mw(dummyHandler))
	defer testServer.Close()

	const totalRequests = 100
	var allowedCount atomic.Int32
	var rejectedCount atomic.Int32

	var wg sync.WaitGroup
	wg.Add(totalRequests)

	httpClient := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        totalRequests,
			MaxIdleConnsPerHost: totalRequests,
			MaxConnsPerHost:     totalRequests,
		},
		Timeout: 10 * time.Second,
	}

	for i := 0; i < totalRequests; i++ {
		go func() {
			defer wg.Done()

			req, err := http.NewRequest(http.MethodGet, testServer.URL+"/test", nil)
			if err != nil {
				t.Errorf("failed to create request: %v", err)
				return
			}
			req.Header.Set("X-Forwarded-For", testIP)

			resp, err := httpClient.Do(req)
			if err != nil {
				t.Errorf("request failed: %v", err)
				return
			}
			defer resp.Body.Close()

			_, _ = io.Copy(io.Discard, resp.Body)

			switch resp.StatusCode {
			case http.StatusOK:
				allowedCount.Add(1)
			case http.StatusTooManyRequests:
				rejectedCount.Add(1)
			default:
				t.Errorf("unexpected status code: %d", resp.StatusCode)
			}
		}()
	}

	wg.Wait()

	if allowedCount.Load() != 10 {
		t.Errorf("expected exactly 10 allowed requests, got %d", allowedCount.Load())
	}

	if rejectedCount.Load() != 90 {
		t.Errorf("expected exactly 90 rejected requests, got %d", rejectedCount.Load())
	}
}
