<div align="center">

# 🛡️ WARDEN

### Concurrent API Security Gateway, Active Vulnerability Scanner, Admin API & MCP Server

**Built in Go. Designed to catch the exact vulnerability class most APIs ship with by accident.**

[![Go Version](https://img.shields.io/badge/Go-1.26+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Gin Framework](https://img.shields.io/badge/Gin_Framework-008080?style=for-the-badge&logo=gin&logoColor=white)](https://gin-gonic.com/)
[![GORM](https://img.shields.io/badge/GORM-PostgreSQL-0064a5?style=for-the-badge&logo=postgresql&logoColor=white)](https://gorm.io/)
[![SQLite Fallback](https://img.shields.io/badge/SQLite-Resilient_Fallback-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Model_Context_Protocol-8A2BE2?style=for-the-badge&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

[Features](#-what-warden-actually-does) • [Architecture](#-system-architecture) • [Admin API](#-admin-api-service-port-8082) • [MCP Server](#-model-context-protocol-mcp-ai-server) • [Dashboard Showcase](#-dashboard-showcase) • [Quickstart](#-quickstart)

</div>

---

## 🧠 Why Warden Exists

Most API gateways handle routing, rate limiting, and auth. Almost none of them actually **look for the vulnerability classes that quietly slip past code review** — Broken Object-Level Authorization (BOLA/IDOR), missing auth on endpoints nobody remembered to lock down, SSRF via user-supplied URLs, and injection patterns that a WAF should catch before they ever reach your application code.

I found a live IDOR vulnerability in one of my own projects during a manual security audit — a bug where one authenticated user could reach another user's private data just by changing an ID in a request. Fixing it by hand taught me exactly what that vulnerability class looks like on the wire. Warden is what happens when you take that specific lesson and build software that watches for it automatically, in real time, on every request that passes through.

This isn't a rate limiter tutorial with security bolted on for buzzword coverage. The security engine — WAF pattern matching, SSRF defense, BOLA detection, the standalone OpenAPI vulnerability scanner, the Gin/GORM Admin API with SQLite fallback, and the native Model Context Protocol (MCP) AI Server — is the actual point of the project.

---

## ⚙️ What Warden Actually Does

Warden operates in four modular execution layers:

### 1. Inline Reverse Proxy Security Gateway Mode (`cmd/warden`)
Sits between clients and upstream microservices. Every request passes through a layered defensive pipeline in sub-3.5ms:

```
                  ┌─────────────────────────────────────────────────────────────┐
 [ CLIENT REQ ] ──►  1. Metrics Middleware (internal/observability)              │ → Prometheus Vectors
                  ├─────────────────────────────────────────────────────────────┤
                  │  2. Rate Limiter (Redis sliding-window token bucket)        │ → HTTP 429 & Retry-After
                  ├─────────────────────────────────────────────────────────────┤
                  │  3. JWT / Auth Middleware (internal/auth)                   │ → HS256 Bearer Signature
                  ├─────────────────────────────────────────────────────────────┤
                  │  4. Security Engine (internal/security)                     │ → WAF + SSRF + BOLA
                  ├─────────────────────────────────────────────────────────────┤
                  │  5. Reverse Proxy Handler (net/http/httputil)               │
                  └──────────────────────────────┬──────────────────────────────┘
                                                 │ Forward Request
                                                 ▼
                                     ┌───────────────────────┐
                                     │ Upstream Target API   │
                                     │ (Echo Backend :8081)  │
                                     └───────────────────────┘
```

<details>
<summary><b>🔍 Deep Dive into Warden's Security Inspection Pipeline</b></summary>

<br />

- **SQL / NoSQL / Command Injection WAF**: Signature-based pattern matching inspecting payload shapes for SQLi (`OR 1=1`, `UNION SELECT`), NoSQLi (`$gt`, `$where`), and Command Injection (`; cat /etc/passwd`, `&&`).
- **SSRF (Server-Side Request Forgery)**: Performs bounded 100ms DNS resolution and blocks outbound targets pointing at RFC 1918 private IP ranges, loopback addresses (`::1`), or Cloud Metadata endpoints (`169.254.169.254`).
- **BOLA / IDOR Inspector**: Tracks resource ownership in Redis SETs (`user:<id>:resources`) and rejects any request where an authenticated user attempts to access or mutate resources owned by another user.
</details>

<br />

### 2. Active OpenAPI Vulnerability Scanner Mode (`warden -scan`)
A standalone CLI mode that parses OpenAPI 3.0 specifications, dynamically injects attack vectors, and audits your target API:

```bash
warden -scan ./api-spec.json -target http://localhost:8081 -persist-db
```

- **Missing Authentication Engine**: Fires unauthenticated HTTP requests at protected endpoints to verify auth enforcement.
- **BOLA / IDOR Cross-Token Tester**: Uses User A and User B credentials to test cross-tenant object access automatically.
- **Rate Limit Enforcement Tester**: Fires concurrent request bursts to verify HTTP 429 response enforcement.
- **Dual Persistence**: Exports `warden-report.json` and automatically pushes report findings directly into PostgreSQL / SQLite via `-persist-db`.

<br />

### 3. Admin API REST Service (`cmd/admin-api`)
A standalone management service built with **Gin** and **GORM** running on port `8082`:
- Query scan report history and filter findings by severity (`Critical`, `High`, `Medium`, `Low`).
- Manage global WAF sensitivity modes (`permissive`, `balanced`, `strict`) and IP blocklists.
- **Zero-Downtime Database Resiliency**: Automatically falls back to local **SQLite** (`warden-admin.db`) if PostgreSQL is offline in local dev environments.

<br />

### 4. Model Context Protocol (MCP) AI Server (`mcp-server/`)
A native Go implementation of Anthropic's **Model Context Protocol (MCP)** using `github.com/mark3labs/mcp-go`. Allows AI assistants (**Claude Desktop**, **Cursor**, **Windsurf**) to query Warden's vulnerability scans and security posture via stdio transport:
- **`list_recent_scans`**: Lists recent scan reports (takes optional `limit` parameter).
- **`get_scan_findings`**: Retrieves detailed findings for a specific scan ID with severity badges and remediations (handles 404s gracefully).
- **`get_critical_findings`**: Aggregates vulnerabilities across all scans by severity with scan provenance (ID & Target URL) and positive "clean surface" responses.

---

## 🏛️ System Architecture

```
                               ┌───────────────────────────┐
                               │     Web Clients & cURL    │
                               └─────────────┬─────────────┘
                                             │ HTTP Requests
                                             ▼
                               ┌───────────────────────────┐
                               │   Warden Security Gateway │
                               │   (Go Engine :8080)       │
                               └──────┬─────────────┬──────┘
                                      │             │
                    Cache & BOLA Sets │             │ Telemetry
                                      ▼             ▼
                           ┌──────────────┐    ┌─────────────────┐
                           │ Redis Server │    │ Prometheus      │
                           │ (:6379)      │    │ Metrics (:9090) │
                           └──────────────┘    └────────┬────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Next.js 16 SOC  │
                                               │ Dashboard UI    │
                                               └─────────────────┘

 ─────────────────────────────────────────────────────────────────────────────
 ADMIN, PERSISTENCE & MCP AI INTEGRATION LAYER

 ┌──────────────────────┐    Persist Report    ┌───────────────────────────┐
 │ Warden Scanner CLI   ├─────────────────────►│ PostgreSQL / SQLite DB    │
 │ (warden -scan)       │    (-persist-db)     │ (wardendb :5432)          │
 └──────────────────────┘                      └─────────────▲─────────────┘
                                                             │ GORM ORM
                                               ┌─────────────┴─────────────┐
 ┌──────────────────────┐                      │ Warden Admin API          │
 │ AI Assistant Clients │── MCP stdio transport│ (Gin REST Engine :8082)   │
 │ (Claude Desktop)     │─────────────────────►└─────────────▲─────────────┘
 └──────────────────────┘   (warden-mcp.exe)                 │ HTTP REST
                                               ┌─────────────┴─────────────┐
                                               │ Warden MCP Server         │
                                               │ (mcp-server/main.go)      │
                                               └───────────────────────────┘
```

---

## 🛠️ Admin API Service (Port 8082)

The Admin API exposes dedicated REST endpoints for querying database scan history and configuring gateway settings:

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Health** | `/health` | `GET` | Health check & DB connection status (`postgres` or `sqlite`) |
| **Scan History** | `/api/scans` | `GET` | Paginated scan reports ordered by `generated_at desc` |
| **Scan Details** | `/api/scans/:id` | `GET` | Full scan report details with preloaded findings |
| **Findings** | `/api/findings` | `GET` | Filter findings across scans (e.g. `?severity=Critical`) |
| **Gateway Config** | `/api/config` | `GET`/`PUT` | Get or update WAF mode (`permissive`/`balanced`/`strict`) & rate limits |
| **IP Blocklist** | `/api/blocked-ips` | `GET`/`POST`/`DELETE` | List, add, or unblock IP addresses |

---

## 🤖 Model Context Protocol (MCP) AI Server

Warden includes a production-grade MCP server built using the official Go SDK (`github.com/mark3labs/mcp-go`). It allows AI agents to inspect your API security posture natively.

### Available MCP Tools

| Tool Name | Parameters | Description |
|---|---|---|
| `list_recent_scans` | `limit` (int, default 10) | Lists recent vulnerability scan reports with target URL, timestamp, and finding counts. |
| `get_scan_findings` | `scan_id` (int, required) | Retrieves full security findings for a specific scan ID with severity badges & remediations. |
| `get_critical_findings` | `severity` (string, default "Critical") | Aggregates findings by severity level across all scans with target URL provenance. |

### Claude Desktop Configuration (`claude_desktop_config.json`)

Add Warden's compiled binary to your Claude Desktop configuration:

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

### Example Natural-Language AI Prompts
- *"What vulnerability scans have run recently on Warden?"*
- *"Show me the findings from scan report 1."*
- *"Are there any high severity vulnerabilities across our Warden scans?"*
- *"Do we have any critical vulnerabilities right now?"*

---

## 🚀 Quickstart

### Option 1: Full Stack via Docker Compose
```bash
docker-compose up -d
```

### Option 2: Manual Local Build
```bash
# 1. Start Infrastructure
docker run -d --name warden-postgres -p 5432:5432 -e POSTGRES_USER=warden -e POSTGRES_PASSWORD=wardenpass -e POSTGRES_DB=wardendb postgres:16-alpine
docker run -d --name warden-redis -p 6379:6379 redis:alpine

# 2. Run Admin API Service
go run cmd/admin-api/main.go

# 3. Run Vulnerability Scanner
go run cmd/warden/main.go -scan ./dummy-bola-api.json -target http://localhost:8081 -persist-db

# 4. Build MCP AI Server
go build -o warden-mcp.exe ./mcp-server
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
