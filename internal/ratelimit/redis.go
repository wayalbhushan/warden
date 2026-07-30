package ratelimit

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient parses the Redis connection string, initializes the client, and verifies connectivity.
func NewRedisClient(redisURL string) (*redis.Client, error) {
	var opts *redis.Options
	var err error

	if strings.HasPrefix(redisURL, "redis://") || strings.HasPrefix(redisURL, "rediss://") {
		opts, err = redis.ParseURL(redisURL)
		if err != nil {
			return nil, fmt.Errorf("invalid Redis connection URL %q: %w", redisURL, err)
		}
	} else {
		opts = &redis.Options{
			Addr: redisURL,
		}
	}

	// Set fast connection timeout and disable retries for immediate connectivity validation
	opts.MaxRetries = -1
	opts.DialTimeout = 1 * time.Second

	client := redis.NewClient(opts)

	// Ping check to ensure connection is live before returning client
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redis ping failed for %q: %w", redisURL, err)
	}

	return client, nil
}
