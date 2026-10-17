# MP4 to MP3 Converter — Project Documentation

This folder is the specification for a production-oriented MP4-to-MP3 conversion website. It was split from a single build prompt into focused documents, then extended with the supporting documents an implementation team (or coding agent) needs.

> **Legend.** Material taken directly from the original brief is stated as requirements. Anything marked **Proposed** is an addition made while organizing the documentation; treat it as a sensible default to confirm or change, not as a decision already made.

## Reading order

| # | Document | What it covers |
|---|----------|----------------|
| 00 | [Overview](00-overview.md) | Objective, scope, stack, guiding principles |
| 01 | [Architecture](01-architecture.md) | Components, data flow, storage, Docker topology |
| 02 | [Features](02-features.md) | Complete feature list and per-feature acceptance notes |
| 03 | [Media Processing](03-media-processing.md) | FFmpeg/FFprobe rules, limits, failure handling |
| 04 | [Database](04-database.md) | Mongoose models, indexes, retention fields |
| 05 | [API](05-api.md) | Endpoints, validation, error format, idempotency |
| 06 | [Job State Machine](06-job-state-machine.md) | States, transitions, retry and cancel rules |
| 07 | [UI/UX](07-ui-ux.md) | Design direction, components, UI states, accessibility |
| 08 | [Security & Privacy](08-security-privacy.md) | Auth, authorization, validation, retention, headers |
| 09 | [Quality Assurance](09-quality-assurance.md) | Test strategy and required test cases |
| 10 | [Implementation Rules](10-implementation-rules.md) | Working rules and definition of done |
| 11 | [Implementation Phases](11-implementation-phases.md) | Phase-by-phase build plan with out-of-scope guards |
| 12 | [Repository Structure](12-repository-structure.md) | Proposed folder layout |
| 13 | [Configuration](13-configuration.md) | Environment variables, limits, `.env.example` |
| 14 | [Deployment & Operations](14-deployment-operations.md) | Docker, worker startup, monitoring, runbook |
| 15 | [Agent Kickoff Prompt](15-agent-kickoff-prompt.md) | Ready-to-paste prompt to start Phase 1 |
| 16 | [Open Questions](16-open-questions.md) | Decisions still needed |

## Which files came from where

Documents 00–10 reorganize the original brief by category. Documents 11–16 are new.
