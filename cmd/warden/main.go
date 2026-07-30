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

	"github.com/bhushanwayal/warden/internal/config"
	"github.com/bhushanwayal/warden/internal/proxy"
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

	mux := http.NewServeMux()
	mux.Handle("/", reverseProxy)

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
