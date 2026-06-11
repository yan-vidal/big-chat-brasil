# Queue Worker Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run message queue processing in a separate worker process while preserving API-owned Socket.IO realtime events and the recipient simulator.

**Architecture:** The API persists queued messages and exposes an internal realtime bridge protected by `INTERNAL_API_TOKEN`. A separate Nest application context polls pending messages from PostgreSQL, advances their statuses, and posts each status event back to the API bridge. The API remains the only process that owns Socket.IO and the simulator subscription.

**Tech Stack:** NestJS, Kysely/PostgreSQL, Node 22 `fetch`, Docker Compose, Jest/Supertest, Playwright full-stack E2E.

---

## File Structure

- Modify `apps/api/src/queue/queue.config.ts`: add `QUEUE_PROCESSOR_ENABLED`, `QUEUE_POLL_INTERVAL_MS`, `QUEUE_STATUS_PUBLISHER`, `INTERNAL_API_BASE_URL`, and `INTERNAL_API_TOKEN` parsing.
- Modify `apps/api/src/queue/queue.service.ts`: add processor enablement, DB polling, duplicate suppression, and publisher abstraction usage.
- Create `apps/api/src/queue/queue-status.publisher.ts`: define in-process and HTTP status publishers.
- Modify `apps/api/src/queue/queue.module.ts`: register the publisher implementation from configuration.
- Create `apps/api/src/internal/internal-token.guard.ts`: protect internal API routes with `x-internal-token`.
- Create `apps/api/src/internal/internal-realtime.controller.ts`: receive worker status events and publish them through `RealtimePublisher`.
- Create `apps/api/src/internal/internal.module.ts`: package the internal bridge for `AppModule`.
- Modify `apps/api/src/app.module.ts`: import `InternalModule`.
- Create `apps/api/src/worker.module.ts`: minimal module for worker process.
- Create `apps/api/src/worker.ts`: create Nest application context and keep it alive.
- Modify `apps/api/package.json`: add `start:worker`.
- Modify `Dockerfile`: add worker target/command.
- Modify `docker-compose.yml`: disable API local processing, add worker service, add internal token/base URL.
- Modify `README.md` and `HANDOFF.md`: document worker mode and verification.

## Task 1: Queue Configuration Contract

**Files:**

- Modify: `apps/api/src/queue/queue.config.ts`
- Test: `apps/api/src/queue/queue.config.spec.ts`

- [ ] Write failing tests proving:
  - `QUEUE_PROCESSOR_ENABLED=false` disables processing without relying on `QUEUE_AUTOSTART`.
  - `QUEUE_AUTOSTART=false` still keeps manual queue testing behavior.
  - HTTP publisher config reads `INTERNAL_API_BASE_URL` and `INTERNAL_API_TOKEN`.
- [ ] Run `pnpm --filter @bcb/api test -- queue.config.spec.ts` and verify failure from missing fields.
- [ ] Implement the minimal config parser.
- [ ] Run `pnpm --filter @bcb/api test -- queue.config.spec.ts` and verify pass.

## Task 2: Internal Realtime Bridge

**Files:**

- Create: `apps/api/src/internal/internal-token.guard.ts`
- Create: `apps/api/src/internal/internal-realtime.controller.ts`
- Create: `apps/api/src/internal/internal.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/realtime/realtime.spec.ts`

- [ ] Write failing Supertest coverage for `POST /internal/realtime/message-status`:
  - Missing or wrong `x-internal-token` returns `401`.
  - Valid token publishes `message.status` through `RealtimePublisher.events$`.
- [ ] Run `BCB_RUN_DB_TESTS=true pnpm --filter @bcb/api test -- realtime.spec.ts` and verify route failure.
- [ ] Implement guard, controller, module, and app import.
- [ ] Run the same test and verify pass.

## Task 3: Worker Polling Processor

**Files:**

- Modify: `apps/api/src/queue/queue.service.ts`
- Create: `apps/api/src/queue/queue-status.publisher.ts`
- Modify: `apps/api/src/queue/queue.module.ts`
- Test: `apps/api/src/queue/queue.spec.ts`

- [ ] Write failing DB integration coverage proving a queued message created after app bootstrap is processed by polling without direct `enqueue()`.
- [ ] Run `BCB_RUN_DB_TESTS=true pnpm --filter @bcb/api test -- queue.spec.ts` and verify failure.
- [ ] Implement processor enablement, polling, duplicate suppression, and publisher abstraction.
- [ ] Run the same queue spec and verify pass.

## Task 4: Worker Entrypoint and Docker

**Files:**

- Create: `apps/api/src/worker.module.ts`
- Create: `apps/api/src/worker.ts`
- Modify: `apps/api/package.json`
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Test: `apps/web/e2e/full-stack.spec.ts`

- [ ] Add `start:worker` and a Docker `worker` target using the same built API image.
- [ ] Configure Compose with `api` using `QUEUE_PROCESSOR_ENABLED=false` and `worker` using `QUEUE_STATUS_PUBLISHER=http`, `INTERNAL_API_BASE_URL=http://api:3000`, and the shared token.
- [ ] Rebuild/recreate Docker services and run the full-stack Playwright test.
- [ ] Verify the UI still reaches delivered/read status and simulator response.

## Task 5: Documentation, Handoff, and Final Gates

**Files:**

- Modify: `README.md`
- Modify: `HANDOFF.md`

- [ ] Document the worker service, internal bridge, env vars, and current no-broker tradeoff.
- [ ] Update handoff with this block's status and next action.
- [ ] Run final gates: affected API tests, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`, mock Playwright, full-stack Playwright, and Docker config/build as time allows.
- [ ] Commit the coherent worker block after green verification.
