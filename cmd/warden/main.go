package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
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

	slog.Info("Warden gateway server started", slog.Int("port", cfg.Port), slog.String("upstream", cfg.UpstreamURL))

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Warden gateway server failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
