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

// FindingDetail represents an individual vulnerability finding in a scan report
type FindingDetail struct {
	ID           uint   `json:"id"`
	ScanReportID uint   `json:"scan_report_id"`
	Type         string `json:"type"`
	Severity     string `json:"severity"`
	Method       string `json:"method"`
	Path         string `json:"path"`
	Details      string `json:"details"`
}

// ScanReportDetailResponse mirrors the JSON structure returned by Admin API GET /api/scans/:id
type ScanReportDetailResponse struct {
	ID            uint            `json:"id"`
	TargetURL     string          `json:"target_url"`
	SpecPath      string          `json:"spec_path"`
	GeneratedAt   time.Time       `json:"generated_at"`
	TotalFindings int             `json:"total_findings"`
	Findings      []FindingDetail `json:"findings"`
	CreatedAt     time.Time       `json:"created_at"`
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
	s.AddTool(listScansTool, handleListRecentScans)

	// Define 'get_scan_findings' MCP tool
	getFindingsTool := mcp.NewTool(
		"get_scan_findings",
		mcp.WithDescription("Retrieves all security findings for a specific Warden vulnerability scan report by its scan ID."),
		mcp.WithNumber("scan_id", mcp.Required(), mcp.Description("The numeric ID of the scan report to retrieve (e.g. 1)")),
	)
	s.AddTool(getFindingsTool, handleGetScanFindings)

	// Run MCP server over stdio transport
	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "MCP server error: %v\n", err)
		os.Exit(1)
	}
}

func getAdminAPIBaseURL() string {
	baseURL := os.Getenv("WARDEN_ADMIN_API_URL")
	if baseURL == "" {
		return "http://localhost:8082"
	}
	return baseURL
}

func handleListRecentScans(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	limit := 10
	if args, ok := request.Params.Arguments.(map[string]any); ok && args != nil {
		if val, ok := args["limit"].(float64); ok && val > 0 {
			limit = int(val)
		}
	}

	baseURL := getAdminAPIBaseURL()
	endpoint := fmt.Sprintf("%s/api/scans", baseURL)

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

	if len(scans) > limit {
		scans = scans[:limit]
	}

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

func handleGetScanFindings(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var scanID int
	if args, ok := request.Params.Arguments.(map[string]any); ok && args != nil {
		if val, ok := args["scan_id"].(float64); ok && val > 0 {
			scanID = int(val)
		}
	}

	if scanID <= 0 {
		return mcp.NewToolResultError("Invalid or missing 'scan_id' parameter. Please provide a positive integer scan ID (e.g. scan_id: 1)."), nil
	}

	baseURL := getAdminAPIBaseURL()
	endpoint := fmt.Sprintf("%s/api/scans/%d", baseURL, scanID)

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to construct HTTP request to Admin API: %v", err)), nil
	}

	resp, err := client.Do(req)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Unable to connect to Warden Admin API at %s. Error: %v", baseURL, err)), nil
	}
	defer resp.Body.Close()

	// Handle 404 Not Found explicitly
	if resp.StatusCode == http.StatusNotFound {
		return mcp.NewToolResultText(fmt.Sprintf("No scan report found with ID #%d in Warden database. Use 'list_recent_scans' to see all valid scan IDs.", scanID)), nil
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return mcp.NewToolResultError(fmt.Sprintf("Warden Admin API returned HTTP status %d (%s): %s", resp.StatusCode, resp.Status, string(bodyBytes))), nil
	}

	var report ScanReportDetailResponse
	if err := json.NewDecoder(resp.Body).Decode(&report); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to decode scan report details JSON: %v", err)), nil
	}

	output := fmt.Sprintf("## 🛡️ Warden Vulnerability Scan Report #%d\n\n", report.ID)
	output += fmt.Sprintf("- **Target URL:** `%s`\n", report.TargetURL)
	output += fmt.Sprintf("- **Spec File:** `%s`\n", report.SpecPath)
	output += fmt.Sprintf("- **Timestamp:** `%s`\n", report.GeneratedAt.Format("2006-01-02 15:04:05 UTC"))
	output += fmt.Sprintf("- **Total Findings:** `%d`\n\n", report.TotalFindings)

	if len(report.Findings) == 0 {
		output += "✅ **No vulnerabilities detected in this scan report.** Endpoint configuration is clean.\n"
		return mcp.NewToolResultText(output), nil
	}

	output += "### 🚨 Discovered Vulnerabilities\n\n"

	for i, f := range report.Findings {
		var severityIcon string
		switch f.Severity {
		case "Critical":
			severityIcon = "🚨 **[CRITICAL]**"
		case "High":
			severityIcon = "⚠️ **[HIGH]**"
		case "Medium":
			severityIcon = "🟡 **[MEDIUM]**"
		case "Low":
			severityIcon = "🔵 **[LOW]**"
		default:
			severityIcon = fmt.Sprintf("⚠️ **[%s]**", f.Severity)
		}

		endpointStr := f.Path
		if f.Method != "" {
			endpointStr = fmt.Sprintf("%s %s", f.Method, f.Path)
		}

		output += fmt.Sprintf("#### %d. %s %s\n", i+1, severityIcon, f.Type)
		output += fmt.Sprintf("- **Affected Endpoint:** `%s`\n", endpointStr)
		output += fmt.Sprintf("- **Details:** %s\n\n", f.Details)
	}

	return mcp.NewToolResultText(output), nil
}
