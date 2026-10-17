# 01 — Architecture

## Components

| Component | Responsibility |
|-----------|----------------|
| **Web app (Next.js)** | UI, API routes, session handling, authorization, job creation |
| **Worker (Node + BullMQ)** | Consumes jobs, runs FFprobe/FFmpeg, writes outputs, updates job state |
| **MongoDB** | Users, jobs, settings, history, audit logs |
| **Redis** | BullMQ queues, rate-limit counters, short-lived locks |
| **Storage** | Private temporary disk volume or private object storage for uploads and outputs |
| **Scheduler/cleanup** | Retention enforcement and retry of failed deletions |

FFmpeg and FFprobe run **only** in the worker, never inside the web process.

## Data flow

1. Browser uploads an MP4 to the upload endpoint. The server validates it and stores it in private storage.
2. Server runs a lightweight validation, records an `upload` record, and returns an upload identifier.
3. Client creates a conversion job (bitrate, optional trim) with an idempotency key.
4. API persists the job as `queued` and enqueues a BullMQ job containing only the job ID.
5. Worker loads the job from MongoDB, probes the input, converts, probes the output, stores the MP3, and marks the job `completed` or `failed`.
6. Client polls (or subscribes to) status and shows progress.
7. On completion, the user previews and downloads through an authorized endpoint that streams the file.
8. The cleanup job deletes expired inputs and outputs and retries any failed deletions.

The queue payload carries identifiers only. The worker reads everything else from MongoDB, so queue data can never be used to inject paths or flags.

## Storage design

- Storage sits behind an interface (`put`, `get`/stream, `delete`, `exists`) with a local-disk implementation and an object-storage implementation.
- Storage keys are generated server-side (random IDs). Client filenames are stored only as sanitized display names.
- Internal storage paths and keys are never returned in API responses.
- Uploaded input is removed as soon as conversion finishes, unless a retry is still possible (see retention in the Security document).

## Docker topology

| Service | Notes |
|---------|-------|
| `web` | Next.js app |
| `worker` | Same codebase, separate entrypoint, FFmpeg installed, resource limits set |
| `mongo` | MongoDB with a named volume |
| `redis` | Redis with persistence appropriate to queue durability |
| `storage` volume | Shared between web and worker in local development |

Production guidance: run worker and web as separate deployments so the worker can be scaled and resource-limited independently. When they run on different hosts, use object storage instead of a shared volume.

## Scaling and resilience (Proposed)

- Scale workers horizontally; concurrency per worker is a configured limit.
- BullMQ stalled-job detection must recover jobs from crashed workers.
- All state changes go through a single job service so transitions are validated in one place.
