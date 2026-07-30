<div align="center">

# 🛡️ WARDEN

### Concurrent API Security Gateway, Active Vulnerability Scanner & Admin API

**Built in Go. Designed to catch the exact vulnerability class most APIs ship with by accident.**

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Gin Framework](https://img.shields.io/badge/Gin_Framework-008080?style=for-the-badge&logo=gin&logoColor=white)](https://gin-gonic.com/)
[![GORM](https://img.shields.io/badge/GORM-PostgreSQL-0064a5?style=for-the-badge&logo=postgresql&logoColor=white)](https://gorm.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

[Features](#-what-warden-actually-does) • [Architecture](#-system-architecture) • [Admin API](#-admin-api-service-port-8082) • [Dashboard Showcase](#-dashboard-showcase) • [Quickstart](#-quickstart) • [Benchmarks](#-benchmarks)

</div>

---

## 🧠 Why Warden Exists

Most API gateways handle routing, rate limiting, and auth. Almost none of them actually **look for the vulnerability classes that quietly slip past code review** — Broken Object-Level Authorization (BOLA/IDOR), missing auth on endpoints nobody remembered to lock down, SSRF via user-supplied URLs, and injection patterns that a WAF should catch before they ever reach your application code.

I found a live IDOR vulnerability in one of my own projects during a manual security audit — a bug where one authenticated user could reach another user's private data just by changing an ID in a request. Fixing it by hand taught me exactly what that vulnerability class looks like on the wire. Warden is what happens when you take that specific lesson and build software that watches for it automatically, in real time, on every request that passes through.

This isn't a rate limiter tutorial with security bolted on for buzzword coverage. The security engine — WAF pattern matching, SSRF defense, BOLA detection, the standalone OpenAPI vulnerability scanner, and the Gin/GORM Admin API — is the actual point of the project.

---

## ⚙️ What Warden Actually Does

Warden operates in three modular execution layers:

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
- **Dual Persistence**: Exports `warden-report.json` and optionally pushes report findings directly into PostgreSQL via `-persist-db`.

<br />

### 3. Admin API REST Service (`cmd/admin-api`)
A standalone management service built with **Gin** and **GORM** (PostgreSQL) running on port `8082`:
- Query scan report history and filter findings by severity.
- Manage global WAF sensitivity modes (`permissive`, `balanced`, `strict`) and IP blocklists.
- Isolated from live gateway execution for zero latency overhead.

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
 ADMIN & PERSISTENCE LAYER (ISOLATED MANAGEMENT SERVICE)

┌──────────────────────┐                     ┌───────────────────────────┐
│ Warden Scanner CLI   ├────────────────────►│ PostgreSQL Database       │
│ (warden -scan)       │   Persist Report    │ (wardendb :5432)          │
└──────────────────────┘   (-persist-db)     └─────────────▲─────────────┘
                                                           │ GORM ORM
                                             ┌─────────────┴─────────────┐
                                             │ Warden Admin API          │
                                             │ (Gin REST Engine :8082)   │
                                             └───────────────────────────┘
```

---

## 🛠️ Admin API Service (Port 8082)

The Admin API exposes dedicated REST endpoints for querying database scan history and configuring gateway settings:

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Health** | `/health` | `GET` | Health check & PostgreSQL connection status |
| **Scan History** | `/api/scans` | `GET` | Paginated scan reports ordered by `generated_at desc` |
| **Scan Details** | `/api/scans/:id` | `GET` | Full scan report details with preloaded findings |
| **Findings** | `/api/findings` | `GET` | Filter findings across scans (e.g. `?severity=Critical`) |
| **Gateway Config** | `/api/config` | `GET`/`PUT` | Get or update WAF mode (`permissive`/`balanced`/`strict`) & rate limits |
| **IP Blocklist** | `/api/blocked-ips` | `GET`/`POST`/`DELETE` | List, add, or unblock IP addresses |

> For complete documentation, payload examples, and cURL commands, see [ADMIN_API.md](ADMIN_API.md).

---

## 📸 Dashboard Showcase

<div align="center">

### 🖥️ View 1: Real-time Live Telemetry & SOC Event Stream
<img src="./Demo/Screenshot%20(619).png" alt="Live Telemetry Dashboard" width="100%" />
<br /><br />

### 🔍 View 2: Vulnerability Scan Reports & Remediation Guidance
<img src="./Demo/Screenshot%20(621).png" alt="Live Telemetry Dashboard" width="100%" />
<br /><br />

### 🌐 View 3: Infrastructure Health & Animated Packet Topology
<img src="./Demo/Screenshot%20(622).png" alt="Live Telemetry Dashboard" width="100%" />
</div>

---

## 🚀 Quickstart

### 1. Launch Stack via Docker Compose

```bash
docker-compose up -d
```

Starts Warden Gateway (`:8080`), Admin API (`:8082`), Echo Backend (`:8081`), Redis (`:6379`), and PostgreSQL (`:5432`).

<br />

### 2. Run Active Scanner with DB Persistence

```bash
go run cmd/warden/main.go -scan ./dummy-bola-api.json -target http://localhost:8081 -persist-db
```

<br />

### 3. Run Benchmark Suite

```bash
bash scripts/benchmark.sh
```

---

## 📈 Performance Benchmarks

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
| **Admin API Service** | Gin Web Framework, GORM ORM |
| **Database** | PostgreSQL 16 (production), SQLite (in-memory test suite) |
| **Rate Limiting** | Redis (sliding-window token bucket, atomic Lua scripts) |
| **Auth** | Bearer JWT (HS256 signature validation) |
| **Scanner Parser** | `kin-openapi` (OpenAPI 3.0 resolution) |
| **Observability** | Prometheus client, structured metrics server (`:9090`) |
| **Dashboard UI** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
<i>Built by <a href="https://github.com/wayalbhushan">Bhushan Wayal</a> — Security engineer who builds the tools he wishes existed.</i>
</div>
