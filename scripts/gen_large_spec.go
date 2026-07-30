package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type OpenAPISpec struct {
	OpenAPI string               `json:"openapi"`
	Info    Info                 `json:"info"`
	Paths   map[string]PathItem `json:"paths"`
}

type Info struct {
	Title   string `json:"title"`
	Version string `json:"version"`
}

type PathItem struct {
	Get *Operation `json:"get,omitempty"`
}

type Operation struct {
	Security  []map[string][]string `json:"security,omitempty"`
	Responses map[string]Response   `json:"responses"`
}

type Response struct {
	Description string `json:"description"`
}

func main() {
	paths := make(map[string]PathItem, 500)

	for i := 1; i <= 500; i++ {
		pathKey := fmt.Sprintf("/api/resource%d/{id}", i)
		paths[pathKey] = PathItem{
			Get: &Operation{
				Security: []map[string][]string{
					{"BearerAuth": {}},
				},
				Responses: map[string]Response{
					"200": {Description: "OK"},
				},
			},
		}
	}

	spec := OpenAPISpec{
		OpenAPI: "3.0.0",
		Info: Info{
			Title:   "Large Benchmark API Spec",
			Version: "1.0",
		},
		Paths: paths,
	}

	data, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to marshal spec: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile("large-api.json", data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write large-api.json: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Successfully generated 500-endpoint OpenAPI specification: large-api.json")
}
