# Sprint 8 - Login e onboarding web

Status: implementada e verificada em 2026-06-10.

## Objetivo

Conectar a shell Angular aos endpoints de autenticação e onboarding já existentes no backend, criando o primeiro fluxo frontend real: documento/senha, inferência CPF/CNPJ, sessão JWT persistida, escolha de plano, PIX simulado e redirects para conversas.

## Escopo

- Adicionar `@bcb/shared` como dependência do `@bcb/web`.
- Prover `HttpClient` no bootstrap.
- Criar client HTTP simples para API com base URL `http://localhost:3000` e header Bearer.
- Reestruturar `SessionStore` para persistir sessão real em `bcb.session`:
  - `token`
  - `requiresOnboarding`
  - `client`
- Login:
  - Formulário com documento e senha.
  - Normalização/inferência de CPF/CNPJ com `@bcb/shared`.
  - Validação client-side via `AuthSessionRequestSchema`.
  - `POST /auth/session`.
  - Redirect para `/onboarding` se `requiresOnboarding=true`, senão `/conversations`.
  - Estados de loading, erro e sucesso.
- Onboarding:
  - Formulário com nome e plano.
  - Pré-pago: seleção de crédito inicial, `POST /billing/onboarding`, `POST /billing/pix-intents`, confirmação `POST /billing/pix-intents/:id/confirm`.
  - Pós-pago: limite mensal, `POST /billing/onboarding` e redirect para `/conversations`.
  - Atualização da sessão persistida após onboarding.
- Ajustar guards para depender da sessão real, mantendo compatibilidade apenas onde necessário para testes antigos removidos.
- Atualizar Playwright para validar payloads HTTP com `route.fulfill`, sem depender de API/banco no e2e estático.

## Fora do escopo

- Integração visual de conversas reais.
- Billing real detalhado.
- WebSocket no cliente.
- E2E fullstack com backend real; fica para Sprint 10.
- Runner unitário Angular completo; Playwright continua sendo o gate efetivo do web nesta sprint.

## TDD

1. Playwright login
   - [x] Documento inválido mostra erro sem chamar API.
   - [x] Conta nova/autoregistro recebe `requiresOnboarding=true` e vai para `/onboarding`.
   - [x] Conta ativa recebe `requiresOnboarding=false` e vai para `/conversations`.

2. Playwright onboarding pré-pago
   - [x] Envia `POST /billing/onboarding` com `{ name, planType: 'prepaid' }`.
   - [x] Cria PIX com `amountCents`.
   - [x] Confirma PIX e vai para `/conversations`.

3. Playwright onboarding pós-pago
   - [x] Envia `POST /billing/onboarding` com `monthlyLimitCents`.
   - [x] Atualiza sessão e vai para `/conversations`.

## Implementacao

- [x] `apps/web/src/main.ts`: adicionar `provideHttpClient`.
- [x] `apps/web/src/app/core/api/api-client.service.ts`: base URL e helper de headers.
- [x] `apps/web/src/app/core/auth/session.store.ts`: sessão real.
- [x] `apps/web/src/app/core/auth/auth-api.service.ts`: `POST /auth/session`.
- [x] `apps/web/src/app/core/auth/auth.guard.ts`: redirects por sessão real.
- [x] `apps/web/src/app/features/auth/login-page.component.ts`: formulário real.
- [x] `apps/web/src/app/features/onboarding/onboarding-api.service.ts`: endpoints billing.
- [x] `apps/web/src/app/features/onboarding/onboarding-page.component.ts`: formulário real e PIX simulado.
- [x] `apps/web/src/assets/i18n/*.json`: textos/erros.
- [x] `apps/web/e2e/shell.spec.ts`: manter shell/guards com sessão real.
- [x] `apps/web/e2e/auth-onboarding.spec.ts`: fluxos Sprint 8 com mocks HTTP.
- [x] `.prettierignore`: ignorar `pnpm-lock.yaml` e artefatos gerados para evitar churn de formatação.

## Verificacao

- [x] `pnpm --filter @bcb/web build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`
- [x] Checagem visual desktop/mobile via Playwright screenshot
- [x] `pnpm exec prettier --check ...` nos arquivos tocados

## Evidencia TDD

- Red inicial: Playwright falhou por ausencia dos campos `Documento`/`Senha`/`Nome` e por guards ainda lendo chaves antigas.
- Green parcial: 6/8 testes passaram; duas falhas restantes eram seletor ambíguo `CPF`/`CNPJ`.
- Green final: 8/8 testes Playwright passaram.

## Commit sugerido

`feat(web): add login and onboarding flows`
