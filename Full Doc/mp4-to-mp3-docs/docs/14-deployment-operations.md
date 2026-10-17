# 14 — Deployment & Operations (Proposed)

## Local development
1. Copy `.env.example` to `.env` and fill in values.
2. Start dependencies and apps with Docker Compose.
3. Run database setup (indexes and optional admin seed).
4. Start the web app and the worker (the worker is a separate process or container).
5. Open the app and run a conversion with a small sample MP4.

Exact commands are produced in the README once the project exists; they must be tested, not guessed.

## Worker startup
The worker is started independently from the web app with its own entrypoint. It verifies on boot that FFmpeg and FFprobe are present and runnable, connects to Redis and MongoDB, and registers the BullMQ processor and cleanup schedules.

## Production
- Separate images for web and worker; non-root users.
- Worker container has CPU and memory limits and a writable temp volume with a size cap.
- Use object storage if web and worker run on different hosts.
- Terminate TLS in front of the app; enable HSTS.
- MongoDB and Redis are not publicly reachable.
- Secrets come from the platform's secret store.

## Monitoring (Proposed)
- Health: liveness and readiness endpoints (checking MongoDB, Redis, storage, FFmpeg presence).
- Metrics: queue depth, active jobs, failure rate, processing time, storage usage.
- Structured logs with request and job IDs; no sensitive data.
- Alerts: queue backlog, rising failure rate, low disk, failing cleanup tasks.

## Runbook (Proposed)

| Symptom | First checks |
|---------|--------------|
| Jobs stuck in `queued` | Worker running? Redis reachable? Concurrency set to zero? |
| Jobs stuck in `processing` | Watchdog active? Worker crash loops? Timeout value? |
| Disk filling | Cleanup tasks failing? Retention too long? Orphaned temp directories? |
| Many failures | Check error code distribution; recent FFmpeg image change? |
| Downloads return 410 | Expected after retention; confirm cleanup timing |

## Backups
Back up MongoDB. Media is temporary by design and is not backed up.
