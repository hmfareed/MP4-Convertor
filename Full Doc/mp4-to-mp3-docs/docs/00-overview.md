# 00 — Overview

## Primary objective

Build a polished website where users can upload MP4 videos, configure audio settings, convert the audio into MP3 files, monitor progress and download the result.

The site must have working frontend and backend implementations. It must not be a static mockup, and production code must never simulate successful conversions.

## Role framing

The work is performed as a senior full-stack engineer, software architect, security engineer and UI/UX designer combined.

## Technology stack

| Concern | Technology |
|---------|-----------|
| Frontend and API | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS |
| Database | MongoDB with Mongoose |
| Media processing | FFmpeg and FFprobe |
| Queue | Redis and BullMQ |
| Packaging | Docker and Docker Compose |

## Architecture rules at a glance

1. Next.js serves both the frontend and the API.
2. MongoDB stores users, conversion jobs, settings, history and audit logs.
3. Redis and BullMQ run background conversion jobs.
4. FFmpeg and FFprobe run inside a separate worker process.
5. Uploaded and generated files live in private temporary storage or private object storage.
6. Media binaries are never stored in MongoDB.
7. Both guest conversion and registered accounts are supported.
8. Every private job and download requires explicit authorization.
9. Docker configuration is provided for local development and production.

## Guiding principles

- **Real, not simulated.** Use real backend integrations; no mocked production behavior.
- **Security first.** User input never reaches a shell; no arbitrary FFmpeg flags, paths or remote URLs.
- **Privacy by default.** Media is not kept indefinitely; retention periods are published and enforced.
- **Working pipeline first.** A secure upload-to-download flow takes priority over optional features.
- **Honest status.** A feature is only reported complete when implemented and tested.

## Out of scope (Proposed)

These are not in the brief and are excluded unless added later: conversion from formats other than MP4, remote URL ingestion, video output, batch zip downloads, payments or paid tiers, and public sharing links.
