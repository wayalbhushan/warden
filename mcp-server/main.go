package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ScanReportResponse mirrors the JSON structure returned by Admin API GET /api/scans
type ScanReportResponse struct {
	ID            uint      `json:"id"`
	TargetURL     string    `json:"target_url"`
	SpecPath      string    `json:"spec_path"`
	GeneratedAt   time.Time `json:"generated_at"`
	TotalFindings int       `json:"total_findings"`
	CreatedAt     time.Time `json:"created_at"`
}

func main() {
	// Initialize bare MCP server
	s := server.NewMCPServer("warden-mcp", "1.0.0")

	// Define 'list_recent_scans' MCP tool
	listScansTool := mcp.NewTool(
		"list_recent_scans",
		mcp.WithDescription("Lists recent vulnerability scan reports from Warden, including target URL, timestamp, spec file, and total findings count."),
		mcp.WithNumber("limit", mcp.Description("Optional maximum number of recent scan reports to return (default: 10)")),
	)

	// Register tool handler
	s.AddTool(listScansTool, handleListRecentScans)

	// Run MCP server over stdio transport
	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "MCP server error: %v\n", err)
		os.Exit(1)
	}
}

func handleListRecentScans(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	// Parse optional 'limit' argument (default: 10)
	limit := 10
	if args, ok := request.Params.Arguments.(map[string]any); ok && args != nil {
		if val, ok := args["limit"].(float64); ok && val > 0 {
			limit = int(val)
		}
	}

	// Read Admin API base URL from environment or default to localhost:8082
	baseURL := os.Getenv("WARDEN_ADMIN_API_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8082"
	}

	endpoint := fmt.Sprintf("%s/api/scans", baseURL)

	// Create HTTP client with 5-second timeout
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to construct HTTP request to Admin API: %v", err)), nil
	}

	resp, err := client.Do(req)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Unable to connect to Warden Admin API at %s. Please verify the Admin API service is running (go run cmd/admin-api/main.go or docker-compose up). Error: %v", baseURL, err)), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return mcp.NewToolResultError(fmt.Sprintf("Warden Admin API returned HTTP status %d (%s): %s", resp.StatusCode, resp.Status, string(bodyBytes))), nil
	}

	var scans []ScanReportResponse
	if err := json.NewDecoder(resp.Body).Decode(&scans); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to parse JSON response from Warden Admin API: %v", err)), nil
	}

	if len(scans) == 0 {
		return mcp.NewToolResultText("No vulnerability scan reports found in Warden database. Run 'warden -scan ... -persist-db' to generate and persist a scan report."), nil
	}

	// Apply limit
	if len(scans) > limit {
		scans = scans[:limit]
	}

	// Format response as clean Markdown table for the AI agent
	output := fmt.Sprintf("### 🛡️ Warden Vulnerability Scan Reports (Showing %d recent scans)\n\n", len(scans))
	output += "| Scan ID | Target URL | OpenAPI Spec Path | Total Findings | Scan Timestamp (UTC) |\n"
	output += "|---|---|---|---|---|\n"

	for _, s := range scans {
		findingsBadge := fmt.Sprintf("%d findings", s.TotalFindings)
		if s.TotalFindings > 0 {
			findingsBadge = fmt.Sprintf("🚨 **%d findings**", s.TotalFindings)
		} else {
			findingsBadge = "✅ **0 findings (Clean)**"
		}

		specPath := s.SpecPath
		if specPath == "" {
			specPath = "N/A"
		}

		output += fmt.Sprintf("| `#%d` | `%s` | `%s` | %s | `%s` |\n",
			s.ID, s.TargetURL, specPath, findingsBadge, s.GeneratedAt.Format("2006-01-02 15:04:05 UTC"))
	}

	return mcp.NewToolResultText(output), nil
}
