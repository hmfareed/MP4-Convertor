# 15 — Agent Kickoff Prompt (Proposed)

A ready-to-paste prompt for starting Phase 1 with a coding agent. It is written in conversational prose and points the agent at the documentation instead of repeating it.

---

I'd like you to start building a production-oriented MP4-to-MP3 conversion website, and everything you need to know about it lives in the `docs` folder of this repository. Please begin by reading `docs/README.md` and then work through the numbered files in order, paying particular attention to the architecture, the media processing rules, the job state machine and the security document, because those are the parts where shortcuts would hurt us most.

Before you change anything, look through the repository and tell me what is already there so we can preserve anything that works. Then propose a short implementation plan and the repository structure you intend to use, comparing it with the structure suggested in `docs/12-repository-structure.md`, and wait for my confirmation.

Once I approve the plan, we'll build in phases as described in `docs/11-implementation-phases.md`. For this first session I only want Phase 1, the foundation: the Next.js, TypeScript and Tailwind project, linting and type checking, validated environment configuration, the MongoDB and Redis connections, Docker Compose with the web app, a worker placeholder, MongoDB and Redis, health endpoints and the shared error response format. Please do not start on authentication, uploads, conversion logic or any real interface design yet, because those belong to later phases.

Throughout, please use real integrations rather than mocks in production code, never pass user input into a shell, and never say something is finished unless it is implemented and tested. When you finish the phase, run the linter, the type checker and the tests, then send me a completion report in the format from `docs/10-implementation-rules.md` that lists what was done, what remains, the test results and the exact commands to run everything locally.
