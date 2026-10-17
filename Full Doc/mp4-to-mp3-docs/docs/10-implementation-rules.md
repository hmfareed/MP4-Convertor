# 10 — Implementation Rules

- Inspect the existing repository before changing files.
- Preserve working functionality if an existing project is supplied.
- Build in logical phases, beginning with the application foundation and a working conversion pipeline.
- Use real backend integrations rather than mocked production behavior.
- Never claim a feature is complete unless it is implemented and tested.
- Run linting, TypeScript checks and tests; resolve errors before finishing.
- Document external services, configuration, limitations and deployment requirements.
- Never commit secrets.
- Report completed work, remaining tasks, test results and exact local startup commands.

## Starting instruction
Begin by proposing the implementation plan and repository structure, then implement the project phase by phase. Prioritize a working, secure MP4-to-MP3 conversion flow before optional features.

## Required deliverables
Docker Compose configuration, `.env.example`, database setup instructions, worker startup instructions, deployment documentation and a comprehensive README.

## Definition of done (Proposed)
A phase is done when: code is implemented, lint and type checks pass, tests for the phase pass, documentation for the phase is updated, and the completion report lists what is finished, what remains and the exact commands to run it.

## Completion report template (Proposed)

```
Phase: <name>
Completed: ...
Not done / deferred: ...
Tests: <command> -> <result>
Lint/typecheck: <result>
Run locally: <exact commands>
Known limitations: ...
```
