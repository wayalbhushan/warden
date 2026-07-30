package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// tokenBucketScript defines the atomic Lua script for token bucket rate limiting.
var tokenBucketScript = redis.NewScript(`
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = 1

local rate = capacity / window_ms
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if not tokens then
    tokens = capacity
    last_refill = now
else
    local elapsed = math.max(0, now - last_refill)
    local refill = elapsed * rate
    tokens = math.min(capacity, tokens + refill)
    last_refill = now
end

local allowed = 0
if tokens >= cost then
    allowed = 1
    tokens = tokens - cost
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('PEXPIRE', key, window_ms)

return {allowed, math.floor(tokens)}
`)

// RedisTokenBucket implements the RateLimiter interface using an atomic Redis Lua script.
type RedisTokenBucket struct {
	client *redis.Client
}

// NewTokenBucket creates a new RedisTokenBucket instance.
func NewTokenBucket(client *redis.Client) *RedisTokenBucket {
	return &RedisTokenBucket{
		client: client,
	}
}

// Allow evaluates if a request from clientID is permitted under capacity and time window limits.
func (tb *RedisTokenBucket) Allow(ctx context.Context, clientID string, limit int, window time.Duration) (allowed bool, remaining int, err error) {
	key := fmt.Sprintf("warden:ratelimit:tb:%s", clientID)
	windowMs := window.Milliseconds()
	nowMs := time.Now().UnixMilli()

	res, err := tokenBucketScript.Run(ctx, tb.client, []string{key}, limit, windowMs, nowMs).Result()
	if err != nil {
		return false, 0, fmt.Errorf("token bucket lua execution failed: %w", err)
	}

	slice, ok := res.([]interface{})
	if !ok || len(slice) < 2 {
		return false, 0, fmt.Errorf("unexpected script response format: %v", res)
	}

	allowedVal, _ := slice[0].(int64)
	remainingVal, _ := slice[1].(int64)

	return allowedVal == 1, int(remainingVal), nil
}
