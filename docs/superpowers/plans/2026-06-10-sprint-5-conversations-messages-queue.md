# Sprint 5 Conversations Messages Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the backend chat flow: recipients, conversations, message history, message sending with billing, in-memory priority queue, processing status transitions, recovery, and admin queue status.

**Architecture:** Add focused `recipients`, `conversations`, `messages`, and `queue` modules. HTTP endpoints authenticate with `JwtAuthGuard`, require `OnboardingGuard` for client chat actions, derive `clientId` from the JWT, persist messages with Kysely, charge via `BillingService.chargeMessage()`, and enqueue message ids into an in-memory queue. The queue owns status transitions and recovery of `queued`/`processing` messages on boot.

**Tech Stack:** NestJS 11, Kysely, PostgreSQL, `@bcb/shared` Zod contracts, Jest, Supertest.

---

## Scope

Sprint 5 scope from `IMPLEMENTATION_PLAN.md`:

- `GET /recipients`
- `GET /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/read`
- `POST /messages`
- `GET /messages/:id`
- `GET /messages/:id/status`
- `GET /queue/status` guarded by admin role
- In-memory priority queue with urgent before normal and anti-starvation.
- Status transitions `queued -> processing -> sent -> delivered`.
- Recovery of `queued`/`processing` messages on module bootstrap.

Sprint 6 will handle WebSocket and recipient simulator. This sprint only persists status changes; it does not emit real-time events.

## File Structure

- Modify `apps/api/src/app.module.ts`: import `RecipientsModule`, `ConversationsModule`, `MessagesModule`, and `QueueModule`.
- Modify `packages/shared/src/schemas/message.ts`: add `QueueStatusResponseSchema` for `GET /queue/status`.
- Create `apps/api/src/chat/chat.errors.ts`: shared chat HTTP exceptions.
- Create `apps/api/src/recipients/*`: module/controller/service/repository and Supertest coverage.
- Create `apps/api/src/conversations/*`: module/controller/service/repository and Supertest coverage.
- Create `apps/api/src/messages/*`: module/controller/service/repository and Supertest coverage.
- Create `apps/api/src/queue/*`: module/controller/service/config/types and unit/integration coverage.
- Modify `HANDOFF.md`: record Sprint 5 result and next action.

## Task 1: Queue Contract

- [x] **Step 1: Write failing shared contract test**

Add `QueueStatusResponseSchema` coverage to `packages/shared/src/schemas/contracts.spec.ts`:

```ts
expect(
  QueueStatusResponseSchema.parse({
    normalQueued: 1,
    urgentQueued: 2,
    processing: false,
    processedCount: 3,
    failedCount: 0,
  }),
).toMatchObject({ urgentQueued: 2 });
```

- [x] **Step 2: Run red**

Run: `pnpm --filter @bcb/shared test -- contracts.spec.ts`.

Expected: fail because the schema is not exported yet.

- [x] **Step 3: Implement schema**

Add `QueueStatusResponseSchema` and type to `packages/shared/src/schemas/message.ts`.

- [x] **Step 4: Run green**

Run: `pnpm --filter @bcb/shared test -- contracts.spec.ts`.

Expected: pass.

## Task 2: HTTP Tests First

- [x] **Step 1: Write failing Supertest specs**

Create:

- `apps/api/src/recipients/recipients.spec.ts`
- `apps/api/src/conversations/conversations.spec.ts`
- `apps/api/src/messages/messages.spec.ts`
- `apps/api/src/queue/queue.spec.ts`

Required cases:

- `GET /recipients` returns the seeded catalog for an onboarded client.
- New non-onboarded client gets `403 ONBOARDING_REQUIRED` on chat endpoints.
- `GET /conversations` lists Empresa ABC seeded conversations.
- `GET /conversations/:id/messages` returns seeded history in chronological order.
- `POST /conversations/:id/read` sets `unreadCount` to zero for the owner only.
- Client B cannot read Client A's conversation.
- `POST /messages` with `conversationId` creates `queued`, charges prepaid balance, and returns `estimatedDelivery`.
- `POST /messages` with `recipientId` creates a conversation if one does not exist.
- Invalid `recipientId` returns `RECIPIENT_NOT_FOUND`.
- Prepaid empty client cannot send (`INSUFFICIENT_BALANCE`).
- Postpaid at-limit client cannot send (`INSUFFICIENT_LIMIT`).
- Admin can call `GET /queue/status`; client cannot.
- Queue processor advances statuses to `delivered` with zero delays.
- Queue recovery enqueues `queued`/`processing` messages from the database.

- [x] **Step 2: Run red**

Run: `pnpm --filter @bcb/api test:db`.

Expected: fail because chat/queue modules do not exist.

## Task 3: Implement REST Modules

- [x] **Step 1: Implement chat errors**

Use structured HTTP errors with codes:

- `FORBIDDEN_RESOURCE`
- `CONVERSATION_NOT_FOUND`
- `MESSAGE_NOT_FOUND`
- `RECIPIENT_NOT_FOUND`

- [x] **Step 2: Implement recipients**

`GET /recipients` returns seeded recipients ordered by name and requires `JwtAuthGuard + OnboardingGuard`.

- [x] **Step 3: Implement conversations**

Implement owner-scoped list/detail/history/read operations using one-query joins where practical.

- [x] **Step 4: Implement messages**

`POST /messages` validates `SendMessageRequestSchema`, resolves existing conversation or creates one by `recipientId`, calls `BillingService.chargeMessage()`, creates the message with `queued`, updates conversation preview, and enqueues the id. If enqueueing later fails after prepaid debit, call `refundPrepaid()`.

## Task 4: Implement Queue

- [x] **Step 1: Implement queue config**

Read:

- `QUEUE_AUTOSTART` default `true`
- `QUEUE_SENT_DELAY_MS` default `1000`
- `QUEUE_DELIVERED_DELAY_MS` default `4000`

- [x] **Step 2: Implement queue service**

Maintain `urgent` and `normal` arrays, process urgent first, after 3 urgent messages process one normal if present, expose `processNextForTests()` for deterministic tests, and recover pending messages on module init.

- [x] **Step 3: Implement queue status**

`GET /queue/status` uses `JwtAuthGuard + RolesGuard + @Roles('admin')`.

## Task 5: Verification and Handoff

- [x] **Step 1: Run final gates**

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm --filter @bcb/api test:db
```

- [x] **Step 2: Update `HANDOFF.md`**

Record endpoints, queue behavior, tests, operational notes, and Sprint 6 next action.

- [x] **Step 3: Ask for commit approval**

Suggested commit:

```bash
git add packages/shared/src/schemas/message.ts packages/shared/src/schemas/contracts.spec.ts apps/api/src/chat apps/api/src/recipients apps/api/src/conversations apps/api/src/messages apps/api/src/queue apps/api/src/app.module.ts docs/superpowers/plans/2026-06-10-sprint-5-conversations-messages-queue.md HANDOFF.md
git commit -m "feat(api): add conversations messages and priority queue"
```
