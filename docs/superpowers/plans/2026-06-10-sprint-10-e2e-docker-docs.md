# Sprint 10 E2E Docker Docs Implementation Plan

## Goal

Finish the challenge delivery so a reviewer can clone the repository, run `docker compose up --build`, log in with documented demo credentials, and exercise the main chat flow. Add one full-stack Playwright path that talks to the real API instead of mocked REST.

## Scope

- Docker:
  - Replace dev-only bind-mounted Compose services with image builds.
  - Add a root multi-target `Dockerfile` and `.dockerignore`.
  - API startup runs `db:migrate` and `db:seed` before `@bcb/api start`.
  - Web serves the built Angular bundle through the existing static server on port `4200`.
- E2E:
  - Add a full-stack Playwright config that assumes Docker/API/web are already running.
  - Cover demo login, conversation list, direct chat, urgent send, status transition and simulator reply without REST mocks.
- README:
  - Replace the challenge stub with solution-oriented instructions.
  - Include stack/versions, run steps, demo credentials, implemented scope, assumptions, limitations and future work.

## Non-goals

- Nginx production image. The static Node server is enough for the challenge delivery.
- Swagger/OpenAPI. This is optional in the master plan and lower value than Docker/readme/e2e.
- Browser matrix beyond Chromium.

## TDD / Verification Plan

1. Add full-stack Playwright spec/config first.
   - [x] Expected red before Docker stack is running: connection refused or missing app.
2. Implement Dockerfile/compose changes.
   - [x] Root multi-target `Dockerfile`.
   - [x] `.dockerignore`.
   - [x] Compose image builds with API migrate/seed/start and static web server.
3. [x] Run `docker compose config`.
4. [x] Run `docker compose build`.
5. [x] Run `docker compose up --detach db api web` from a clean app database state.
6. [x] Run the full-stack Playwright spec.
7. [x] Run standard gates:
   - [x] `pnpm lint`
   - [x] `pnpm test`
   - [x] `pnpm build`
   - [x] `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`
   - [x] `pnpm format:check`
8. [x] Inspect final UI through Playwright full-stack flow; Sprint 9 desktop/mobile visual captures already validated the chat layouts.

## Completion Notes

- The default Compose ports remain `3000`, `4200` and `5432`; host published ports can be overridden with `API_PUBLISHED_PORT`, `WEB_PUBLISHED_PORT` and `DB_PUBLISHED_PORT`.
- Local verification used `API_PUBLISHED_PORT=3002` because another container already owned host port `3000`.
- `playwright.config.ts` excludes `full-stack.spec.ts`; the full-stack path runs only through `playwright.fullstack.config.ts`.
- The README now documents Docker run, demo credentials, testing commands, implemented scope, assumptions, limitations and port-conflict workaround.

## Commit

Suggested commit: `test: add e2e coverage for main chat flow`
