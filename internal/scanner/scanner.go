package scanner

import (
	"fmt"
	"log/slog"
)

// RunScan parses the provided OpenAPI spec file and logs all extracted endpoints.
func RunScan(specPath string, targetURL string) error {
	slog.Info("Starting OpenAPI spec scanner mode",
		slog.String("spec_path", specPath),
		slog.String("target_url", targetURL),
	)

	endpoints, err := ParseSpec(specPath)
	if err != nil {
		return fmt.Errorf("scan failed: %w", err)
	}

	slog.Info("OpenAPI spec parsed successfully", slog.Int("endpoint_count", len(endpoints)))

	for _, ep := range endpoints {
		slog.Info("Discovered Endpoint",
			slog.String("method", ep.Method),
			slog.String("path", ep.Path),
			slog.Bool("requires_auth", ep.RequiresAuth),
		)
	}

	return nil
}
