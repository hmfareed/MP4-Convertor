# 11 — Implementation Phases (Proposed)

The brief asks for phase-by-phase delivery with the conversion pipeline first. Each phase lists a goal, scope and explicit out-of-scope guards so work does not sprawl.

## Phase 1 — Foundation
**Goal:** Running skeleton with all services starting.
**Scope:** Next.js + TypeScript + Tailwind project, lint/format/typecheck tooling, config validation, MongoDB and Redis connections, Docker Compose, health endpoints, base error format.
**Out of scope:** auth, uploads, conversion, UI beyond a placeholder page.

## Phase 2 — Core conversion pipeline
**Goal:** A guest can upload an MP4 and download an MP3 end to end.
**Scope:** Storage interface, upload endpoint with streaming validation, FFprobe validation, job model and state machine, BullMQ queue, worker with FFmpeg conversion and output verification, status endpoint, authorized download, timeouts and limits, cleanup basics.
**Out of scope:** accounts, history UI, admin, trimming, polished design.

## Phase 3 — Converter UI
**Goal:** Polished converter experience.
**Scope:** Dropzone, file card, settings panel, bitrate selection, upload and conversion progress, queue status, result card, audio player, download button, all UI states, accessibility basics.
**Out of scope:** accounts, admin.

## Phase 4 — Accounts
**Goal:** Registered users with history.
**Scope:** Registration, login, sessions, password reset, user settings, history table, deletion, account deletion, ownership enforcement for users and guests.
**Out of scope:** admin dashboard.

## Phase 5 — Job controls and trimming
**Scope:** Retry, cancellation, idempotency hardening, optional audio trimming, watchdog for stuck jobs.

## Phase 6 — Admin dashboard
**Scope:** Admin role, volume, success/failure counts, processing times, queue health, storage health, job-management tools, audit logging.

## Phase 7 — Hardening and privacy
**Scope:** Rate limiting everywhere, security headers, retention enforcement, cleanup retries, resource limits, dependency audit.

## Phase 8 — Quality and documentation
**Scope:** Complete the unit, integration and E2E suites, final README, deployment documentation, startup instructions, and honest limitations list.

## Phase gate
Each phase ends with the completion report from the Implementation Rules before the next begins.
