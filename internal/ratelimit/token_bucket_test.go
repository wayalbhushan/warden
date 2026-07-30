package ratelimit_test

import (
	"context"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/ratelimit"
)

func TestTokenBucketRateLimiting(t *testing.T) {
	client, err := ratelimit.NewRedisClient("redis://localhost:6379")
	if err != nil {
		t.Skipf("skipping live Redis token bucket test (Redis container not running locally): %v", err)
	}
	defer client.Close()

	ctx := context.Background()
	tb := ratelimit.NewTokenBucket(client)
	clientID := "test-client-tb-1"
	limit := 3
	window := 10 * time.Second

	// Clean key before test
	_ = client.Del(ctx, "warden:ratelimit:tb:"+clientID).Err()

	// 1st request - allowed, remaining 2
	allowed, remaining, err := tb.Allow(ctx, clientID, limit, window)
	if err != nil {
		t.Fatalf("unexpected error on request 1: %v", err)
	}
	if !allowed || remaining != 2 {
		t.Errorf("request 1: expected allowed=true, remaining=2; got allowed=%v, remaining=%d", allowed, remaining)
	}

	// 2nd request - allowed, remaining 1
	allowed, remaining, err = tb.Allow(ctx, clientID, limit, window)
	if err != nil {
		t.Fatalf("unexpected error on request 2: %v", err)
	}
	if !allowed || remaining != 1 {
		t.Errorf("request 2: expected allowed=true, remaining=1; got allowed=%v, remaining=%d", allowed, remaining)
	}

	// 3rd request - allowed, remaining 0
	allowed, remaining, err = tb.Allow(ctx, clientID, limit, window)
	if err != nil {
		t.Fatalf("unexpected error on request 3: %v", err)
	}
	if !allowed || remaining != 0 {
		t.Errorf("request 3: expected allowed=true, remaining=0; got allowed=%v, remaining=%d", allowed, remaining)
	}

	// 4th request - rejected (0 remaining)
	allowed, remaining, err = tb.Allow(ctx, clientID, limit, window)
	if err != nil {
		t.Fatalf("unexpected error on request 4: %v", err)
	}
	if allowed || remaining != 0 {
		t.Errorf("request 4: expected allowed=false, remaining=0; got allowed=%v, remaining=%d", allowed, remaining)
	}
}
