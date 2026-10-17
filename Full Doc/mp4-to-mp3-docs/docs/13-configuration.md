# 13 — Configuration (Proposed)

All configuration comes from environment variables, validated at startup. Missing or invalid values stop the process with a clear message.

## Environment variables

| Variable | Purpose | Example default |
|----------|---------|-----------------|
| `NODE_ENV` | Runtime mode | `development` |
| `APP_URL` | Public base URL | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection | `mongodb://mongo:27017/mp4tomp3` |
| `REDIS_URL` | Redis connection | `redis://redis:6379` |
| `SESSION_SECRET` | Session signing (generate; never commit) | placeholder |
| `STORAGE_DRIVER` | `local` or `s3` | `local` |
| `STORAGE_LOCAL_PATH` | Private storage root | `/data/storage` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Object storage | placeholders |
| `FFMPEG_PATH`, `FFPROBE_PATH` | Binary locations | `ffmpeg`, `ffprobe` |
| `MAX_UPLOAD_BYTES` | Upload size limit | `524288000` (500 MB) |
| `MAX_DURATION_SECONDS` | Media duration limit | `3600` |
| `CONVERSION_TIMEOUT_SECONDS` | Process timeout | `900` |
| `WORKER_CONCURRENCY` | Parallel jobs per worker | `2` |
| `FFMPEG_THREADS` | Threads per process | `2` |
| `DEFAULT_BITRATE_KBPS` | Default bitrate | `192` |
| `GUEST_RETENTION_HOURS` | Guest output lifetime | `24` |
| `USER_RETENTION_HOURS` | Registered output lifetime | `168` |
| `INPUT_RETENTION_MINUTES` | Leftover input lifetime | `60` |
| `RATE_LIMIT_*` | Per-bucket limits | see code |
| `SMTP_*` or email provider keys | Password-reset email | placeholders |
| `ADMIN_SEED_EMAIL` | Initial admin bootstrap | placeholder |

The numeric defaults are suggestions; confirm them in the Open Questions document.

## Limits summary (the brief requires all of these to be enforced)
Upload size, media duration, process timeout, CPU, memory, disk and concurrency.

## `.env.example`
Contains every variable above with placeholder values and a comment each. It must never contain real secrets.
