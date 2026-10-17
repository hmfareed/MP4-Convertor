# 08 — Security & Privacy

## Required controls
- Secure authentication
- Server-side authorization on every private resource
- Rate limiting
- File validation
- Private storage
- Secure session cookies
- Protected admin routes
- Safe filenames
- Cleanup jobs
- Appropriate security headers

## Authentication and sessions
- Passwords hashed with argon2id (or bcrypt at a suitable cost). Never stored or logged in plaintext. (Proposed algorithm choice)
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter, with expiry and rotation on login.
- Password reset tokens are random, single-use, short-lived and stored hashed. Reset responses do not reveal whether an email exists.
- CSRF protection for state-changing requests.
- Login and reset endpoints have stricter rate limits.

## Authorization
- Ownership checked server-side for every job, upload and download.
- Guest jobs are protected by an unguessable token; only its hash is stored.
- Admin routes check the admin role on every request, not only in the UI or middleware.

## File and media safety
- Validate extension, declared MIME type, magic bytes and an FFprobe inspection. None of these alone is trusted.
- Generate safe filenames and storage keys on the server. Sanitize display names (strip path separators, control characters, limit length).
- No remote URLs, arbitrary paths or arbitrary FFmpeg flags (see Media Processing).
- Enforce size limits while streaming the upload, not after buffering it.
- Serve downloads with `Content-Disposition: attachment`, a fixed `audio/mpeg` content type and `X-Content-Type-Options: nosniff`.

## Privacy and retention
- Uploaded media is not retained indefinitely.
- Published retention periods are enforced by cleanup jobs. **Proposed defaults:** inputs deleted on completion or failure grace expiry (for example 1 hour); outputs for guests 24 hours; outputs for registered users configurable up to 7 days.
- Failed cleanup operations are recorded as `CleanupTask` records and retried with backoff.
- Account deletion removes the user's media, jobs, settings and sessions.
- Internal storage paths and secrets are never exposed in responses, logs shown to users, or client bundles.
- Logs avoid storing full IPs and never contain file contents or tokens.

## Rate limiting (Proposed)
Redis-backed, keyed by user ID or IP. Separate buckets for uploads, conversion creation, authentication, password reset and downloads. Return `429` with `Retry-After`.

## Security headers (Proposed)
`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `frame-ancestors` restrictions.

## Secrets
Never commit secrets. Provide `.env.example` with placeholders only. Validate required environment variables at startup and fail fast.

## Security review checklist (Proposed)
- [ ] No shell string construction anywhere near FFmpeg
- [ ] Every route has an explicit authorization decision
- [ ] Download endpoint cannot be used to read arbitrary paths
- [ ] Rate limits on all unauthenticated endpoints
- [ ] Dependency audit run and findings triaged
- [ ] Docker images run as a non-root user
