# Sprint 0 Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the executable monorepo foundation for BCB with pnpm workspaces, minimal API/web/shared packages, lint/build/test scripts, env samples, and Docker Compose base services.

**Architecture:** Keep Sprint 0 intentionally thin: each package has one smoke-level runtime surface and package-local scripts, while root scripts orchestrate with `pnpm -r`. API uses minimal NestJS services/controllers without persistence; web uses Angular standalone bootstrap and routes; shared exports a tiny smoke utility so the package can prove compilation and test wiring before real contracts arrive in Sprint 1.

**Tech Stack:** Node 22 target in Docker, pnpm 10, TypeScript 6.0.3, NestJS 11.1.26, Angular 22.0.0, Tailwind CSS 4.3.0, Vitest 4.1.8 for shared, Jest 30.4.2 + ts-jest 29.4.11 for API smoke tests.

---

## Version Note

The master plan mentions "TypeScript 5" as the original target. On 2026-06-09, `@angular/core` and `@angular/cli` latest are `22.0.0`, and `@angular/compiler-cli@22.0.0` declares `typescript: >=6.0 <6.1`. Sprint 0 therefore uses TypeScript `6.0.3` to satisfy Angular 22. This is a scaffold-version adjustment, not a business-rule change.

## File Structure

- `package.json`: root package manager metadata and orchestration scripts.
- `pnpm-workspace.yaml`: workspace package discovery.
- `tsconfig.base.json`: strict shared TypeScript defaults.
- `eslint.config.mjs`: flat ESLint config for TypeScript files.
- `.prettierrc.json`: formatting defaults.
- `.gitignore`: generated artifacts and local env files.
- `.env.example`: all envs named by the implementation plan.
- `packages/shared`: package for future contracts; Sprint 0 only proves TypeScript, Vitest, and exports.
- `apps/api`: minimal NestJS HTTP API with `/health`, build, lint, and Jest smoke test.
- `apps/web`: minimal Angular standalone app with planned routes and Tailwind-ready styles.
- `docker-compose.yml`: PostgreSQL plus base API and web services using `node:22-slim`.

---

