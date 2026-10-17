# 04 — Database

MongoDB stores users, conversion jobs, settings, history and audit logs. **Media binaries are never stored in MongoDB**, only metadata and storage references.

Requirements: typed Mongoose models and appropriate indexes.

## Models (Proposed field outlines)

### User
`email` (unique, lowercased), `passwordHash`, `role` (`user` | `admin`), `emailVerifiedAt`, `status` (`active` | `deleted`), `createdAt`, `updatedAt`, `lastLoginAt`.

### Session (if not using stateless sessions)
`userId`, `tokenHash`, `expiresAt`, `userAgent`, `ipHash`.

### PasswordResetToken
`userId`, `tokenHash`, `expiresAt`, `usedAt`.

### UserSettings
`userId` (unique), `defaultBitrate`, `autoDeleteAfter`, `emailNotifications`.

### Upload
`ownerType` (`user` | `guest`), `ownerId`, `storageKey`, `originalNameSafe`, `sizeBytes`, `mimeDetected`, `probe` (duration, codecs, streams summary), `expiresAt`, `createdAt`.

### ConversionJob
`ownerType`, `ownerId` or `guestTokenHash`, `uploadId`, `status` (see state machine), `settings` (`bitrateKbps`, `trimStartSec`, `trimEndSec`), `idempotencyKey`, `attempt`, `progressPercent`, `queuedAt`, `startedAt`, `finishedAt`, `processingMs`, `errorCode`, `errorMessageSafe`, `output` (`storageKey`, `sizeBytes`, `durationSec`, `bitrateKbps`), `expiresAt`, `cancelRequestedAt`, `deletedAt`.

### AuditLog
`actorType`, `actorId`, `action`, `targetType`, `targetId`, `ip` (hashed or truncated), `metadata`, `createdAt`.

### CleanupTask
`targetType`, `storageKey`, `attempts`, `nextAttemptAt`, `lastError`, `status`. Supports retrying failed cleanup operations.

## Indexes (Proposed)

| Collection | Index | Purpose |
|-----------|-------|---------|
| users | `email` unique | Login, registration uniqueness |
| conversionJobs | `{ ownerId, createdAt: -1 }` | History listing |
| conversionJobs | `{ status, queuedAt }` | Admin and queue views |
| conversionJobs | `{ ownerId, idempotencyKey }` unique (partial) | Duplicate-submission protection |
| conversionJobs | `{ expiresAt }` | Retention sweeps |
| uploads | `{ expiresAt }` | Retention sweeps |
| passwordResetTokens | `{ expiresAt }` TTL | Auto-expiry |
| cleanupTasks | `{ status, nextAttemptAt }` | Retry scheduling |
| auditLogs | `{ createdAt: -1 }`, `{ targetId }` | Review and investigation |

## Data rules
- Tokens are stored hashed.
- Passwords are stored only as strong salted hashes (argon2id or bcrypt with a suitable cost).
- Soft-delete jobs where history integrity matters, but always delete the underlying files.
- Account deletion removes the user's media, jobs and settings, and anonymizes audit entries.
