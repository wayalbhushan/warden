package config_test

import (
	"os"
	"testing"

	"github.com/bhushanwayal/warden/internal/config"
)

func TestConfigDefaults(t *testing.T) {
	os.Unsetenv("PORT")
	os.Unsetenv("UPSTREAM_URL")
	os.Unsetenv("REDIS_URL")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != 8080 {
		t.Errorf("expected Port 8080, got %d", cfg.Port)
	}
	if cfg.UpstreamURL != "http://localhost:8081" {
		t.Errorf("expected UpstreamURL http://localhost:8081, got %s", cfg.UpstreamURL)
	}
	if cfg.RedisURL != "localhost:6379" {
		t.Errorf("expected RedisURL localhost:6379, got %s", cfg.RedisURL)
	}
}

func TestConfigCustomEnv(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("UPSTREAM_URL", "http://backend:9091")
	t.Setenv("REDIS_URL", "redis-host:6379")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != 9090 {
		t.Errorf("expected Port 9090, got %d", cfg.Port)
	}
	if cfg.UpstreamURL != "http://backend:9091" {
		t.Errorf("expected UpstreamURL http://backend:9091, got %s", cfg.UpstreamURL)
	}
	if cfg.RedisURL != "redis-host:6379" {
		t.Errorf("expected RedisURL redis-host:6379, got %s", cfg.RedisURL)
	}
}
