# 05 — API

Requirements: validated request schemas, consistent error responses, protection against duplicate submissions, and no cross-user access to jobs.

## Endpoints

Paths below are **Proposed**; the brief specifies the capabilities, not the routes.

| Capability | Method and path | Auth |
|-----------|-----------------|------|
| Upload | `POST /api/uploads` | Guest or user |
| Create conversion | `POST /api/conversions` | Guest or user |
| Job status | `GET /api/conversions/:id` | Owner / guest token |
| History | `GET /api/conversions` | User |
| Retry | `POST /api/conversions/:id/retry` | Owner |
| Cancel | `POST /api/conversions/:id/cancel` | Owner |
| Delete | `DELETE /api/conversions/:id` | Owner |
| Download | `GET /api/conversions/:id/download` | Owner / guest token |
| Preview stream | `GET /api/conversions/:id/preview` | Owner / guest token |
| Register / login / logout | `POST /api/auth/*` | Public / session |
| Password reset | `POST /api/auth/password-reset/request`, `.../confirm` | Public |
| User settings | `GET/PATCH /api/settings` | User |
| Account deletion | `DELETE /api/account` | User |
| Admin management | `/api/admin/*` | Admin |
| Health | `GET /api/health` (liveness), `GET /api/health/ready` (readiness) | Public, minimal output |

## Validation
- Every request body, query and param is parsed with a schema validator (for example Zod) before use.
- Unknown fields are rejected or stripped.
- Bitrate must be one of the allowed values; trim values must be numeric and in range.

## Error response format (Proposed)

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "The file exceeds the maximum upload size.",
    "details": { "maxBytes": 524288000 },
    "requestId": "req_8f2c..."
  }
}
```

Rules: stable machine-readable `code`; human-readable `message` safe to display; never include stack traces, internal paths or secrets; correct HTTP status codes.

### Error codes (Proposed)

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_FAILED` | 400 | Request schema invalid |
| `UNSUPPORTED_FILE_TYPE` | 415 | Not a valid MP4 |
| `FILE_TOO_LARGE` | 413 | Over size limit |
| `DURATION_TOO_LONG` | 422 | Over duration limit |
| `NO_AUDIO_STREAM` | 422 | Input has no audio |
| `UNSUPPORTED_CODEC` | 422 | Audio codec cannot be decoded |
| `CORRUPTED_MEDIA` | 422 | Probe or decode failed |
| `UNAUTHENTICATED` | 401 | Login required |
| `FORBIDDEN` | 403 | Role insufficient |
| `NOT_FOUND` | 404 | Missing, or not owned (do not reveal which) |
| `JOB_EXPIRED` | 410 | Files past retention |
| `INVALID_STATE` | 409 | Transition not allowed |
| `RATE_LIMITED` | 429 | Too many requests; include `Retry-After` |
| `CONVERSION_TIMEOUT` | 200 job state | Job failed by timeout |
| `INTERNAL_ERROR` | 500 | Unexpected; log with `requestId` |

## Idempotency
- Job creation requires an `Idempotency-Key` header (client-generated).
- The same key and owner returns the existing job instead of creating a duplicate.
- A unique partial index enforces this at the database level, not only in code.
- Retry is idempotent: repeating a retry on a job already re-queued returns the current job.

## Authorization
- Every private job and download route resolves the owner on the server and compares it to the session (or guest token).
- Unowned or unknown jobs both return `404`.
- Admin routes verify the admin role server-side on every request.
- Downloads are streamed through an authorized route; storage paths and presigned URLs, if used, are short-lived and never exposed for other users' files.

## Pagination and versioning (Proposed)
Cursor-based pagination for history and admin lists. Prefix routes with `/api` and add `/v1` if external consumers are expected.