### Task 1: Root Workspace Tooling

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.gitignore`

- [x] **Step 1: Create root package and workspace metadata**

Create `package.json`:

```json
{
  "name": "big-chat-brasil-irrah",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "engines": {
    "node": ">=22 <25",
    "pnpm": ">=10 <11"
  },
  "scripts": {
    "lint": "pnpm -r --if-present lint",
    "test": "pnpm -r --if-present test",
    "test:api": "pnpm --filter @bcb/api test",
    "test:web": "pnpm --filter @bcb/web test",
    "test:shared": "pnpm --filter @bcb/shared test",
    "test:e2e": "pnpm --filter @bcb/web test:e2e",
    "build": "pnpm -r --if-present build",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "22.19.20",
    "eslint": "10.4.1",
    "prettier": "3.8.4",
    "typescript": "6.0.3",
    "typescript-eslint": "8.61.0"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [x] **Step 2: Create shared TypeScript, lint, format, and ignore config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": false,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

Create `eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'pnpm-lock.yaml'],
  },
  js.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
];
```

Create `.prettierrc.json`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
.angular/
.turbo/
.nx/
.env
.env.local
.DS_Store
npm-debug.log*
pnpm-debug.log*
```

- [x] **Step 3: Install dependencies**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and install exits with code 0.

- [x] **Step 4: Verify root scripts are discoverable**

Run: `pnpm --version`

Expected: `10.33.0`.

---

### Task 2: Shared Package Smoke Test

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/tsconfig.build.json`
- Test: `packages/shared/src/index.spec.ts`
- Create: `packages/shared/src/index.ts`

- [x] **Step 1: Create package metadata and TypeScript config**

Create `packages/shared/package.json`:

```json
{
  "name": "@bcb/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "eslint .",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "4.1.8"
  },
  "dependencies": {
    "zod": "4.4.3"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/shared/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/**/*.spec.ts"]
}
```

- [x] **Step 2: Write the failing shared package test**

Create `packages/shared/src/index.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getSharedPackageName } from './index';

describe('shared package smoke test', () => {
  it('exposes the shared package name for workspace wiring', () => {
    expect(getSharedPackageName()).toBe('@bcb/shared');
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @bcb/shared test`

Expected: FAIL because `./index` or `getSharedPackageName` does not exist yet.

- [x] **Step 4: Implement minimal shared export**

Create `packages/shared/src/index.ts`:

```ts
export const sharedPackageName = '@bcb/shared';

export function getSharedPackageName(): string {
  return sharedPackageName;
}
```

- [x] **Step 5: Verify shared package**

Run: `pnpm --filter @bcb/shared test`

Expected: PASS with 1 test.

Run: `pnpm --filter @bcb/shared build`

Expected: PASS and `packages/shared/dist/index.js` exists.

Run: `pnpm --filter @bcb/shared lint`

Expected: PASS.

---

### Task 3: API Base Package

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/jest.config.cjs`
- Test: `apps/api/src/app.service.spec.ts`
- Create: `apps/api/src/app.service.ts`
- Create: `apps/api/src/app.controller.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/main.ts`

- [x] **Step 1: Create API package metadata and config**

Create `apps/api/package.json`:

```json
{
  "name": "@bcb/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "eslint .",
    "start": "node dist/main.js",
    "start:dev": "tsx watch src/main.ts",
    "test": "jest --config jest.config.cjs"
  },
  "dependencies": {
    "@nestjs/common": "11.1.26",
    "@nestjs/core": "11.1.26",
    "@nestjs/platform-express": "11.1.26",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.2"
  },
  "devDependencies": {
    "@nestjs/testing": "11.1.26",
    "@types/jest": "30.0.0",
    "jest": "30.4.2",
    "ts-jest": "29.4.11",
    "tsx": "4.22.4"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "isolatedModules": true,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": false,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*.ts"]
}
```

Create `apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/**/*.spec.ts"]
}
```

Create `apps/api/jest.config.cjs`:

```js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  testEnvironment: 'node',
};
```

- [x] **Step 2: Write the failing API smoke test**

Create `apps/api/src/app.service.spec.ts`:

```ts
import { AppService } from './app.service';

