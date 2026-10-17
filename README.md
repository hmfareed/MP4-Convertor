# MP4 to MP3 Converter

A production-grade, privacy-conscious MP4-to-MP3 converter built with **Next.js App Router (14.2)**, **TypeScript**, **Tailwind CSS**, **BullMQ**, **Redis**, **MongoDB/Mongoose**, and an isolated **FFmpeg/FFprobe** media engine.

---

## 🌟 Key Features

- **Intuitive Dark UI**: Responsive, accessible interface styled with Tailwind CSS, custom purple-blue gradients, Lucide icons, and Radix UI primitives.
- **Background Conversion Engine**: FFmpeg and FFprobe run exclusively in an isolated background worker process with safe argument arrays (`shell: false`). The web process never executes transcode processes.
- **Audio Trimming**: Interactive dual-handle range controls allowing users to extract and encode custom audio segments (`-ss` and `-t` fast-seeking).
- **Guest & User Conversion History**: Anonymous guests can convert and download immediately. When registering or logging in, all guest conversions automatically claim and transfer to the persistent user account.
- **Live Conversions Dashboard**: Dynamic dashboard with search, status filters (queued, processing, completed, failed, cancelled, expired), audio player previews, and direct downloads.
- **Admin Dashboard**: Comprehensive monitoring dashboard with real-time BullMQ queue metrics, throughput and failure counters, storage usage, job inspection, and user management.
- **Automated Retention & Privacy Cleanup**: Inputs are deleted on completion or after 1 hour grace; outputs expire after 24 hours (guests) or up to 7 days (registered users). Expired storage keys are cleaned by the background worker with exponential retry backoff.
- **Distributed Rate Limiting**: Redis-backed sliding-window rate limiters safeguarding uploads, conversions, logins, and registrations against brute force and abuse.
- **Strict Security Headers**: Hardened with Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options (`nosniff`), X-Frame-Options (`DENY`), and Referrer-Policy.

---

## 🏗️ Architecture & Processing Flow

```
[ Client Browser ]
        │
        ├── 1. POST /api/uploads (streaming upload & pre-probe)
        ├── 2. POST /api/conversions (idempotency key & enqueue)
        │
[ Next.js API Routes ] ─── Enqueue Job ───> [ Redis / BullMQ ]
        │                                           │
        ├── Persist Metadata                        ├── Consume Job
        ▼                                           ▼
[ MongoDB Atlas / Mongoose ]               [ Worker Engine (FFmpeg) ]
        ▲                                           │
        │                                           ├── Probe input streams
        └── Update Atomic State <───────────────────├── Transcode / Trim (libmp3lame)
            (queued -> processing -> completed)     ├── Post-probe output MP3
                                                    └── Write to Storage
```

---

## 📋 Prerequisites

