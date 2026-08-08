# 🤖 Warden Model Context Protocol (MCP) Server

**Status:** Production Ready (Built with Go SDK `github.com/mark3labs/mcp-go`)

This component provides a Model Context Protocol (MCP) server for Warden. It allows AI assistants such as **Claude Desktop**, **Cursor**, and **Windsurf** to inspect Warden's Admin API, query vulnerability scan history, retrieve detailed security findings, and monitor API security posture directly over stdio transport.

---

## 🛠️ Registered MCP Tools

### 1. `list_recent_scans`
- **Description**: Lists recent vulnerability scan reports from Warden, including target URL, timestamp, spec file, and total findings count.
- **Parameters**:
  - `limit` (number, optional, default: `10`): Maximum number of scan reports to return.
- **Example AI Prompt**: *"What vulnerability scans have run recently on Warden?"*

### 2. `get_scan_findings`
- **Description**: Retrieves all security findings for a specific Warden vulnerability scan report by its scan ID.
- **Parameters**:
  - `scan_id` (number, **required**): The numeric ID of the scan report (e.g. `1`).
- **Example AI Prompt**: *"Show me the findings from scan report 1."*
- **Error Handling**: Gracefully handles non-existent scan IDs (HTTP 404) by guiding the agent back to `list_recent_scans`.

### 3. `get_critical_findings`
- **Description**: Retrieves all vulnerability findings of a specified severity level across all Warden security scans, providing a quick posture overview with originating target URL provenance.
- **Parameters**:
  - `severity` (string, optional, default: `"Critical"`): Severity level filter (`Critical`, `High`, `Medium`, `Low`).
- **Example AI Prompt**: *"Are there any high severity vulnerabilities across our Warden scans?"*
- **Clean Surface Response**: Returns a positive confirmation message when 0 findings match the requested severity level.

---

## ⚙️ Configuration & Environment

The MCP server connects internally to Warden's Admin API via plain HTTP:
- `WARDEN_ADMIN_API_URL`: Base URL for Warden's Admin API (Default: `http://localhost:8082`).

---

## 🚀 Execution & Claude Desktop Setup

### 1. Compile Standalone Executable
```bash
go build -o warden-mcp.exe ./mcp-server
```

### 2. Configure Claude Desktop (`claude_desktop_config.json`)

On Windows, edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "warden": {
      "command": "C:\\Users\\wayal\\Desktop\\Warden\\warden-mcp.exe",
      "env": {
        "WARDEN_ADMIN_API_URL": "http://localhost:8082"
      }
    }
  }
}
```

### 3. Restart Claude Desktop
Re-open Claude Desktop. The `warden` MCP server tool badge will automatically appear in your chat prompt window.
