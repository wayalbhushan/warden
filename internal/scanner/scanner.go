package scanner

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
)

// RunScan parses the provided OpenAPI spec file, executes active security checks, logs findings, and saves warden-report.json.
func RunScan(specPath string, targetURL string, configPath string) error {
	slog.Info("Starting OpenAPI spec scanner mode",
		slog.String("spec_path", specPath),
		slog.String("target_url", targetURL),
		slog.String("config_path", configPath),
	)

	var scanCfg ScanConfig
	if configPath != "" {
		data, err := os.ReadFile(configPath)
		if err != nil {
			return fmt.Errorf("failed to read scan config file %s: %w", configPath, err)
		}
		if err := json.Unmarshal(data, &scanCfg); err != nil {
			return fmt.Errorf("failed to parse scan config JSON: %w", err)
		}
		slog.Info("Loaded scan configuration for multi-user BOLA testing",
			slog.String("resource_id_a", scanCfg.ResourceIDA),
		)
	}

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

	var allFindings []Finding

	// Module 1: Missing Authentication Scanner
	missingAuthFindings := TestMissingAuth(endpoints, targetURL)
	allFindings = append(allFindings, missingAuthFindings...)

	// Module 2: BOLA / IDOR Cross-Access Scanner
	bolaFindings := TestBOLA(endpoints, targetURL, scanCfg)
	allFindings = append(allFindings, bolaFindings...)

	// Module 3: Rate Limit Bypass Scanner
	rateLimitFindings := TestRateLimit(endpoints, targetURL)
	allFindings = append(allFindings, rateLimitFindings...)

	if len(allFindings) == 0 {
		slog.Info("Scan completed cleanly: 0 security vulnerabilities detected")
	} else {
		slog.Warn("Scan completed with security findings!", slog.Int("finding_count", len(allFindings)))
		for _, f := range allFindings {
			slog.Warn("SECURITY VULNERABILITY DETECTED",
				slog.String("type", f.Type),
				slog.String("severity", f.Severity),
				slog.String("method", f.Endpoint.Method),
				slog.String("path", f.Endpoint.Path),
				slog.String("details", f.Details),
			)
		}
	}

	// Generate and save structured JSON vulnerability report
	reportData, err := json.MarshalIndent(allFindings, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to generate JSON vulnerability report: %w", err)
	}

	reportFile := "warden-report.json"
	if err := os.WriteFile(reportFile, reportData, 0644); err != nil {
		return fmt.Errorf("failed to save vulnerability report to %s: %w", reportFile, err)
	}

	slog.Info("Structured security vulnerability report saved successfully", slog.String("report_file", reportFile))

	return nil
}
