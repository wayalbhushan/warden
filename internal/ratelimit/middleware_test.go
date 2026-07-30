package ratelimit_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/ratelimit"
)

type mockLimiter struct {
	allowFn func(ctx context.Context, clientID string, limit int, window time.Duration) (bool, int, error)
}

func (m *mockLimiter) Allow(ctx context.Context, clientID string, limit int, window time.Duration) (bool, int, error) {
	return m.allowFn(ctx, clientID, limit, window)
}

func TestMiddlewareAllowed(t *testing.T) {
	lim := &mockLimiter{
		allowFn: func(ctx context.Context, clientID string, limit int, window time.Duration) (bool, int, error) {
			return true, 4, nil
		},
	}

	mw := ratelimit.NewRateLimitMiddleware(lim, 5, time.Minute)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.19, 10.0.0.1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	if rec.Header().Get("X-RateLimit-Limit") != "5" {
		t.Errorf("expected X-RateLimit-Limit '5', got %q", rec.Header().Get("X-RateLimit-Limit"))
	}

	if rec.Header().Get("X-RateLimit-Remaining") != "4" {
		t.Errorf("expected X-RateLimit-Remaining '4', got %q", rec.Header().Get("X-RateLimit-Remaining"))
	}
}

func TestMiddlewareTooManyRequests(t *testing.T) {
	lim := &mockLimiter{
		allowFn: func(ctx context.Context, clientID string, limit int, window time.Duration) (bool, int, error) {
			return false, 0, nil
		},
	}

	mw := ratelimit.NewRateLimitMiddleware(lim, 5, time.Minute)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called when rate limit exceeded")
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("expected status 429, got %d", rec.Code)
	}

	if rec.Header().Get("X-RateLimit-Remaining") != "0" {
		t.Errorf("expected X-RateLimit-Remaining '0', got %q", rec.Header().Get("X-RateLimit-Remaining"))
	}
}

func TestMiddlewareFailOpenOnError(t *testing.T) {
	lim := &mockLimiter{
		allowFn: func(ctx context.Context, clientID string, limit int, window time.Duration) (bool, int, error) {
			return false, 0, errors.New("redis connection timeout")
		},
	}

	mw := ratelimit.NewRateLimitMiddleware(lim, 5, time.Minute)
	handlerCalled := false
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !handlerCalled {
		t.Error("expected handler to be called when rate limiter fails (fail-open strategy)")
	}

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200 on fail-open, got %d", rec.Code)
	}
}