describe('AppService', () => {
  it('returns the API health payload', () => {
    const service = new AppService();

    expect(service.getHealth()).toEqual({
      service: '@bcb/api',
      status: 'ok',
    });
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @bcb/api test`

Expected: FAIL because `./app.service` does not exist yet.

- [x] **Step 4: Implement minimal Nest API**

Create `apps/api/src/app.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

export type HealthResponse = {
  service: '@bcb/api';
  status: 'ok';
};

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      service: '@bcb/api',
      status: 'ok',
    };
  }
}
```

Create `apps/api/src/app.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService, type HealthResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
```

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 3000);
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

  app.enableCors({ origin: corsOrigin });

  await app.listen(port);
}

void bootstrap();
```

- [x] **Step 5: Verify API package**

Run: `pnpm --filter @bcb/api test`

Expected: PASS with 1 test.

Run: `pnpm --filter @bcb/api build`

Expected: PASS and `apps/api/dist/main.js` exists.

Run: `pnpm --filter @bcb/api lint`

Expected: PASS.

---

### Task 4: Web Base Package

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.app.json`
- Create: `angular.json`
- Create: `postcss.config.mjs`
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/index.html`

- [x] **Step 1: Create Angular package metadata and config**

Create `apps/web/package.json`:

```json
{
  "name": "@bcb/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "ng build",
    "lint": "eslint .",
    "start": "ng serve --host 0.0.0.0",
    "test": "echo \"@bcb/web component tests start in Sprint 7\"",
    "test:e2e": "echo \"@bcb/web e2e tests start in Sprint 10\""
  },
  "dependencies": {
    "@angular/common": "22.0.0",
    "@angular/compiler": "22.0.0",
    "@angular/core": "22.0.0",
    "@angular/forms": "22.0.0",
    "@angular/platform-browser": "22.0.0",
    "@angular/router": "22.0.0",
    "@ngx-translate/core": "18.0.0",
    "rxjs": "7.8.2",
    "socket.io-client": "4.8.3",
    "tslib": "2.8.1",
    "zone.js": "0.16.0"
  },
  "devDependencies": {
    "@angular/build": "22.0.0",
    "@angular/cli": "22.0.0",
    "@angular/compiler-cli": "22.0.0",
    "@tailwindcss/postcss": "4.3.0",
    "tailwindcss": "4.3.0"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": []
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

Create `apps/web/tsconfig.app.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc/app",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": ["src/**/*.d.ts"]
}
```

Create root `angular.json`:

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "bcb-web": {
      "projectType": "application",
      "root": "apps/web",
      "sourceRoot": "apps/web/src",
      "prefix": "bcb",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "apps/web/src/main.ts",
            "index": "apps/web/src/index.html",
            "outputPath": "dist/apps/web",
            "styles": ["apps/web/src/styles.css"],
            "tsConfig": "apps/web/tsconfig.app.json"
          },
          "configurations": {
            "production": {
              "optimization": true,
              "sourceMap": false
            },
            "development": {
              "optimization": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "bcb-web:build:production"
            },
            "development": {
              "buildTarget": "bcb-web:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}
```

Create `postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [x] **Step 2: Create minimal Angular app shell**

Create `apps/web/src/main.ts`:

```ts
import 'zone.js';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet, type Routes } from '@angular/router';

@Component({
  selector: 'bcb-placeholder-view',
  standalone: true,
  template: '<p class="text-sm text-slate-600 dark:text-slate-300">BCB route ready.</p>',
})
export class PlaceholderViewComponent {}

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: PlaceholderViewComponent },
  { path: 'onboarding', component: PlaceholderViewComponent },
  { path: 'conversations', component: PlaceholderViewComponent },
  { path: 'conversations/:conversationId', component: PlaceholderViewComponent },
  { path: 'billing', component: PlaceholderViewComponent },
];

