# Sprint 2 Database Kysely Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real PostgreSQL persistence to the API with Kysely migrations, typed table definitions, deterministic test document helpers, and demo seed data.

**Architecture:** Keep database ownership in `apps/api/src/database`, with a NestJS `DatabaseModule` exposing a Kysely instance and CLI scripts for migrations and seed. Keep generated CPF/CNPJ helpers in `@bcb/shared/testing` so seed and future integration tests never invent invalid documents.

**Tech Stack:** NestJS 11, PostgreSQL 17, Kysely `0.29.2`, `pg` `8.21.0`, `bcryptjs` `3.0.3`, Jest integration tests, Vitest shared package tests.

---

## File Structure

- Create `packages/shared/src/testing/documents.ts`: deterministic `generateCpf()` and `generateCnpj()` helpers.
- Create `packages/shared/src/testing/index.ts`: testing subpath barrel.
- Modify `packages/shared/package.json`: export `./testing`.
- Create `packages/shared/src/testing/documents.spec.ts`: valid, deterministic generator coverage.
- Modify `apps/api/package.json`: add Kysely/pg/bcrypt/shared dependencies and `db:*` scripts.
- Create `apps/api/migrations/001_initial_schema.ts`: initial PostgreSQL schema.
- Create `apps/api/src/database/database.types.ts`: manual Kysely table types matching the migration.
- Create `apps/api/src/database/database.config.ts`: database URL resolution with safe local default.
- Create `apps/api/src/database/database.service.ts`: NestJS injectable Kysely wrapper.
- Create `apps/api/src/database/database.module.ts`: exports `DatabaseService`.
- Create `apps/api/src/database/migrations.ts`: named Kysely migration provider.
- Create `apps/api/src/database/migrate.ts`: CLI for `up`, `down`, `latest`.
- Create `apps/api/src/database/seed-data.ts`: pure demo fixture definitions and validation.
- Create `apps/api/src/database/seed.ts`: idempotent seed runner.
- Create `apps/api/src/database/testing.ts`: reset and seed helper for DB integration tests.
- Create `apps/api/src/database/database.integration.spec.ts`: PostgreSQL integration test gated by `BCB_RUN_DB_TESTS=true`.
- Modify `apps/api/src/app.module.ts`: import `DatabaseModule`.
- Modify `HANDOFF.md`: record Sprint 2 state and gates before stopping.

## Task 1: Shared Testing Document Generators

**Files:**

- Create: `packages/shared/src/testing/documents.spec.ts`
- Create: `packages/shared/src/testing/documents.ts`
- Create: `packages/shared/src/testing/index.ts`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { generateCnpj, generateCpf } from './documents';
import { isValidCnpj, isValidCpf } from '../documents';

describe('testing document generators', () => {
  it('generates deterministic valid CPFs', () => {
    expect(generateCpf(1)).toBe(generateCpf(1));
    expect(generateCpf(1)).not.toBe(generateCpf(2));
    expect(generateCpf(1)).toHaveLength(11);
    expect(isValidCpf(generateCpf(1))).toBe(true);
  });

  it('generates deterministic valid CNPJs', () => {
    expect(generateCnpj(1)).toBe(generateCnpj(1));
    expect(generateCnpj(1)).not.toBe(generateCnpj(2));
    expect(generateCnpj(1)).toHaveLength(14);
    expect(isValidCnpj(generateCnpj(1))).toBe(true);
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @bcb/shared test`
Expected: fail because `./documents` under `src/testing` does not exist.

- [ ] **Step 3: Implement generators and subpath export**

Use CPF/CNPJ check digit algorithms matching `packages/shared/src/documents.ts`. Add package export:

```json
"./testing": {
  "types": "./dist/testing/index.d.ts",
  "default": "./dist/testing/index.js"
}
```

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter @bcb/shared test`
Expected: all shared tests pass.

## Task 2: Database Dependencies And NestJS Kysely Boundary

**Files:**

- Modify: `apps/api/package.json`
- Create: `apps/api/src/database/database.config.ts`
- Create: `apps/api/src/database/database.types.ts`
- Create: `apps/api/src/database/database.service.ts`
- Create: `apps/api/src/database/database.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add package dependencies**

Run:

```bash
pnpm --filter @bcb/api add kysely@0.29.2 pg@8.21.0 bcryptjs@3.0.3 @bcb/shared@workspace:*
pnpm --filter @bcb/api add -D @types/pg@8.20.0
```

- [ ] **Step 2: Write a config unit test first**

Create `apps/api/src/database/database.config.spec.ts`:

```ts
import { getDatabaseUrl } from './database.config';

describe('getDatabaseUrl', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it('uses DATABASE_URL when present', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/custom';
    expect(getDatabaseUrl()).toBe('postgres://user:pass@localhost:5432/custom');
  });

  it('falls back to the local compose database URL', () => {
    delete process.env.DATABASE_URL;
    expect(getDatabaseUrl()).toBe('postgres://bcb:bcb@localhost:5432/bcb');
  });
});
```

- [ ] **Step 3: Verify RED**

Run: `pnpm --filter @bcb/api test -- database.config.spec.ts`
Expected: fail because `database.config.ts` does not exist.

- [ ] **Step 4: Implement database config, types, service and module**

`database.types.ts` mirrors the migration with snake_case columns and Kysely `Generated`/`ColumnType` helpers. `DatabaseService` owns the `new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })` instance and closes the pool in `onModuleDestroy()`.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm --filter @bcb/api test -- database.config.spec.ts`
Expected: pass.

