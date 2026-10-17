# 12 — Repository Structure (Proposed)

```
mp4-to-mp3/
├─ README.md
├─ .env.example
├─ docker-compose.yml
├─ docker-compose.prod.yml
├─ Dockerfile.web
├─ Dockerfile.worker
├─ docs/                      # this documentation
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ (marketing)/         # home, privacy
│  │  ├─ (auth)/              # login, register, reset
│  │  ├─ (app)/               # history, settings, job detail
│  │  ├─ admin/               # protected admin area
│  │  └─ api/                 # route handlers
│  ├─ components/             # uploader, file-card, progress, audio-player, dialogs, ...
│  ├─ lib/
│  │  ├─ config/              # env validation, limits
│  │  ├─ db/                  # connection, models, indexes
│  │  ├─ auth/                # sessions, hashing, guards
│  │  ├─ storage/             # storage interface + implementations
│  │  ├─ queue/               # BullMQ queue definitions
│  │  ├─ jobs/                # job service, state machine
│  │  ├─ validation/          # request schemas
│  │  ├─ rate-limit/
│  │  └─ errors/              # error codes and response helper
│  └─ worker/
│     ├─ index.ts             # worker entrypoint
│     ├─ ffmpeg/              # probe, argument builder, runner
│     ├─ processors/          # conversion processor
│     └─ cleanup/             # retention and retry tasks
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  └─ fixtures/
└─ scripts/                   # db setup, admin seed, fixture generation
```

Notes: the worker shares `lib/` code with the web app but has its own entrypoint and image, so FFmpeg is installed only in the worker image.
