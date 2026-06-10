# Sprint 3 Auth JWT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build document-password authentication with account auto-creation, bcrypt password handling, JWT sessions, `/auth/me`, and reusable JWT/role guards.

**Architecture:** The API owns authentication through a focused `AuthModule` that uses Kysely via `DatabaseService`, validates contracts with `@bcb/shared` Zod schemas, hashes passwords with `bcryptjs`, and signs/verifies JWTs with `@nestjs/jwt`. New document logins create an `accounts` row plus a minimal `client_profiles` row with `onboarding_completed=false`; future onboarding sprints replace placeholder profile data.

**Tech Stack:** NestJS 11, Kysely, PostgreSQL, `bcryptjs`, `@nestjs/jwt@11.0.2`, Jest, Supertest.

---

## Scope

Sprint 3 formal scope from `IMPLEMENTATION_PLAN.md`:

- `POST /auth/session`
- Hash new passwords with bcryptjs.
- Compare existing password hashes on login.
- JWT payload includes account id, client id, role, document id, document type, and onboarding requirement.
- JWT and roles guards.
- `GET /auth/me`.
- Tests for creation, login, wrong password, invalid document, and JWT payload.

## File Structure

- Modify `packages/shared/src/schemas/auth.ts`: add `requiresOnboarding` to `JwtPayloadSchema`.
- Modify `apps/api/package.json`: add auth dependencies and broaden `test:db`.
- Create `apps/api/src/auth/auth.config.ts`: JWT secret, expiry, and bcrypt rounds.
- Create `apps/api/src/auth/auth.types.ts`: authenticated request and account/profile query row types.
- Create `apps/api/src/auth/auth.repository.ts`: database reads/writes for account and profile records.
- Create `apps/api/src/auth/auth.service.ts`: session creation, password verification, JWT signing, and current-user lookup.
- Create `apps/api/src/auth/auth.controller.ts`: HTTP contract for `/auth/session` and `/auth/me`.
- Create `apps/api/src/auth/auth.module.ts`: module wiring for `JwtModule`, controller, service, repository, and guards.
- Create `apps/api/src/auth/jwt-auth.guard.ts`: Bearer token verification and request decoration.
- Create `apps/api/src/auth/roles.decorator.ts`: `@Roles()` decorator.
- Create `apps/api/src/auth/roles.guard.ts`: route role enforcement.
- Create `apps/api/src/auth/auth.spec.ts`: DB-backed HTTP tests through Nest app and Supertest.
- Create `apps/api/src/auth/roles.guard.spec.ts`: focused unit tests for role guard behavior.
- Modify `apps/api/src/app.module.ts`: import `AuthModule`.
- Modify `HANDOFF.md`: record Sprint 3 status, tests, dependencies, and next sprint.

## Task 1: Shared JWT Contract

- [x] **Step 1: Write the failing contract test**

Add a case to `packages/shared/src/schemas/contracts.spec.ts` showing that JWT payloads require `requiresOnboarding`:

```ts
expect(
  JwtPayloadSchema.parse({
    sub: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    role: 'client',
    documentId: '52998224725',
    documentType: 'CPF',
    requiresOnboarding: true,
  }),
).toMatchObject({ requiresOnboarding: true });
```

- [x] **Step 2: Run red**

Run: `pnpm --filter @bcb/shared test -- contracts.spec.ts`

Expected: fail because `requiresOnboarding` is stripped or missing from `JwtPayloadSchema`.

- [x] **Step 3: Implement contract**

Modify `packages/shared/src/schemas/auth.ts`:

```ts
export const JwtPayloadSchema = z.object({
  sub: IdSchema,
  documentId: DocumentIdSchema,
  documentType: DocumentTypeSchema,
  role: RoleSchema,
  clientId: IdSchema.optional(),
  requiresOnboarding: z.boolean(),
});
```

- [x] **Step 4: Run green**

Run: `pnpm --filter @bcb/shared test -- contracts.spec.ts`

Expected: pass.

## Task 2: Auth HTTP Behavior

- [x] **Step 1: Add failing HTTP tests**

Create `apps/api/src/auth/auth.spec.ts` with DB-backed Supertest cases:

```ts
it('creates a client account for a new CPF and returns an onboarding JWT', async () => {
  const response = await request(server)
    .post('/auth/session')
    .send({ documentId: generatedCpf, documentType: 'CPF', password: 'NewUser@123' })
    .expect(201);

  expect(response.body.requiresOnboarding).toBe(true);
  expect(response.body.client.documentId).toBe(generatedCpf);
  expect(await verifyToken(response.body.token)).toMatchObject({
    documentId: generatedCpf,
    documentType: 'CPF',
    role: 'client',
    requiresOnboarding: true,
  });
});
```

Also include tests for seeded login, wrong password, invalid document, and `/auth/me`.

- [x] **Step 2: Run red**

Run: `pnpm --filter @bcb/api test -- auth.spec.ts` with `BCB_RUN_DB_TESTS=true`

Expected: fail because `@nestjs/jwt`, `supertest`, and `AuthModule` do not exist yet.

## Task 3: Auth Implementation

- [x] **Step 1: Add dependencies**

Run:

```bash
pnpm --filter @bcb/api add @nestjs/jwt
pnpm --filter @bcb/api add -D supertest @types/supertest
```

- [x] **Step 2: Implement auth files**

Implement:

- `AuthRepository.findIdentityByDocument(documentId)`
- `AuthRepository.createClientIdentity(request, passwordHash)`
- `AuthRepository.findIdentityByAccountId(accountId)`
- `AuthService.createSession(request)`
- `AuthService.getCurrentClient(payload)`
- `JwtAuthGuard.canActivate(context)`
- `RolesGuard.canActivate(context)`

HTTP responses use `AuthSessionResponseSchema` and `AuthMeResponseSchema`. Wrong credentials throw `UnauthorizedException`; invalid bodies throw `BadRequestException`.

- [x] **Step 3: Run green**

Run: `pnpm --filter @bcb/api test:db`

Expected: pass.

## Task 4: Guards

- [x] **Step 1: Add guard unit tests**

Create `apps/api/src/auth/roles.guard.spec.ts` with cases for unrestricted routes, matching roles, and mismatched roles.

- [x] **Step 2: Run red/green**

Run: `pnpm --filter @bcb/api test -- roles.guard.spec.ts`

Expected: fail before `RolesGuard`, pass after implementation.

## Task 5: Verification and Handoff

- [x] **Step 1: Run full gates**

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm --filter @bcb/api test:db
```

- [x] **Step 2: Update `HANDOFF.md`**

Record implemented endpoints, dependencies, commands run, and next recommended sprint.

- [x] **Step 3: Commit after user approval**

Suggested commit:

```bash
git add docs/superpowers/plans/2026-06-09-sprint-3-auth-jwt.md packages/shared/src/schemas/auth.ts packages/shared/src/schemas/contracts.spec.ts apps/api/package.json apps/api/src/auth apps/api/src/app.module.ts HANDOFF.md pnpm-lock.yaml
git commit -m "feat(api): implement jwt auth with document login"
```
