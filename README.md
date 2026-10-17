# MP4 to MP3 Converter

Production-quality MP4-to-MP3 converter built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **BullMQ**, **Redis**, **MongoDB/Mongoose**, and **FFmpeg**.

---

## Architecture Overview

- **Web Application (`Next.js`)**: Interactive dark-themed UI, upload streaming endpoint, conversion scheduling with idempotency keys, real-time polling, and authorized audio streaming/download endpoints.
- **Queue Engine (`BullMQ + Redis`)**: Background task orchestration ensuring FFmpeg runs exclusively in isolated workers, never in the web process. Payloads carry only job identifiers.
- **Worker Engine (`Node/Bun + FFmpeg + FFprobe`)**: Consumes jobs from Redis, probes input files for audio streams and duration limits, extracts audio tracks using `libmp3lame` at the selected bitrate (96, 128, 192, 256, 320 kbps), post-probes output integrity, and updates job state atomically.
- **Database (`MongoDB + Mongoose`)**: Typed schemas and indexes for `Upload` and `ConversionJob` records, idempotency constraints, and 24-hour retention sweeps.
- **Storage Layer**: Pluggable storage abstraction with path-traversal prevention for private local storage and future S3/MinIO drivers.

---

## Prerequisites

- [Bun](https://bun.sh/) (v1.2+)
- [Docker](https://www.docker.com/) (for MongoDB & Redis) or local MongoDB & Redis instances
- [FFmpeg](https://ffmpeg.org/) (bundled automatically via `@ffmpeg-installer` or system executable)

---

## Local Setup & Quick Start

### 1. Clone & Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Start Database & Redis Services
Using Docker Compose:
```bash
docker compose up -d mongo redis
```

### 4. Start the Background Worker
In a dedicated terminal:
```bash
bun run worker
```

### 5. Start the Web Application
In another terminal:
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests & Type Checks

### Run Unit & Integration Tests
```bash
bun test
```

### Run TypeScript Type Check
```bash
bun run typecheck
```

### Run Production Build
```bash
bun run build
```

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/uploads` | `POST` | Multipart upload with streaming validation and pre-probe. |
| `/api/conversions` | `POST` | Enqueues conversion job in BullMQ with idempotency support. |
| `/api/conversions/:id` | `GET` | Returns real-time job status and progress. |
| `/api/conversions/:id/preview` | `GET` | Streams MP3 for in-browser audio preview. |
| `/api/conversions/:id/download` | `GET` | Authorized attachment download with sanitized filename. |
| `/api/conversions/:id/cancel` | `POST` | Cancels queued or in-flight conversion. |
| `/api/health` | `GET` | Liveness probe. |
| `/api/health/ready` | `GET` | Readiness probe checking MongoDB and Redis connections. |

---

## Docker Deployment

To build and start all containers (MongoDB, Redis, Web App, Worker) in production:
```bash
docker compose up --build -d
```
