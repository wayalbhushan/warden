package ratelimit

import (
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bhushanwayal/warden/internal/observability"
)

// NewRateLimitMiddleware creates an HTTP middleware enforcing rate limits via a RateLimiter instance.
func NewRateLimitMiddleware(limiter RateLimiter, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if limiter == nil {
				next.ServeHTTP(w, r)
				return
			}

			clientIP := extractClientIP(r)

			allowed, remaining, err := limiter.Allow(r.Context(), clientIP, limit, window)
			if err != nil {
				// Fail-open strategy: log Redis error heavily, but allow request to proceed
				slog.Error("rate limiter error (failing open)",
					slog.String("client_ip", clientIP),
					slog.String("path", r.URL.Path),
					slog.String("error", err.Error()),
				)
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

			if !allowed {
				observability.RateLimitDropsTotal.Inc()
				slog.Warn("rate limit exceeded",
					slog.String("client_ip", clientIP),
					slog.String("path", r.URL.Path),
					slog.Int("limit", limit),
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":"Too Many Requests","status":429}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// extractClientIP extracts the client IP address from X-Forwarded-For header or RemoteAddr.
func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}

	if r.RemoteAddr != "" {
		return r.RemoteAddr
	}

	return "unknown"
}
