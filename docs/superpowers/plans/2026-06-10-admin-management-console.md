# Admin Management Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the official administration section with a secure admin login, protected client management API, and Angular admin console.

**Architecture:** Keep a single login page. The backend is the only authority for `role`: it derives role from the account, signs it into the JWT, and protects admin endpoints with `JwtAuthGuard`, `RolesGuard`, and `@Roles('admin')`. The frontend reads the returned session only to route and render admin UI; it never sends or edits role.

**Tech Stack:** NestJS, Kysely/PostgreSQL, bcryptjs, Zod shared contracts, Supertest DB tests, Angular standalone, Playwright, OpenAPI.

---

## File Structure

- Modify `packages/shared/src/documents.ts`: add the special admin CPF constant and login-document schema that accepts valid CPF/CNPJ plus the admin CPF.
- Modify `packages/shared/src/schemas/auth.ts`: use the login-document schema for auth payload/JWT/client responses.
- Modify `packages/shared/src/schemas/billing.ts`: add admin client list/detail/update schemas and request schemas for create, status, credit, limit and plan conversion.
- Modify `apps/api/src/auth/*`: use `BCB_ADMIN_PASSWORD`, seed-compatible admin login, and keep role immutable.
- Modify `apps/api/src/database/seed-data.ts` and `seed.ts`: seed admin CPF `00000000000` with env/default password and zeroed profile.
- Create `apps/api/src/admin/*`: `AdminModule`, `AdminController`, `AdminService`, `AdminRepository`, `admin.spec.ts`.
- Modify `apps/api/src/app.module.ts`: register `AdminModule`.
- Modify `apps/api/src/openapi/*`: document `/admin/clients` endpoints and schemas.
- Create `apps/web/src/app/features/admin/*`: API service and page component.
- Modify `apps/web/src/app/core/auth/*`, `app.routes.ts`, `app.component.ts`, login page and translations for role-aware redirects/guards/admin nav.
- Modify Playwright specs to cover admin login, admin-only route, listing and management actions.
- Update `README.md` and `HANDOFF.md`.

## Task 1: Admin Identity And Login Contract

- [x] Add a failing shared contract test proving `00000000000` is accepted only by auth/login schema while generic CPF validation still rejects repeated digits.
- [x] Add failing API DB tests proving admin login works with default password, returns `role='admin'`, and invalid non-admin documents are still rejected.
- [x] Implement `ADMIN_DOCUMENT_ID = '00000000000'`, `LoginDocumentIdSchema`, and env-based `BCB_ADMIN_PASSWORD` with fallback `Admin@123`.
- [x] Update seed to create the admin account from the env/default password, with zeroed profile and no account-backed recipient row.
- [x] Verify shared tests and auth DB tests pass.

## Task 2: Protected Admin Client Management API

- [x] Add failing Supertest coverage for admin endpoints: client can not access, admin can list clients, role is read-only, and admin can update active status, add prepaid credit, adjust postpaid limit, and convert plans.
- [x] Implement shared admin schemas and API module/repository/service/controller.
- [x] Ensure all admin routes use `JwtAuthGuard`, `RolesGuard`, and `@Roles('admin')`.
- [x] Store all financial admin changes in `billing_transactions`; use `adjustment` entries for administrative financial changes.
- [x] Verify admin DB tests pass.

## Task 3: Admin Console Frontend

- [x] Add failing Playwright coverage for login redirecting admin to `/admin` from the same login page.
- [x] Add failing Playwright coverage for admin route guard and the admin management screen.
- [x] Implement `adminGuard`, role-aware login redirect, admin nav item, `AdminApiService`, and `AdminPageComponent`.
- [x] Render role as read-only text and omit any role field from mutation payloads.
- [x] Verify Playwright mock suite passes.

## Task 4: OpenAPI, Docker Docs And Final Gates

- [x] Update OpenAPI operations/schemas for admin endpoints and verify `openapi.spec.ts` fails before metadata is complete if a route is missing.
- [x] Update README with admin CPF, `BCB_ADMIN_PASSWORD`, default password, and admin console path.
- [x] Update HANDOFF with admin implementation notes, gates and next action.
- [x] Run final gates: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter @bcb/api test:db`, `pnpm format:check`, Playwright mock/full-stack, Docker config/build/up as needed.
- [x] Commit the coherent block as `feat(admin): add management console`.