## Task 3: Migrations And CLI

**Files:**

- Create: `apps/api/migrations/001_initial_schema.ts`
- Create: `apps/api/src/database/migrations.ts`
- Create: `apps/api/src/database/migrate.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Write a DB integration test for schema and tables**

Create `apps/api/src/database/database.integration.spec.ts` gated by `BCB_RUN_DB_TESTS=true`. The test runs migrations against the configured PostgreSQL database and selects from `accounts`, `client_profiles`, `recipients`, `conversations`, `messages`, `billing_transactions`, and `payment_intents`.

- [ ] **Step 2: Verify RED with PostgreSQL running**

Run:

```bash
docker compose up --detach db
BCB_RUN_DB_TESTS=true pnpm --filter @bcb/api test -- database.integration.spec.ts --runInBand
```

Expected: fail because migration files do not exist.

- [ ] **Step 3: Implement migration provider and CLI**

Use Kysely `Migrator` with an in-memory `MigrationProvider` that returns `001_initial_schema`. Migration creates:

- `accounts`
- `client_profiles`
- `recipients`
- `conversations`
- `messages`
- `billing_transactions`
- `payment_intents`

Use explicit foreign keys, unique constraints, `created_at`/`updated_at` timestamps, integer cents, and check constraints for enum values.

- [ ] **Step 4: Verify migration CLI**

Run:

```bash
pnpm --filter @bcb/api db:migrate
```

Expected: migrations complete without errors.

## Task 4: Seed Definitions And Idempotent Seed Runner

**Files:**

- Create: `apps/api/src/database/seed-data.ts`
- Create: `apps/api/src/database/seed.ts`
- Create: `apps/api/src/database/testing.ts`
- Modify: `apps/api/src/database/database.integration.spec.ts`

- [ ] **Step 1: Write seed definition tests**

Create `apps/api/src/database/seed-data.spec.ts` to assert the five account fixtures use valid documents, fixed roles/plans, four recipients, and at least one seeded conversation for Empresa ABC.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @bcb/api test -- seed-data.spec.ts`
Expected: fail because `seed-data.ts` does not exist.

- [ ] **Step 3: Implement seed data and runner**

Seed fixed accounts:

- Admin: CPF `52998224725`, password `Admin@123`, role `admin`.
- Empresa ABC: CNPJ `11222333000181`, password `Demo@123`, prepaid balance `2500`.
- Pré-pago sem saldo: CPF `11144477735`, password `Demo@123`, prepaid balance `0`.
- Pós-pago com limite: CNPJ `11444777000161`, password `Demo@123`, postpaid limit `10000`, used `0`.
- Pós-pago no limite: CPF `12345678909`, password `Demo@123`, postpaid limit `1000`, used `1000`.

Seed recipients: Maria Oliveira, Carlos Pereira, Ana Costa, Pedro Santos.

Seed at least two conversations for Empresa ABC, including one with message history.

- [ ] **Step 4: Verify seed**

Run:

```bash
pnpm --filter @bcb/api db:seed
BCB_RUN_DB_TESTS=true pnpm --filter @bcb/api test -- database.integration.spec.ts --runInBand
```

Expected: seed is idempotent and integration test passes.

## Task 5: Gates, Handoff, Commit Approval

**Files:**

- Modify: `HANDOFF.md`

- [ ] **Step 1: Run full gates**

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm --filter @bcb/api db:migrate
pnpm --filter @bcb/api db:seed
BCB_RUN_DB_TESTS=true pnpm --filter @bcb/api test -- database.integration.spec.ts --runInBand
pnpm exec prettier --check docs/superpowers/plans/2026-06-09-sprint-2-database-kysely-seed.md HANDOFF.md apps/api/package.json packages/shared/package.json apps/api/src/database/*.ts apps/api/migrations/*.ts packages/shared/src/testing/*.ts
```

- [ ] **Step 2: Update handoff**

Record implemented files, gates, any DB/container state, and next action.

- [ ] **Step 3: Ask for commit approval**

Suggested commit message:

```bash
feat(api): add kysely migrations and seed data
```
