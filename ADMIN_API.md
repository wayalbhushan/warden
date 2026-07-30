# Warden Admin API

The **Warden Admin API** is a standalone, high-performance RESTful management service built in Go using the **Gin** HTTP framework and **GORM** (backed by PostgreSQL). It provides a centralized persistence layer for querying vulnerability scan history, managing global gateway configurations, and tracking IP blocklists.

---

## 🏛️ Architecture Note

The Admin API runs completely independently of the main Warden API Gateway:
- **Zero Runtime Impact**: The main proxy gateway runs with ultra-low latency (<3.5ms overhead) without making blocking database calls on incoming client traffic.
- **Standalone Persistence**: The CLI scanner (`warden -scan`) optionally persists JSON scan reports directly into PostgreSQL when invoked with the `-persist-db` flag.
- **Management Layer**: Configuration endpoints (`GET/PUT /api/config`, `POST /api/blocked-ips`) serve as a persistent admin store that can be queried independently.

```
┌─────────────────────────┐          ┌───────────────────────────┐
│ Warden Scanner CLI      ├─────────►│ PostgreSQL Database       │
│ (warden -scan)          │          │ (wardendb:5432)           │
└─────────────────────────┘          └─────────────▲─────────────┘
                                                   │ GORM ORM
                                     ┌─────────────┴─────────────┐
                                     │ Warden Admin API          │
                                     │ (Gin REST Engine :8082)   │
                                     └───────────────────────────┘
```

---

## 🚀 Setup & Execution

### 1. Launch with Docker Compose

Start the full stack (Warden Gateway, Echo Backend Target, Redis, PostgreSQL, and Admin API):

```bash
docker-compose up -d
```

### 2. Run Active Scanner with Database Persistence

Run the active scanner against a target API spec and persist findings into PostgreSQL:

```bash
go run cmd/warden/main.go -scan ./dummy-bola-api.json -target http://localhost:8081 -persist-db
```

### 3. Run Standalone Admin API Service (Local Dev)

```bash
go run cmd/admin-api/main.go
```

---

## 📡 REST Endpoints Reference (Port 8082)

### 🏥 System Health
| Method | Endpoint | Description | Example Response |
|---|---|---|---|
| `GET` | `/health` | Health check for Admin API & DB status | `{"service":"warden-admin-api","status":"ok","db_connected":true}` |

### 🔍 Vulnerability Scans & Findings
| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/scans` | None | Returns all scan reports ordered by `generated_at desc` |
| `GET` | `/api/scans/:id` | None | Returns full scan report details with preloaded `Findings` (404 if not found) |
| `GET` | `/api/findings` | `severity` (optional) | Returns findings across all scans (e.g. `?severity=Critical`) |

### ⚙️ Gateway Configuration Management
| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `GET` | `/api/config` | None | Retrieves global gateway config (seeds default `balanced` mode if none exists) |
| `PUT` | `/api/config` | `{"waf_mode":"strict","rate_limit_rpm":200}` | Updates WAF mode (`permissive`, `balanced`, `strict`) & rate limit threshold (400 on invalid input) |

### ⛔ IP Blocklist Management
| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `GET` | `/api/blocked-ips` | None | Lists all explicitly banned IP addresses |
| `POST` | `/api/blocked-ips` | `{"ip":"192.168.1.100","reason":"DDoS bot"}` | Adds an IP to the blocklist (400 if empty or duplicate) |
| `DELETE` | `/api/blocked-ips/:id` | None | Unblocks an IP by ID (404 if ID not found) |

---

## 🧪 Testing

Run unit tests using Gin's testing framework and an in-memory SQLite database:

```bash
go test -v ./internal/adminapi/...
```
