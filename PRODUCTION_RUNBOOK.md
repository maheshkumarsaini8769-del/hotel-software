# SpiceHub Enterprise Hospitality Platform — Production Runbook

**Document Version:** 1.0.0  
**Target Environment:** Production Cloud & On-Premises Hotel Appliance  
**Engine:** SpiceHub Multi-Tenant Node.js / Express Core Engine (:5000)  
**Database:** MongoDB 7.0+ Replica Set (`rs0`) & Redis 7.2+ In-Memory Cache  

---

## 1. System Architecture & Port Mapping

SpiceHub operates as an enterprise-grade multi-tenant hospitality ERP and POS engine with 8 dedicated frontends isolated by portal gate middlewares:

| Portal ID | Application Name | Port | Primary User Role | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Customer Table App** | `:3001` | In-Restaurant Diner | Camera QR scanner, Live digital menu, Cart with GST, Table order placement, Call Waiter |
| **02** | **Waiter Mobile App** | `:3002` | Floor Captain / Steward | PIN login, Table matrix, Punch KOT, Offline order queue auto-sync, Hindi/English toggle |
| **03** | **Kitchen KDS App** | `:3003` | Executive Chef / Line Cook | 3-Column board (Placed, Preparing, Ready), Audio buzzer alerts, 80mm thermal KOT print, 86 toggle |
| **04** | **Guest In-Room Portal** | `:3004` | Hotel Room Resident | Resident KYC check, In-room dining, Housekeeping/amenity concierge, Running folio bill, Express checkout |
| **05** | **Hotel Admin ERP** | `:3005` | General Manager / Ops Lead | RevPAR & ADR KPI analytics, PMS room matrix, Staff PIN manager, 86 stock toggle, Daily Z-Report |
| **06** | **Super Admin SaaS** | `:3006` | Platform Owner / SaaS Admin | Tenant provisioning, Subscription billing, White-label live branding (Hex color & logo), System logs |
| **07** | **Cashier POS** | `:3007` | Head Cashier | Dine-in billing, 5% GST computation, Multi-tender payment (Cash/UPI/Card), Cash clamping & change due, Shift float close |
| **08** | **Reception Front Desk** | `:3008` | Front Desk Clerk / Concierge | Walk-in check-in, Digital KYC, Room status matrix (Clean/Dirty/Occupied), Guest folios, Settle & Checkout |
| **API** | **Central Backend Engine**| `:5000` | Microservices / Core API | Multi-tenant auth, Socket.IO rooms, Sentry observability, Winston structured logs, Dynamic pricing |

---

## 2. Health Checks, Uptime & SLA Monitoring

### 2.1 Deep Health Endpoint
The core engine exposes a deep health endpoint monitored continuously by uptime probes (e.g. Prometheus, Datadog, AWS Route53, or Uptime Kuma):
- **URL:** `GET /api/v1/health` (also aliased at `GET /health`)
- **Success Criteria:** HTTP 200 with `status: "UP"` and `database.status: "CONNECTED"`
- **Failure Code:** HTTP 503 Service Unavailable if MongoDB replica set is unreachable

#### Sample Health Payload:
```json
{
  "status": "UP",
  "uptime": "14280s",
  "uptimeSeconds": 14280,
  "timestamp": "2026-10-27T07:00:00.000Z",
  "database": {
    "status": "CONNECTED",
    "readyState": 1,
    "host": "localhost",
    "name": "spicehub_dev"
  },
  "memoryUsage": {
    "rss": "180MB",
    "heapTotal": "87MB",
    "heapUsed": "63MB",
    "external": "22MB"
  },
  "environment": "production",
  "service": "SpiceHub Enterprise Core Engine",
  "version": "1.0.0"
}
```

### 2.2 Uptime Verification Command
```bash
curl -f -s http://localhost:5000/api/v1/health | jq .
```

---

## 3. High-Concurrency Performance & Stress Test SLA

SpiceHub has been rigorously benchmarked under a 100-user concurrent traffic jam test for 60 seconds with 0% error rate:

| Metric | Target SLA | Benchmark Result | Status |
| :--- | :--- | :--- | :--- |
| **Total Requests** | > 10,000 req | **16,682 requests** | ✅ PASS |
| **Throughput (Average RPS)**| > 150 req/s | **275.04 req/sec** | ✅ PASS |
| **Throughput (Peak RPS)** | > 200 req/s | **305 req/sec** | ✅ PASS |
| **Error Rate** | **0.00%** | **0.00% (0 errors)**| ✅ PASS |
| **Median Latency (p50)** | < 150ms | **65ms** | ✅ PASS |
| **90th Percentile (p90)** | < 400ms | **301ms** | ✅ PASS |
| **95th Percentile (p95)** | **< 500ms** | **348ms** | ✅ PASS |
| **99th Percentile (p99)** | < 1000ms | **467ms** | ✅ PASS |

To re-run the stress test at any time:
```bash
npm run test:load
```

---

## 4. Security Hardening & Rate Limiting