@Component({
  selector: 'bcb-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
        <header
          class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800"
        >
          <h1 class="text-xl font-semibold">Big Chat Brasil</h1>
          <span class="text-sm text-slate-500 dark:text-slate-400">Sprint 0</span>
        </header>
        <router-outlet />
      </section>
    </main>
  `,
})
export class AppComponent {}

void bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
```

Create `apps/web/src/styles.css`:

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

html,
body {
  min-height: 100%;
  margin: 0;
}

body {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}
```

Create `apps/web/src/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Big Chat Brasil</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <bcb-root></bcb-root>
  </body>
</html>
```

- [x] **Step 3: Verify web package**

Run: `pnpm --filter @bcb/web build`

Expected: PASS and `dist/apps/web/browser/index.html` exists.

Run: `pnpm --filter @bcb/web lint`

Expected: PASS.

---

### Task 5: Environment and Docker Compose

**Files:**

- Create: `.env.example`
- Create: `docker-compose.yml`

- [x] **Step 1: Create environment sample**

Create `.env.example`:

```env
DATABASE_URL=postgres://bcb:bcb@localhost:5432/bcb
JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=1d
API_PORT=3000
CORS_ORIGIN=http://localhost:4200
QUEUE_SENT_DELAY_MS=500
QUEUE_DELIVERED_DELAY_MS=1000
RECIPIENT_SIMULATOR_ENABLED=true
RECIPIENT_SIMULATOR_READ_DELAY_MS=1500
RECIPIENT_SIMULATOR_TYPING_MS=2000
```

- [x] **Step 2: Create Docker Compose base services**

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: bcb
      POSTGRES_PASSWORD: bcb
      POSTGRES_DB: bcb
    ports:
      - '5432:5432'
    volumes:
      - bcb-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U bcb -d bcb']
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    image: node:22-slim
    working_dir: /workspace
    command: >
      sh -c "corepack enable &&
      corepack prepare pnpm@10.33.0 --activate &&
      pnpm install --frozen-lockfile &&
      pnpm --filter @bcb/api start:dev"
    environment:
      DATABASE_URL: postgres://bcb:bcb@db:5432/bcb
      JWT_SECRET: dev-secret-change-me
      JWT_EXPIRES_IN: 1d
      API_PORT: 3000
      CORS_ORIGIN: http://localhost:4200
      QUEUE_SENT_DELAY_MS: 500
      QUEUE_DELIVERED_DELAY_MS: 1000
      RECIPIENT_SIMULATOR_ENABLED: 'true'
      RECIPIENT_SIMULATOR_READ_DELAY_MS: 1500
      RECIPIENT_SIMULATOR_TYPING_MS: 2000
    ports:
      - '3000:3000'
    volumes:
      - .:/workspace
    depends_on:
      db:
        condition: service_healthy

  web:
    image: node:22-slim
    working_dir: /workspace
    command: >
      sh -c "corepack enable &&
      corepack prepare pnpm@10.33.0 --activate &&
      pnpm install --frozen-lockfile &&
      pnpm --filter @bcb/web start"
    environment:
      API_BASE_URL: http://localhost:3000
    ports:
      - '4200:4200'
    volumes:
      - .:/workspace
    depends_on:
      - api

volumes:
  bcb-postgres-data:
```

- [x] **Step 3: Verify Docker Compose parses**

Run: `docker compose config`

Expected: PASS and rendered services include `db`, `api`, and `web`.

Run: `docker compose up --detach db`

Expected: PostgreSQL container becomes healthy.

Run: `docker compose down`

Expected: containers stop cleanly; volume can remain.

---

### Task 6: Sprint 0 Gates and Commit

**Files:**

- Modify: `HANDOFF.md`
- All Sprint 0 files.

- [x] **Step 1: Run full Sprint 0 gates**

Run: `pnpm lint`

Expected: PASS.

Run: `pnpm test`

Expected: PASS. API has 1 Jest test, shared has 1 Vitest test, web prints Sprint 7 placeholder.

Run: `pnpm build`

Expected: PASS for `@bcb/api`, `@bcb/shared`, and `@bcb/web`.

- [x] **Step 2: Update handoff**

Update `HANDOFF.md`:

```md
## Estado atual (2026-06-09)

- Planejamento commitado em `fed6f79`.
- Branch de implementação: `sprint-0-monorepo`.
- Sprint 0 implementada: pnpm workspace, `@bcb/shared`, `@bcb/api`, `@bcb/web`, `.env.example` e `docker-compose.yml`.
- Gates Sprint 0 executados: `pnpm lint`, `pnpm test`, `pnpm build`, `docker compose config`, `docker compose up --detach db`, `docker compose down`.

## Sua próxima ação

1. Revisar e commitar a Sprint 0, se ainda não estiver commitada.
2. Iniciar Sprint 1 somente após o commit da Sprint 0.
```

Preserve the still-relevant rules and warnings already present in the file.

- [x] **Step 3: Review staged diff**

Run: `git status --short`

Expected: New files from Sprint 0 only.

Run: `git diff --stat`

Expected: Sprint 0 scaffold files only.

- [x] **Step 4: Ask Yan before commit**

Ask before committing:

```text
Sprint 0 gates are green. Posso commitar este bloco como `chore: scaffold monorepo workspace`?
```

If approved:

```bash
git add .
git commit -m "chore: scaffold monorepo workspace"
```
