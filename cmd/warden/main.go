package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bhushanwayal/warden/internal/auth"
	"github.com/bhushanwayal/warden/internal/config"
	"github.com/bhushanwayal/warden/internal/proxy"
	"github.com/bhushanwayal/warden/internal/ratelimit"
)

func main() {
	// Initialize JSON structured logger using Go standard library slog
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load environment configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load configuration", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.Info("Warden API Security Gateway initializing",
		slog.String("service", "warden"),
		slog.Int("port", cfg.Port),
		slog.String("upstream_url", cfg.UpstreamURL),
		slog.String("redis_url", cfg.RedisURL),
		slog.String("log_level", cfg.LogLevel),
		slog.String("env", cfg.Env),
	)

	// Initialize reverse proxy handler
	reverseProxy, err := proxy.New(cfg.UpstreamURL)
	if err != nil {
		slog.Error("failed to initialize reverse proxy", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Initialize JWT validator
	jwtValidator := auth.NewJWTValidator(cfg.JWTSecret)
	authMiddleware := auth.NewAuthMiddleware(jwtValidator)

	// Initialize Redis client and Rate Limiter (fail-open if Redis unavailable)
	var rateLimiter ratelimit.RateLimiter
	redisClient, err := ratelimit.NewRedisClient(cfg.RedisURL)
	if err != nil {
		slog.Warn("Redis rate limiter connection unavailable, starting gateway without rate limiting (fail-open)",
			slog.String("redis_url", cfg.RedisURL),
			slog.String("error", err.Error()),
		)
	} else {
		defer redisClient.Close()
		rateLimiter = ratelimit.NewTokenBucket(redisClient)
		slog.Info("Redis token bucket rate limiter initialized", slog.String("redis_url", cfg.RedisURL))
	}

	// Build middleware chain: RateLimitMiddleware -> AuthMiddleware -> ReverseProxy
	rateLimitMiddleware := ratelimit.NewRateLimitMiddleware(rateLimiter, 5, time.Minute)
	protectedHandler := rateLimitMiddleware(authMiddleware(reverseProxy))

	mux := http.NewServeMux()
	mux.Handle("/", protectedHandler)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to capture server startup or listener errors
	serverErr := make(chan error, 1)

	// Start server asynchronously in a separate goroutine
	go func() {
		slog.Info("Warden gateway server started", slog.Int("port", cfg.Port), slog.String("upstream", cfg.UpstreamURL))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	// Signal channel for catching OS interrupt / termination signals
	stopSignal := make(chan os.Signal, 1)
	signal.Notify(stopSignal, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		slog.Error("Warden gateway server failed to start", slog.String("error", err.Error()))
		os.Exit(1)

	case sig := <-stopSignal:
		slog.Info("Shutdown signal received",
			slog.String("signal", sig.String()),
			slog.Int64("active_connections", reverseProxy.ActiveRequests()),
		)

		// Create 15-second timeout context for graceful request draining
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			slog.Error("Forced shutdown error", slog.String("error", err.Error()))
		} else {
			slog.Info("Server stopped gracefully", slog.Int64("remaining_active_connections", reverseProxy.ActiveRequests()))
		}
	}
}
