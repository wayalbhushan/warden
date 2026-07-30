package ratelimit

import (
	"context"
	"time"
)

// RateLimiter defines the contract for rate limiting requests across gateway middleware implementations.
type RateLimiter interface {
	// Allow checks if a client request is permitted under specified limit and window constraints.
	Allow(ctx context.Context, clientID string, limit int, window time.Duration) (allowed bool, remaining int, err error)
}
