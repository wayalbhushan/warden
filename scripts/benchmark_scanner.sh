#!/usr/bin/env bash
set -e

# Benchmark script to time Warden Active Vulnerability Scanner against 500 endpoints

echo "=== Generating 500-Endpoint OpenAPI Spec ==="
go run scripts/gen_large_spec.go

echo ""
echo "=== Benchmarking Active Security Scanner against 500 Endpoints ==="
time go run cmd/warden/main.go -scan large-api.json -target http://localhost:8081 -config scan-config.json

echo ""
echo "=== Scanner Benchmark Completed Successfully ==="
