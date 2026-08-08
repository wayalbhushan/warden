# Warden MCP Server (Model Context Protocol)

**Status:** Phase 0 — Bare Scaffolding Initialized (In Progress)

This component provides a Model Context Protocol (MCP) server for Warden, allowing AI assistants (such as Claude Desktop and Cursor) to query Warden's Admin API, scan history, security findings, and gateway configuration directly over stdio.

## Execution

### Run Locally via Go CLI
```bash
go run ./mcp-server
```

### Build Executable Binary
```bash
go build -o warden-mcp ./mcp-server
```

## Claude Desktop Integration (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "warden": {
      "command": "go",
      "args": ["run", "c:/Users/wayal/Desktop/Warden/mcp-server/main.go"]
    }
  }
}
```
