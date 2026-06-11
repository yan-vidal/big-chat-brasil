# Sprint 4 Onboarding Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add authenticated onboarding, simulated PIX, billing summary, and reusable financial charge rules for prepaid and postpaid clients.

**Architecture:** Add a focused `BillingModule` that uses `DatabaseService` and derives `clientId` only from the JWT payload installed by `JwtAuthGuard`. The module updates the `client_profiles` row created by auth onboarding, records payment intents and billing transactions, and exports a `BillingService.chargeMessage()` domain method for Sprint 5 message sending.

**Tech Stack:** NestJS 11, Kysely, PostgreSQL, Zod contracts from `@bcb/shared`, Jest, Supertest.

---

## Scope

Sprint 4 formal scope from `IMPLEMENTATION_PLAN.md`:

- `POST /billing/onboarding`
- `POST /billing/pix-intents`
- `POST /billing/pix-intents/:id/confirm`
- `GET /billing/me`
- Prepaid payment simulation and credit transaction.
- Postpaid monthly limit activation.
- Financial rules for prepaid balance and postpaid monthly limit.
- Guard for endpoints that require completed onboarding.

Sprint 4 deliberately does not implement `/messages`; that starts in Sprint 5. It creates tested financial domain methods that Sprint 5 will call before queueing messages.

## File Structure

- Modify `apps/api/src/app.module.ts`: import `BillingModule`.
- Create `apps/api/src/billing/billing.errors.ts`: typed HTTP exceptions and error codes.
- Create `apps/api/src/billing/billing.types.ts`: selected DB rows and command types.
- Create `apps/api/src/billing/billing.repository.ts`: Kysely queries for profile, onboarding, PIX, transactions, and atomic charge updates.
- Create `apps/api/src/billing/billing.service.ts`: onboarding, PIX confirmation, summary, onboarding guard lookup, and `chargeMessage()`.
- Create `apps/api/src/billing/billing.controller.ts`: HTTP endpoints and Zod body parsing.
- Create `apps/api/src/billing/billing.module.ts`: module wiring and exports.
- Create `apps/api/src/billing/onboarding.guard.ts`: rejects clients without completed onboarding.
- Create `apps/api/src/billing/billing.spec.ts`: DB-backed HTTP and domain tests.
- Create `apps/api/src/billing/onboarding.guard.spec.ts`: unit tests for guard behavior.
- Modify `HANDOFF.md`: record Sprint 4 outcome and next action.

## Task 1: HTTP Tests First

**Files:**

- Create: `apps/api/src/billing/billing.spec.ts`

- [x] **Step 1: Write failing tests**

Create tests with this shape:

```ts
it('onboards a new client as prepaid and confirms simulated PIX credit', async () => {
  const token = await createNewSessionToken(generateCpf(4101), 'CPF');

  await request(server)
    .post('/billing/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Cliente Pre Pago', planType: 'prepaid' })
    .expect(201);

  const intent = await request(server)
    .post('/billing/pix-intents')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 2500 })
    .expect(201);

  await request(server)
    .post(`/billing/pix-intents/${intent.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  const summary = await request(server)
    .get('/billing/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(summary.body).toMatchObject({
    planType: 'prepaid',
    balanceCents: 2500,
    transactions: [
      expect.objectContaining({
        type: 'credit',
        amountCents: 2500,
        paymentIntentId: intent.body.id,
      }),
    ],
  });
});
```

Also cover postpaid onboarding, unauthenticated billing rejection, invalid payload rejection, duplicate PIX confirmation rejection, and `GET /billing/me` requiring completed onboarding.

- [x] **Step 2: Run red**

Run: `pnpm --filter @bcb/api test -- billing.spec.ts` with `BCB_RUN_DB_TESTS=true`.

Expected: fail because `/billing/*` routes do not exist.

## Task 2: Guard Tests First

**Files:**

- Create: `apps/api/src/billing/onboarding.guard.spec.ts`

- [x] **Step 1: Write failing guard tests**

Test that the guard allows an onboarded authenticated client and throws `ForbiddenException` for a client with missing auth or `requiresOnboarding=true`.

- [x] **Step 2: Run red**

Run: `pnpm --filter @bcb/api test -- onboarding.guard.spec.ts`.

Expected: fail because `OnboardingGuard` does not exist.

## Task 3: Billing Implementation

**Files:**

- Create all `apps/api/src/billing/*.ts` implementation files.
- Modify `apps/api/src/app.module.ts`.

- [x] **Step 1: Implement repository**

Implement Kysely methods:

- `findClientProfile(clientId)`
- `completePrepaidOnboarding(clientId, name)`
- `completePostpaidOnboarding(clientId, name, monthlyLimitCents, usageMonth)`
- `createPixIntent(clientId, amountCents)`
- `confirmPixIntent(clientId, intentId)`
- `listTransactions(clientId, limit)`
- `debitPrepaid(clientId, amountCents, messageId)`
- `consumePostpaid(clientId, amountCents, messageId, usageMonth)`

- [x] **Step 2: Implement service**

Rules:

- Onboarding uses `clientId` from JWT, never request body.
- Prepaid onboarding marks profile incomplete until PIX is confirmed.
- Postpaid onboarding marks profile complete immediately and sets `monthly_limit_cents`, `monthly_used_cents=0`, `usage_month=currentMonth`.
- PIX confirmation is idempotency-strict: already confirmed returns conflict.
- Billing summary returns prepaid or postpaid shape matching shared schemas.
- `chargeMessage()` returns remaining prepaid balance or postpaid usage and throws `INSUFFICIENT_BALANCE`, `INSUFFICIENT_LIMIT`, or `ONBOARDING_REQUIRED`.

- [x] **Step 3: Implement controller**

Endpoints:

- `POST /billing/onboarding`
- `POST /billing/pix-intents`
- `POST /billing/pix-intents/:id/confirm`
- `GET /billing/me`

All endpoints use `JwtAuthGuard`. `GET /billing/me` also uses `OnboardingGuard`.

- [x] **Step 4: Run green**

Run:

```bash
pnpm --filter @bcb/api test -- onboarding.guard.spec.ts
pnpm --filter @bcb/api test -- billing.spec.ts
pnpm --filter @bcb/api test:db
```

Expected: all pass.

## Task 4: Verification and Handoff

- [x] **Step 1: Run final gates**

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm --filter @bcb/api test:db
```

- [x] **Step 2: Update `HANDOFF.md`**

Record implemented endpoints, financial rules, test evidence, operational notes, and Sprint 5 as next action.

- [x] **Step 3: Ask for commit approval**

Suggested commit:

```bash
git add apps/api/src/billing apps/api/src/app.module.ts docs/superpowers/plans/2026-06-10-sprint-4-onboarding-billing.md HANDOFF.md
git commit -m "feat(api): add onboarding and billing rules"
```
