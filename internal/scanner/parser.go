package scanner

import (
	"context"
	"fmt"

	"github.com/getkin/kin-openapi/openapi3"
)

// Endpoint represents an API endpoint parsed from an OpenAPI specification.
type Endpoint struct {
	Method       string
	Path         string
	RequiresAuth bool
}

// Finding represents a security vulnerability discovered during active scanning.
type Finding struct {
	Endpoint Endpoint
	Type     string
	Severity string
	Details  string
}

// ScanConfig defines multi-user authentication credentials and resource IDs for active BOLA/IDOR testing.
type ScanConfig struct {
	UserAToken  string `json:"user_a_token"`
	UserBToken  string `json:"user_b_token"`
	ResourceIDA string `json:"resource_id_a"`
}

// ParseSpec loads and parses an OpenAPI 3.x spec from a file path into a list of Endpoints.
func ParseSpec(filePath string) ([]Endpoint, error) {
	ctx := context.Background()
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = true

	doc, err := loader.LoadFromFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load OpenAPI spec from file %s: %w", filePath, err)
	}

	if err := doc.Validate(ctx); err != nil {
		// Log validation warning or handle invalid specs, but continue parsing paths if document exists
	}

	hasGlobalAuth := len(doc.Security) > 0
	var endpoints []Endpoint

	if doc.Paths != nil {
		for path, pathItem := range doc.Paths.Map() {
			if pathItem == nil {
				continue
			}

			operations := map[string]*openapi3.Operation{
				"GET":     pathItem.Get,
				"POST":    pathItem.Post,
				"PUT":     pathItem.Put,
				"DELETE":  pathItem.Delete,
				"PATCH":   pathItem.Patch,
				"HEAD":    pathItem.Head,
				"OPTIONS": pathItem.Options,
			}

			for method, op := range operations {
				if op == nil {
					continue
				}

				requiresAuth := hasGlobalAuth
				if op.Security != nil {
					requiresAuth = len(*op.Security) > 0
				}

				endpoints = append(endpoints, Endpoint{
					Method:       method,
					Path:         path,
					RequiresAuth: requiresAuth,
				})
			}
		}
	}

	return endpoints, nil
}
