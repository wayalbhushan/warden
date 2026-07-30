package config

import (
	"log/slog"
	"os"
	"strconv"
)

// Config holds the application configuration parameters.
type Config struct {
	Port        int    `json:"port"`
	UpstreamURL string `json:"upstream_url"`
	LogLevel    string `json:"log_level"`
	Env         string `json:"env"`
}

// Load reads configuration parameters from environment variables with standard defaults.
func Load() (*Config, error) {
	portStr := getEnv("PORT", "8080")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		slog.Warn("invalid PORT env value, fallback to default", slog.String("port", portStr), slog.String("error", err.Error()))
		port = 8080
	}

	return &Config{
		Port:        port,
		UpstreamURL: getEnv("UPSTREAM_URL", "http://localhost:8081"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		Env:         getEnv("ENV", "development"),
	}, nil
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
