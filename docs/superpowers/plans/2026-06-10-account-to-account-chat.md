# Account To Account Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow every onboarded CPF/CNPJ account to appear as a chat recipient and exchange messages with other accounts while keeping seeded simulated recipients available.

**Architecture:** Keep the current `recipients` catalog as the stable target for conversations, and add an optional `client_profile_id` link for recipients backed by real accounts. Each authenticated account keeps its own inbox view in `conversations`; sending to a real-account recipient creates the sender message and a mirrored incoming message in the recipient owner's conversation. Simulated recipients continue to use the existing queue/simulator behavior.

**Tech Stack:** NestJS, Kysely/PostgreSQL migrations, shared Zod contracts, Supertest DB integration tests, Angular/Playwright e2e.

---

## File Structure

- Create `apps/api/migrations/002_account_recipients.ts`: add nullable `recipients.client_profile_id`, unique index, and remove strict unique name constraint.
- Modify `apps/api/src/database/migrations.ts`: register migration `002_account_recipients`.
- Keep `apps/api/migrations/001_initial_schema.ts` historical; fresh installs receive the final schema by running `002_account_recipients` after `001`.
- Modify `apps/api/src/database/database.types.ts`: add `client_profile_id` to `RecipientTable`.
- Modify `apps/api/src/database/seed.ts`: create account-backed recipient rows for seeded onboarded accounts while preserving simulated recipients.
- Modify `apps/api/src/recipients/*`: list simulated recipients plus other onboarded account recipients, excluding the requester.
- Modify `apps/api/src/billing/billing.repository.ts`: upsert account-backed recipient rows when onboarding becomes complete.
- Modify `apps/api/src/messages/messages.repository.ts` and `messages.service.ts`: create mirrored incoming messages/conversations for real-account recipients and publish realtime updates to both accounts.
- Modify `apps/api/src/simulator/*`: skip simulator responses for conversations whose recipient is a real account.
- Modify tests in `recipients.spec.ts`, `messages.spec.ts`, `simulator.spec.ts`, and Playwright full-stack if needed.
- Update `README.md` and `HANDOFF.md`.

## Task 1: Catalog Real Accounts As Recipients

- [x] Update recipient HTTP tests first so `/recipients` must include seeded simulated recipients and other real accounts, but not the current account.
- [x] Run `pnpm --filter @bcb/api test:db -- recipients.spec.ts` and verify the new account-recipient expectation fails.
- [x] Add migration/type/seed/repository/controller changes to expose account recipients.
- [x] Rerun the recipients spec and verify pass.

## Task 2: Mirror Messages Into Recipient Inbox

- [x] Add a messages integration test where Empresa ABC sends to Cliente Pós-pago Com Limite by `recipientId`, then the postpaid account lists a conversation with Empresa ABC and sees the incoming message as `senderType='user'`.
- [x] Extend the same test so the postpaid account replies in that conversation and Empresa ABC sees the reply as an incoming message.
- [x] Run `pnpm --filter @bcb/api test:db -- messages.spec.ts` and verify failure before implementation.
- [x] Implement mirrored conversation/message creation and realtime publication for real-account recipients.
- [x] Rerun the messages spec and verify pass.

## Task 3: Keep Simulator For Simulated Recipients Only

- [x] Add simulator coverage showing delivered messages to account-backed recipients do not generate automatic simulated replies.
- [x] Run `pnpm --filter @bcb/api test:db -- simulator.spec.ts` and verify failure before implementation.
- [x] Add repository guard for simulated recipients and skip the simulator when `recipients.client_profile_id` is not null.
- [x] Rerun simulator spec and verify pass.

## Task 4: E2E And Documentation

- [x] Add or update full-stack Playwright coverage so two demo accounts can exchange messages through the UI, while existing simulated recipient flow remains intact.
- [x] Update README with the account-to-account behavior and the fact that simulated recipients remain in the catalog.
- [x] Update HANDOFF with implementation notes, gates, and next action.
- [x] Run final gates: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter @bcb/api test:db`, `pnpm format:check`, Playwright mock/full-stack, and Docker build/config as needed.
- [ ] Commit the coherent block.
