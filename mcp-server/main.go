package main

import (
	"fmt"
	"os"

	"github.com/mark3labs/mcp-go/server"
)

func main() {
	// Initialize bare MCP server with server name and version
	s := server.NewMCPServer("warden-mcp", "1.0.0")

	// Run MCP server over stdio transport (standard for local MCP clients like Claude Desktop)
	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "MCP server error: %v\n", err)
		os.Exit(1)
	}
}