### 4.1 Helmet.js & CSP Configuration
- **Server Identity Masking:** `X-Powered-By` header is strictly disabled (`app.disable('x-powered-by')`).
- **Content Security Policy (CSP):** Strict directives enforced for script, style, font, image, and frame origins. Razorpay checkout scripts (`https://checkout.razorpay.com`) and frame ancestors are whitelisted.
- **Clickjacking Defense:** `X-Frame-Options: SAMEORIGIN` and `frameguard: { action: 'sameorigin' }`.
- **MIME Sniffing Prevention:** `X-Content-Type-Options: nosniff`.
- **HSTS Enforcement:** `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

### 4.2 Brute-Force Rate Limiting
- **Login Endpoint:** `/api/v1/auth/login` is governed by `express-rate-limit`.
- **Policy:** Maximum 10 requests per minute per IP.
- **Breach Response:** HTTP 429 Too Many Requests with JSON payload:
  ```json
  {
    "success": false,
    "message": "Too many login attempts from this IP. Please wait 60 seconds before trying again.",
    "retryAfterSeconds": 60
  }
  ```

### 4.3 CORS Domain Whitelisting
In production, only domains ending in `.spicehub.in` or explicitly declared in `ALLOWED_ORIGINS` are accepted. Unknown cross-origin preflight requests are rejected with a CORS policy violation error.

---

## 5. Automated Database Backup & Disaster Recovery

### 5.1 Backup Script (`scripts/backup_db.sh`)
Automated MongoDB dump with gzip compression and 7-day retention rotation:
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/spicehub}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/spicehub_dev?replicaSet=rs0}"
DB_NAME="${DB_NAME:-spicehub_dev}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/spicehub_backup_${TIMESTAMP}.gz"

# Dump using mongodump or running docker container
if command -v mongodump >/dev/null 2>&1; then
  mongodump --uri="${MONGO_URI}" --gzip --archive="${BACKUP_FILE}"
elif docker ps --format '{{.Names}}' | grep -q "spicehub_mongodb"; then
  docker exec spicehub_mongodb mongodump --db="${DB_NAME}" --gzip --archive > "${BACKUP_FILE}"
fi

# Prune archives older than 7 days
find "${BACKUP_DIR}" -name "spicehub_backup_*.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;
```

### 5.2 Daily 2:00 AM Cron Installation
Install the backup cron on the production server via `crontab -e`:
```cron
# SpiceHub Production Automated DB Backup at 02:00 AM Daily
0 2 * * * /home/mahesh/Documents/Hotel-Software/scripts/backup_db.sh >> /var/log/spicehub_backup_cron.log 2>&1
```

### 5.3 Point-In-Time Restoration Procedure
To restore a snapshot in the event of hardware failure or data corruption:
```bash
# 1. Stop backend engine
pkill -f "dist/index.js"

# 2. Restore archive into MongoDB
mongorestore --uri="mongodb://localhost:27017/spicehub_dev?replicaSet=rs0" --gzip --archive="/var/backups/spicehub/spicehub_backup_YYYYMMDD_HHMMSS.gz" --drop

# 3. Restart backend engine
npm run build:backend && nohup node backend/dist/index.js >> /var/log/spicehub-api.log 2>&1 &
```

---

## 6. Observability, Sentry & Structured Logging

### 6.1 Sentry Error Tracking
- **Backend:** `@sentry/node` initialized with Express error handling middleware (`Sentry.setupExpressErrorHandler(app)`). All unhandled 500 exceptions, stack traces, and tenant contexts are relayed to Sentry.
- **Frontend:** `@spicehub/ui` `ErrorBoundary` intercepts render errors, renders an actionable recovery card, and transmits component stack traces to `window.Sentry`.

### 6.2 Structured JSON Logging with Winston
Every HTTP request and system error is formatted as structured JSON:
```json
{
  "timestamp": "2026-10-27T12:20:00.123+05:30",
  "level": "info",
  "message": "POST /api/v1/pos/orders/place 201 - 42ms",
  "tenantId": "6adee647ebfd129c1d4b0a94",
  "method": "POST",
  "url": "/api/v1/pos/orders/place",
  "statusCode": 201,
  "durationMs": 42,
  "ip": "192.168.1.45",
  "userAgent": "SpiceHub-Waiter-Android/1.0"
}
```

---

## 7. Incident Response & Emergency Playbooks

### Playbook 1: High CPU / Event Loop Congestion
1. Check CPU and memory usage:
   ```bash
   top -p $(pgrep -f "dist/index.js")
   ```
2. Verify deep health memory stats:
   ```bash
   curl -s http://localhost:5000/api/v1/health | jq .memoryUsage
   ```
3. Restart process gracefully using Node cluster or systemd:
   ```bash
   kill -TERM $(pgrep -f "dist/index.js")
   ```

### Playbook 2: MongoDB Replica Set Failover
1. Verify replica set status:
   ```bash
   mongosh --eval "rs.status()"
   ```
2. If primary node stepped down, election will promote secondary in <3 seconds.
3. Backend Mongoose driver will automatically reconnect to the new primary.

### Playbook 3: Secret Rotation (JWT Secret / Razorpay Keys)
1. Update `.env` with new keys:
   ```bash
   JWT_SECRET="new_secure_jwt_secret_token_here"
   RAZORPAY_KEY_SECRET="new_razorpay_secret_here"
   ```
2. Hot restart backend engine. Existing active JWT tokens will expire at their normal TTL; users re-authenticate seamlessly via PIN pad.

---

## 8. Handover Sign-Off Checklist

- [x] All 8 portal frontends running on ports `:3001` - `:3008`
- [x] Express rate limiting active on `/api/v1/auth/login` (max 10 req/min)
- [x] Sentry error tracking integrated in backend and frontend error boundaries
- [x] Structured JSON logging active with Winston
- [x] Helmet security headers & CSP active; `X-Powered-By` hidden
- [x] Deep `/api/v1/health` endpoint returning database and memory status
- [x] Automated MongoDB backup script executable and cron documented
- [x] 100-user stress test passing with 0.00% error rate and p95 < 500ms
