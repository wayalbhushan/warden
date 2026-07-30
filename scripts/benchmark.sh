#!/usr/bin/env bash
set -e

# Benchmark script to measure Warden API Gateway throughput and latency vs Direct Backend

HEY_BIN="hey"
if ! command -v "$HEY_BIN" &> /dev/null; then
    GOPATH_RAW="$(go env GOPATH 2>/dev/null || echo "")"
    GOPATH_CONV="$(echo "$GOPATH_RAW" | tr '\\' '/')"
    
    if [ -f "$GOPATH_CONV/bin/hey.exe" ]; then
        HEY_BIN="$GOPATH_CONV/bin/hey.exe"
    elif [ -f "$GOPATH_CONV/bin/hey" ]; then
        HEY_BIN="$GOPATH_CONV/bin/hey"
    elif command -v hey.exe &> /dev/null; then
        HEY_BIN="hey.exe"
    else
        echo "Error: 'hey' load testing utility is not installed."
        echo "Please run: go install github.com/rakyll/hey@latest"
        exit 1
    fi
fi

CONCURRENCY=100
REQUEST_COUNT=10000

echo "=== Starting Warden Performance Benchmark ==="
echo "Concurrency: $CONCURRENCY | Total Requests: $REQUEST_COUNT"

mkdir -p scripts

echo "1. Measuring Direct Echo Backend Baseline (http://localhost:8081/public)..."
"$HEY_BIN" -c "$CONCURRENCY" -n "$REQUEST_COUNT" http://localhost:8081/public > scripts/baseline_results.txt
echo "   Baseline results saved to scripts/baseline_results.txt"

echo "2. Measuring Warden Gateway (http://localhost:8080/public)..."
"$HEY_BIN" -c "$CONCURRENCY" -n "$REQUEST_COUNT" http://localhost:8080/public > scripts/warden_results.txt
echo "   Warden gateway results saved to scripts/warden_results.txt"

echo ""
echo "=== Benchmark Completed Successfully ==="
echo "Review the benchmark outputs:"
echo " - Baseline: scripts/baseline_results.txt"
echo " - Warden:   scripts/warden_results.txt"
