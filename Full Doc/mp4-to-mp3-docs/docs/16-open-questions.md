# 16 — Open Questions

Decisions the brief leaves open. Each has a suggested default so work can proceed, but they should be confirmed.

| # | Question | Suggested default |
|---|----------|-------------------|
| 1 | Maximum upload size? | 500 MB |
| 2 | Maximum media duration? | 60 minutes |
| 3 | Retention for guest and registered outputs? | 24 hours / 7 days |
| 4 | Local disk or object storage in production? | Local volume for single host; S3-compatible for multi-host |
| 5 | Email provider for password reset? | SMTP via the existing provider of choice |
| 6 | Email verification required before use? | Optional in v1 |
| 7 | Progress updates: polling or server-sent events? | Polling first, SSE later |
| 8 | Input formats beyond MP4 (MOV, MKV, WebM)? | MP4 only for v1 |
| 9 | Guest limits compared with registered users? | Lower rate limits and shorter retention for guests |
| 10 | Admin bootstrap method? | Seed script using an environment variable |
| 11 | Hosting target and region? | Undecided |
| 12 | Privacy policy and terms wording? | Needs review before launch |
| 13 | Malware scanning of uploads? | Out of scope for v1; document as a limitation |
