package main

import (
	"log/slog"
	"os"

	"github.com/bhushanwayal/warden/internal/config"
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
		slog.String("log_level", cfg.LogLevel),
		slog.String("env", cfg.Env),
	)
}
