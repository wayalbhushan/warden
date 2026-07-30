package scanner_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/bhushanwayal/warden/internal/scanner"
)

func TestParseSpec(t *testing.T) {
	tempDir := t.TempDir()
	specPath := filepath.Join(tempDir, "test-spec.json")

	specContent := `{
		"openapi": "3.0.0",
		"info": { "title": "Test API", "version": "1.0" },
		"paths": {
			"/secure": {
				"get": {
					"security": [{ "BearerAuth": [] }],
					"responses": { "200": { "description": "OK" } }
				}
			},
			"/public": {
				"get": {
					"responses": { "200": { "description": "OK" } }
				}
			}
		}
	}`

	if err := os.WriteFile(specPath, []byte(specContent), 0644); err != nil {
		t.Fatalf("failed to create temp spec file: %v", err)
	}

	endpoints, err := scanner.ParseSpec(specPath)
	if err != nil {
		t.Fatalf("unexpected error parsing spec: %v", err)
	}

	if len(endpoints) != 2 {
		t.Fatalf("expected 2 endpoints, got %d", len(endpoints))
	}

	foundSecure := false
	foundPublic := false

	for _, ep := range endpoints {
		if ep.Path == "/secure" {
			foundSecure = true
			if ep.Method != "GET" || !ep.RequiresAuth {
				t.Errorf("/secure expected GET with RequiresAuth=true, got method=%s, auth=%v", ep.Method, ep.RequiresAuth)
			}
		}
		if ep.Path == "/public" {
			foundPublic = true
			if ep.Method != "GET" || ep.RequiresAuth {
				t.Errorf("/public expected GET with RequiresAuth=false, got method=%s, auth=%v", ep.Method, ep.RequiresAuth)
			}
		}
	}

	if !foundSecure || !foundPublic {
		t.Errorf("missing expected endpoints in spec output: secure=%v, public=%v", foundSecure, foundPublic)
	}
}
