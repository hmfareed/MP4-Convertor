# 02 — Features

## Core conversion
- Homepage with a prominent upload area
- Drag-and-drop and file-picker upload
- MP4 validation (client hints plus authoritative server validation)
- Bitrate selection: 96, 128, 192 (default), 256, 320 kbps
- Optional audio trimming (start and end)
- Upload progress, conversion progress and queue status
- Success and failure states
- Audio preview
- MP3 download

## Job management
- Conversion history
- Job deletion
- Retry controls
- Cancellation

## Accounts
- Guest conversion (no account required)
- Registration and login
- Password reset
- User settings
- Account deletion

## Administration
A protected admin dashboard showing:
- Conversion volume
- Success and failure counts
- Processing times
- Queue health
- Storage health
- Job-management tools

## Per-feature acceptance notes (Proposed)

| Feature | Acceptance |
|---------|-----------|
| Upload | Rejects non-MP4, oversized and corrupted files with a clear message; shows progress; cancellable |
| Trimming | Start < end, both within the probed duration; enforced server-side |
| Progress | Reflects real worker progress derived from FFmpeg output, not a timer |
| Download | Only the owner (or guest holding the job token) can download; expired files return a clear expired state |
| History | Paginated, newest first, shows status, bitrate, size, dates, and expiry |
| Retry | Only for failed or cancelled jobs; idempotent |
| Admin | Requires the admin role checked server-side on every request |
| Guest jobs | Reachable only through an unguessable per-job access token held by the creating browser |
