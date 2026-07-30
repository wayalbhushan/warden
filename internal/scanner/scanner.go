package scanner

import (
	"fmt"
	"log/slog"
)

// RunScan parses the provided OpenAPI spec file, executes active security checks, and logs findings.
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

	slog.Info("Executing active security scan modules...")

	// Run Missing Authentication vulnerability check
	findings := TestMissingAuth(endpoints, targetURL)

	if len(findings) == 0 {
		slog.Info("Scan completed cleanly: 0 security vulnerabilities detected")
	} else {
		slog.Warn("Scan completed with security findings!", slog.Int("finding_count", len(findings)))
		for _, f := range findings {
			slog.Warn("SECURITY VULNERABILITY DETECTED",
				slog.String("type", f.Type),
				slog.String("severity", f.Severity),
				slog.String("method", f.Endpoint.Method),
				slog.String("path", f.Endpoint.Path),
				slog.String("details", f.Details),
			)
		}
	}

	return nil
}
