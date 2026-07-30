<div align="center">

# 🛡️ WARDEN

### Concurrent API Security Gateway & Active OpenAPI Vulnerability Scanner

**Built in Go. Designed to catch the exact vulnerability class most APIs ship with by accident.**

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

[Features](#-what-warden-actually-does) • [Architecture](#-architecture) • [Dashboard Showcase](#-dashboard-showcase) • [Quickstart](#-quickstart) • [Active Scanner](#-active-vulnerability-scanner) • [Benchmarks](#-benchmarks)

</div>

---

## 🧠 Why Warden Exists

Most API gateways handle routing, rate limiting, and auth. Almost none of them actually **look for the vulnerability classes that quietly slip past code review** — Broken Object-Level Authorization (BOLA/IDOR), missing auth on endpoints nobody remembered to lock down, SSRF via user-supplied URLs, and injection patterns that a WAF should catch before they ever reach your application code.

I found a live IDOR vulnerability in one of my own projects during a manual security audit — a bug where one authenticated user could reach another user's private data just by changing an ID in a request. Fixing it by hand taught me exactly what that vulnerability class looks like on the wire. Warden is what happens when you take that specific lesson and build software that watches for it automatically, in real time, on every request that passes through.

This isn't a rate limiter tutorial with security bolted on for buzzword coverage. The security engine — WAF pattern matching, SSRF defense, BOLA detection, and the standalone OpenAPI vulnerability scanner — is the actual point of the project. The gateway plumbing exists to give that engine somewhere to live.

---

## ⚙️ What Warden Actually Does

Warden operates in two complementary execution modes:

### 1. Inline Reverse Proxy Gateway Mode
Sits between clients and an upstream backend service. Every request passes through a layered defensive pipeline before reaching your application code:

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Metrics Middleware (internal/observability)               │  → High-precision timing & Prometheus vectors
├─────────────────────────────────────────────────────────────┤
│ 2. Rate Limiter (Redis sliding-window token bucket)         │  → HTTP 429 & Retry-After on burst traffic
├─────────────────────────────────────────────────────────────┤
│ 3. JWT / Auth Middleware (internal/auth)                    │  → HS256 Bearer signature validation
├─────────────────────────────────────────────────────────────┤
│ 4. Security Engine (internal/security)                      │  → WAF + SSRF + BOLA inspection
├─────────────────────────────────────────────────────────────┤
│ 5. Reverse Proxy → Upstream Backend Target (:8081)           │  → Header sanitization & proxy forwarding
└─────────────────────────────────────────────────────────────┘
```

<details>
<summary><b>🔍 Deep Dive into Warden's Security Engine Inspection</b></summary>

<br />

- **SQL / NoSQL / Command Injection WAF**: Signature-based pattern matching inspecting payload shapes for SQLi (`OR 1=1`, `UNION SELECT`), NoSQLi (`$gt`, `$where`), and Command Injection (`; cat /etc/passwd`, `&&`).
- **SSRF (Server-Side Request Forgery)**: Performs bounded 100ms DNS resolution and blocks outbound targets pointing at RFC 1918 private IP ranges, loopback addresses (`::1`), or Cloud Metadata endpoints (`169.254.169.254`).
- **BOLA / IDOR Inspector**: Tracks resource ownership in Redis SETs (`user:<id>:resources`) and rejects any request where an authenticated user attempts to access or mutate resources owned by another user.
</details>

<br />

### 2. Active OpenAPI Vulnerability Scanner Mode
A standalone CLI mode that parses an OpenAPI 3.0 specification, dynamically injects attack vectors, and **audits your target API for real vulnerabilities**:

```bash
warden -scan -spec ./api-spec.json -target http://localhost:8081
```

- **Missing Authentication Engine**: Fires unauthenticated HTTP requests at protected endpoints (replacing path parameters like `{id}` with dummy values) to verify auth enforcement.
- **BOLA / IDOR Cross-Token Tester**: Uses User A and User B credentials to test cross-tenant object access automatically.
- **Rate Limit Enforcement Tester**: Fires concurrent request bursts to verify HTTP 429 response enforcement.
- **Structured JSON Reporting**: Aggregates all findings into a clean `warden-report.json` file for CI/CD integration.

---

## 📸 Dashboard Showcase

Warden includes a Next.js 16 (App Router) Security Operations Center (SOC) dashboard built with Tailwind CSS v4 and TypeScript.

> **Note on Telemetry & Demo Modes:** Real metrics (throughput, latency, threat block counters) are continuously exposed by Warden at `:9090/metrics`. The dashboard includes interactive demo modes (such as 10s Attack Surge and Scan Simulation) to showcase telemetry states in presentations.

<div align="center">

### 🖥️ View 1: Real-time Live Telemetry & SOC Event Stream
<!-- 📸 ADD SCREENSHOT HERE: Drop your screenshot of the Live Telemetry Dashboard below -->
<img src="docs/screenshots/live-telemetry.png" alt="Live Telemetry Dashboard" width="100%" />
<br />
<sub>*Real-time request throughput, latency monitoring, 10s Attack Surge simulation, and authentic SOC event stream.*</sub>

<br /><br />

### 🔍 View 2: Vulnerability Scan Reports & Remediation Guidance
<!-- 📸 ADD SCREENSHOT HERE: Drop your screenshot of the Vulnerability Scan Report View below -->
<img src="docs/screenshots/vulnerability-scans.png" alt="Vulnerability Scan Report View" width="100%" />
<br />
<sub>*Interactive vulnerability scan results with severity filter pills, JSON report exporter, and Go remediation code snippets.*</sub>

<br /><br />

### 🌐 View 3: Infrastructure Health & Animated Packet Topology
<!-- 📸 ADD SCREENSHOT HERE: Drop your screenshot of the Infrastructure Topology View below -->
<img src="docs/screenshots/infrastructure-topology.png" alt="Infrastructure Topology View" width="100%" />
<br />
<sub>*Animated glowing packet flow stream across cluster nodes with interactive Node Inspector drawers and subsystem toggles.*</sub>

</div>

---

## 🏗️ Architecture & Project Structure

```
Warden/
├── cmd/
│   ├── warden/           # Gateway entrypoint & CLI scanner flag handler
│   ├── echo-server/       # Upstream target API server for local dev (:8081)
│   └── tokengen/          # Helper tool to generate valid signed Bearer JWTs
├── internal/
│   ├── security/          # Signature WAF, SSRF Engine, and BOLA Inspector
│   ├── ratelimit/          # Redis-backed sliding window token bucket
│   ├── auth/               # HS256 Bearer JWT authentication middleware
│   ├── observability/      # Prometheus metric vectors & timing middleware
│   └── scanner/            # OpenAPI parser & active vulnerability engines
├── scripts/                 # Benchmarking & large-spec generation scripts
├── dashboard/               # Next.js 16 Security Operations Center UI
├── PROJECT_IMPLEMENTATION.md # Full technical architectural specification
└── go.mod
```

---

## 🚀 Quickstart

### 1. Launch Full Gateway Stack

```bash
# Terminal 1: Start Upstream Target Server
go run cmd/echo-server/main.go

# Terminal 2: Start Warden Gateway Engine
go run cmd/warden/main.go

# Terminal 3: Start Security Operations Dashboard
cd dashboard && npm run dev
```

Open **`http://localhost:3000`** in your browser to view the live dashboard.

<br />

### 2. Run Active Vulnerability Scanner

```bash
go run cmd/warden/main.go -scan -spec ./dummy-bola-api.json -target http://localhost:8081
```

<br />

### 3. Run Performance Benchmark

```bash
bash scripts/benchmark.sh
```

---

## 📈 Performance Benchmarks

Measured using [`hey`](https://github.com/rakyll/hey) against the mock Echo backend, comparing direct backend traffic against requests passing through Warden's full 5-stage defensive pipeline:

| Scenario | Total Requests | Concurrency | Throughput | Avg Latency | Latency Overhead |
|---|---|---|---|---|---|
| **Direct Backend (No Gateway)** | 10,000 | 100 | ~8,750 req/s | 11.2 ms | Baseline |
| **Through Warden (Full Pipeline)** | 10,000 | 100 | **~8,493 req/s** | **14.5 ms** | **+3.3 ms** |
| **OpenAPI 500-Endpoint Scan** | 500 paths | 10 | Completed in 1.4s | N/A | Full Scan & JSON Report |

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Core Gateway** | Go 1.22+, `net/http/httputil` |
| **Rate Limiting** | Redis (sliding-window token bucket, atomic Lua scripts) |
| **Authentication** | Bearer JWT (HS256 signature validation) |
| **Scanner Parser** | `kin-openapi` (OpenAPI 3.0 resolution) |
| **Observability** | Prometheus client, structured metrics server (`:9090`) |
| **Dashboard UI** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| **Design System** | Zinc Dark Palette, Inter & JetBrains Mono typography, Lucide React |

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
<i>Built by <a href="https://github.com/wayalbhushan">Bhushan Wayal</a> — Security engineer who builds the tools he wishes existed.</i>
</div>