- **[Bun](https://bun.sh/)** (v1.2+)
- **Redis** (v6.0+ or taizod1024.redis-windows-fork for Windows)
- **MongoDB** (v6.0+ local or MongoDB Atlas)
- **FFmpeg & FFprobe** (installed via `@ffmpeg-installer` / `@ffprobe-installer` or system PATH)

---

## 🚀 Local Setup & Quick Start

### 1. Clone & Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains valid connection strings:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/mp4tomp3?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379
JWT_SECRET=super_secure_jwt_secret_at_least_32_characters_long!
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./data/storage
WORKER_CONCURRENCY=2
```

### 3. Start Redis Server
```bash
# Windows
& "path\to\redis-server.exe"

# Linux / macOS
redis-server
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

## 🛡️ Admin Setup & Promotion

To promote an existing user account to `admin`:
```bash
bun run scripts/promote-admin.ts user@example.com
```
Once promoted, the **Admin Dashboard** is accessible at `/admin` or via the user avatar dropdown menu in the navigation bar.

---

## 🧪 Testing & Verification

The project includes an automated test suite verifying state machines, media conversion, security boundaries, rate limiters, and retention cleaners:

```bash
# Run all tests (28 tests across 7 test suites)
bun test

# Run TypeScript compiler verification
bun run typecheck

# Run production build optimization
bun run build
```

---

## 📡 API Reference

### Conversions & Media
| Endpoint | Method | Rate Limit | Description |
| :--- | :--- | :--- | :--- |
| `/api/uploads` | `POST` | 25 req / 10 min | Streams video upload, probes audio streams, saves to private storage. |
| `/api/conversions` | `POST` | 30 req / 10 min | Creates conversion job in MongoDB and enqueues task in BullMQ. |
| `/api/conversions/:id` | `GET` | 120 req / 1 min | Returns real-time status, progress percent, and error details. |
| `/api/conversions/:id/preview` | `GET` | 60 req / 1 min | Streams output MP3 for in-browser playback. |
| `/api/conversions/:id/download` | `GET` | 60 req / 1 min | Authorized attachment download with sanitized filename. |
| `/api/conversions/:id/retry` | `POST` | 10 req / 5 min | Retries a previously failed conversion job. |
| `/api/conversions/:id/cancel` | `POST` | 20 req / 5 min | Cancels a queued or in-flight conversion job. |

### Authentication
| Endpoint | Method | Rate Limit | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | 5 req / 10 min | Creates user account with bcrypt hashing and auto-claims guest conversions. |
| `/api/auth/login` | `POST` | 10 req / 5 min | Authenticates credentials and issues `httpOnly` JWT session cookie. |
| `/api/auth/logout` | `POST` | Standard | Clears session cookie and invalidates user session. |
| `/api/auth/me` | `GET` | Standard | Returns currently authenticated user profile and role. |

### Administration (Role: `admin` Required)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/admin/metrics` | `GET` | Real-time queue metrics, job status aggregates, and storage utilization. |
| `/api/admin/jobs` | `GET` | Paginated search, status filtering, and inspection of all system jobs. |
| `/api/admin/users` | `GET` | User listing with conversion volume metrics and registration dates. |
| `/api/admin/users` | `PATCH` | Updates user status (`active`, `suspended`) and role (`user`, `admin`). |

### Health & Monitoring
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Basic liveness probe. |
| `/api/health/ready` | `GET` | Readiness probe confirming MongoDB Atlas and Redis availability. |

---

## 🔒 Security & Privacy Implementation Details

1. **Path Traversal Protection**: Storage keys are generated as random UUIDs (`upload_<uuid>.mp4`). All paths are resolved and validated against root storage directories using `path.resolve` and strict prefix guards.
2. **Safe FFmpeg Invocations**: FFmpeg and FFprobe are spawned directly using argument arrays with `shell: false`. No user-supplied parameters are ever interpolated into shell commands.
3. **Session Cookies**: Authentication tokens are signed with HS256 JWTs using `jose` and delivered via `httpOnly`, `sameSite: lax`, and `secure` cookies.
4. **Automated Cleanup**: The background worker runs a continuous retention loop every 5 minutes:
   - Purges uploaded MP4s after conversion completion or after a 1-hour grace window.
   - Transitions completed conversion jobs to `expired` once their retention window elapses, unlinking MP3 files from storage.
   - Retries failed file unlinks with exponential backoff via `CleanupTask` records.
5. **Rate Limiting**: Sliding-window rate limiters powered by Redis sorted sets (ZSET) fail open gracefully if Redis suffers a temporary degradation, ensuring zero downtime.

---

## ⚠️ Known Limitations

- **Single Storage Backend**: Currently configured for local filesystem storage (`LocalStorageService`). While abstracted behind the `StorageService` interface, S3/MinIO cloud storage drivers can be plugged in for multi-node deployments.
- **Audio Format Scope**: Specifically optimized for MP4 video inputs to MP3 audio outputs. Other input containers (e.g. MKV, AVI) or output formats (e.g. WAV, AAC) are reserved for future expansion.
