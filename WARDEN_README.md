<div align="center">

# 🛡️ WARDEN

### A Concurrent API Security Gateway with Active Vulnerability Scanning

**Built in Go. Designed to catch the exact vulnerability class most APIs ship with by accident.**

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Architecture](#-architecture) • [Quickstart](#-quickstart) • [Scanner](#-active-vulnerability-scanner) • [Dashboard](#-dashboard) • [Benchmarks](#-benchmarks)

</div>

---

## 🧠 Why Warden Exists

Most API gateways handle routing, rate limiting, and auth. Almost none of them actually **look for the vulnerability classes that quietly slip past code review** — Broken Object-Level Authorization (BOLA/IDOR), missing auth on endpoints nobody remembered to lock down, SSRF via user-supplied URLs, and injection patterns that a WAF should catch before they ever reach your application code.

I found a live IDOR vulnerability in one of my own projects during a manual security audit — a bug where one authenticated user could reach another user's private data just by changing an ID in a request. Fixing it by hand taught me exactly what that vulnerability class looks like on the wire. Warden is what happens when you take that specific lesson and build software that watches for it automatically, in real time, on every request that passes through.

This isn't a rate limiter tutorial with security bolted on for buzzword coverage. The security engine — WAF pattern matching, SSRF defense, BOLA detection, and the standalone OpenAPI vulnerability scanner — is the actual point of the project. The gateway plumbing exists to give that engine somewhere to live.

---

## ⚙️ What Warden Actually Does

Warden runs in two modes:

### 1. Inline Reverse Proxy Gateway
Sits between clients and an upstream backend service, and every request passes through a layered defensive pipeline before it's allowed to reach your application:

```
Client Request
      │
      ▼
┌─────────────────────────────────────────┐
│ Metrics Middleware                       │  → timing + Prometheus counters
├─────────────────────────────────────────┤
│ Rate Limiter (Redis token bucket)        │  → HTTP 429 on burst traffic
├─────────────────────────────────────────┤
│ JWT / Auth Middleware                    │  → HS256 signature validation
├─────────────────────────────────────────┤
│ Security Engine                          │  → WAF + SSRF + BOLA inspection
├─────────────────────────────────────────┤
│ Reverse Proxy → Upstream Backend         │
└─────────────────────────────────────────┘
```

**The Security Engine specifically checks for:**
- **SQL / NoSQL / Command Injection** — signature-based pattern matching against known payload shapes (`OR 1=1`, `UNION SELECT`, `$where`, shell chaining operators, and more)
- **SSRF (Server-Side Request Forgery)** — resolves outbound-facing URLs and blocks anything pointing at RFC 1918 private ranges, loopback addresses, or cloud metadata endpoints (`169.254.169.254`)
- **BOLA / IDOR** — tracks resource ownership in Redis and rejects any request where an authenticated user attempts to touch a resource that isn't theirs

### 2. Active OpenAPI Vulnerability Scanner
A standalone CLI mode that takes an OpenAPI spec and an actual target API, and **tests it for real**:

```bash
warden -scan -spec ./api-spec.json -target http://localhost:8081
```

- Parses every documented endpoint
- Fires real unauthenticated requests at protected-looking endpoints to check if auth is actually enforced
- Spins up two real test accounts, has one create a resource, then attempts to access it as the other — the exact BOLA/IDOR test I used to run by hand
- Bursts requests at each endpoint to confirm rate limiting is actually active, not just configured

Findings are written to a structured JSON report with severity ratings, so results can feed straight into a CI pipeline or a security review.

---

## 🏗️ Architecture

```
Warden/
├── cmd/
│   ├── warden/          # Gateway entrypoint + scanner CLI
│   ├── echo-server/      # Mock upstream target for local testing
│   └── tokengen/         # JWT generation helper for local dev
├── internal/
│   ├── security/         # WAF, SSRF engine, BOLA inspector
│   ├── ratelimit/         # Redis-backed token bucket limiter
│   ├── auth/              # JWT validation middleware
│   ├── observability/     # Prometheus metrics + timing middleware
│   └── scanner/           # OpenAPI parser + active scan engines
├── scripts/                # Load testing & benchmarking scripts
├── dashboard/              # Next.js observability & scan-report UI
└── go.mod
```

Every component above the `dashboard/` line is real, tested Go code with real network behavior — real HTTP requests, real Redis state, real JWT verification.

---

## 📊 Dashboard

Warden ships with a Next.js Security Operations Center–style dashboard for visualizing gateway activity and scan results.

**One honest note on the dashboard:** the "Attack Surge" and "Scan Simulation" views are intentionally built as **illustrative demo modes**, not a live production monitoring surface. They exist to make the *shape* of Warden's telemetry and scan output legible at a glance in a walkthrough or demo — the numbers and event streams in those specific views are generated for presentation, not pulled from a live attack against the gateway. Real metrics (throughput, latency, block counts) are exposed continuously by Warden itself at `:9090/metrics` and can be scraped by any real Prometheus instance or wired into the dashboard's live telemetry view for genuine monitoring.

<div align="center">
<!-- 📸 ADD SCREENSHOT: Dashboard home / live telemetry view -->
<em>[ Screenshot: Live Telemetry Dashboard ]</em>
</div>

<div align="center">
<!-- 📸 ADD SCREENSHOT: Vulnerability scan results page -->
<em>[ Screenshot: Vulnerability Scan Report View ]</em>
</div>

<div align="center">
<!-- 📸 ADD SCREENSHOT: Infrastructure / packet topology view -->
<em>[ Screenshot: Infrastructure Topology View ]</em>
</div>

**Dashboard views:**
- **Live Telemetry** — real-time request throughput, latency, and threat-block counters
- **Vulnerability Scans** — severity-filterable findings with remediation code snippets for each vulnerability class
- **Infrastructure Topology** — visual map of the gateway, Redis, and upstream backend with per-node diagnostics

---

## 🚀 Quickstart

```bash
# 1. Start the mock upstream backend
go run cmd/echo-server/main.go

# 2. Start the Warden gateway
go run cmd/warden/main.go

# 3. (Optional) Start the dashboard
cd dashboard && npm run dev
```

### Run the vulnerability scanner against a target

```bash
go run cmd/warden/main.go -scan -spec ./api-spec.json -target http://localhost:8081
```

### Run the load benchmark

```bash
bash scripts/benchmark.sh
```

---

## 📈 Benchmarks

Warden's gateway overhead is measured using [`hey`](https://github.com/rakyll/hey) against the mock upstream, comparing direct backend access to traffic routed through the full security pipeline (WAF + SSRF checks + BOLA inspection + JWT validation + Redis rate limiting).

*Results below are measured locally and will vary by hardware — reproduce with `scripts/benchmark.sh` against your own environment.*

| Scenario | Requests | Concurrency | Throughput | Avg Latency |
|---|---|---|---|---|
| Direct backend (no gateway) | 10,000 | 100 | — | — |
| Through Warden (full pipeline) | 10,000 | 100 | — | — |

*(Fill in with your own measured numbers after running `scripts/benchmark.sh` — see note below.)*

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Core Gateway | Go 1.22+, `net/http/httputil` |
| Rate Limiting | Redis (token bucket, atomic scripts) |
| Auth | JWT (HS256) |
| Scanner | `kin-openapi` for OpenAPI 3.0 parsing |
| Observability | Prometheus client, structured logging |
| Dashboard | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Testing | Go's native testing package, integration tests for rate limiter and observability |

---

## 🗺️ Roadmap

- [ ] Expand WAF signature set with configurable custom rules
- [ ] Add gRPC support alongside HTTP
- [ ] Distributed tracing (OpenTelemetry) across the middleware chain
- [ ] Kubernetes deployment manifests

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
<i>Built by <a href="https://github.com/wayalbhushan">Bhushan Wayal</a> — security engineer who builds the tools he wishes existed.</i>
</div>
