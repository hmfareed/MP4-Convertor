# 09 — Quality Assurance

Write unit, integration and end-to-end tests. Run linting, TypeScript checks and tests, and resolve errors before finishing.

## Required test scenarios

| Scenario | Level |
|----------|-------|
| Successful conversion | Integration, E2E |
| Invalid files (non-MP4, wrong magic bytes) | Unit, integration |
| Oversized uploads | Integration |
| Missing audio stream | Integration |
| Conversion failure | Integration |
| Retry | Unit, integration |
| Authorization (no cross-user access) | Integration |
| Download expiration | Integration |
| Account deletion | Integration |
| Administrative permissions | Integration, E2E |

## Additional coverage (Proposed)
- State machine: every allowed and disallowed transition
- Idempotency: duplicate create and retry requests
- Cancellation and timeout kill the process and clean files
- Cleanup retry behavior after a simulated storage failure
- Rate limiting returns `429` with `Retry-After`
- Argument builder: unsafe bitrate or trim values are rejected; no value can alter the argument list structure
- Accessibility: automated checks plus keyboard-only walkthrough of the converter flow

## Test layers (Proposed)
- **Unit:** schemas, argument builder, state machine, filename sanitizer.
- **Integration:** API routes against test MongoDB and Redis, with a real FFmpeg and small fixture files.
- **End-to-end:** browser tests (for example Playwright) for upload, progress, preview, download, history and admin.

## Fixtures (Proposed)
Small generated files: valid MP4 with audio, MP4 without audio, truncated MP4, non-MP4 renamed to `.mp4`, over-limit file, over-duration file.

## Rules
- Tests use real services where practical; production code contains no mock-success path.
- Never report a feature as complete unless it is implemented and tested.
- Report test results honestly, including failures and skipped tests.
