package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
)

// EchoResponse defines the structure of the JSON payload returned by the echo server.
type EchoResponse struct {
	Server  string              `json:"server"`
	Method  string              `json:"method"`
	Path    string              `json:"path"`
	Query   map[string][]string `json:"query"`
	Headers http.Header         `json:"headers"`
	Body    string              `json:"body"`
}

func main() {
	// Initialize JSON structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	port := os.Getenv("ECHO_PORT")
	if port == "" {
		port = "8081"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			slog.Error("failed to read request body", slog.String("error", err.Error()))
		}
		defer r.Body.Close()

		resp := EchoResponse{
			Server:  "Warden-Echo-Backend",
			Method:  r.Method,
			Path:    r.URL.Path,
			Query:   r.URL.Query(),
			Headers: r.Header,
			Body:    string(bodyBytes),
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Powered-By", "Warden-Echo-Backend")
		w.WriteHeader(http.StatusOK)

		if err := json.NewEncoder(w).Encode(resp); err != nil {
			slog.Error("failed to encode echo response", slog.String("error", err.Error()))
		}

		slog.Info("handled echo request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.String("remote_addr", r.RemoteAddr),
		)
	})

	addr := ":" + port
	slog.Info("Starting Warden Echo Backend server", slog.String("port", port))
	if err := http.ListenAndServe(addr, mux); err != nil {
		slog.Error("echo server stopped with error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
