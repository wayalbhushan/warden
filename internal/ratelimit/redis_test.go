package ratelimit_test

import (
	"testing"

	"github.com/bhushanwayal/warden/internal/ratelimit"
)

func TestNewRedisClientInvalidURL(t *testing.T) {
	_, err := ratelimit.NewRedisClient("redis://invalid:port:schema")
	if err == nil {
		t.Errorf("expected error for invalid Redis URL schema")
	}
}

func TestNewRedisClientUnreachable(t *testing.T) {
	_, err := ratelimit.NewRedisClient("redis://127.0.0.1:59999")
	if err == nil {
		t.Errorf("expected error when connecting to unreachable Redis host")
	}
}

func TestNewRedisClientLocal(t *testing.T) {
	client, err := ratelimit.NewRedisClient("redis://localhost:6379")
	if err != nil {
		t.Skipf("skipping Redis live ping test (Redis container not running locally on 6379): %v", err)
	} else {
		defer client.Close()
	}
}
