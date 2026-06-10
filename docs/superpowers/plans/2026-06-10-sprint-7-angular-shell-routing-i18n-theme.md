# Sprint 7 - Shell Angular, rotas, i18n e tema

Status: implementada e verificada em 2026-06-10.

## Objetivo

Trocar o placeholder do Angular por uma shell navegavel do MVP, com rotas profundas, guards baseados em estado local, i18n runtime `pt-BR`/`en-US` e tema claro/escuro persistidos em `localStorage`.

## Escopo

- Extrair `main.ts` para estrutura `src/app`.
- Criar `AppComponent` com layout operacional, nav principal, seletor de idioma e toggle de tema.
- Criar rotas:
  - `/login`
  - `/onboarding`
  - `/conversations`
  - `/conversations/:conversationId`
  - `/billing`
- Criar componentes placeholder por rota com copy traduzida e estados esperados para a proxima sprint.
- Criar `SessionStore` com leitura de `localStorage` para autenticação/onboarding.
- Criar guards:
  - `authGuard`
  - `onboardingGuard`
- Criar `PreferencesService` para idioma/tema, incluindo aplicacao da classe `.dark` no `documentElement`.
- Criar traducoes em `apps/web/src/assets/i18n/pt-BR.json` e `en-US.json`.
- Atualizar Playwright para validar rotas, redirects e persistencia de preferencias.

## Fora do escopo

- Login/onboarding reais via API.
- Chamadas HTTP do frontend.
- Socket.IO no cliente Angular.
- Component tests/unit runner Angular completo; por enquanto o gate visual/e2e cobre a shell.

## TDD

1. Playwright shell e rotas
   - [x] Atualizar `apps/web/e2e/shell.spec.ts` para esperar shell Sprint 7, navegacao e rotas profundas.
   - [x] Rodar `pnpm test:e2e` e observar falha no placeholder atual.

2. Preferencias
   - [x] Testar troca de idioma para `en-US`, reload e persistencia.
   - [x] Testar toggle de tema, reload e classe `.dark` persistida.

3. Guards
   - [x] Testar `/conversations` sem sessao redirecionando para `/login`.
   - [x] Testar sessao autenticada sem onboarding redirecionando para `/onboarding`.
   - [x] Testar sessao autenticada e onboarded permitindo `/conversations/:conversationId`.

## Implementacao

- [x] `apps/web/src/main.ts`: bootstrap standalone com providers.
- [x] `apps/web/src/app/app.component.ts`: shell e controles.
- [x] `apps/web/src/app/app.routes.ts`: rotas e redirects.
- [x] `apps/web/src/app/core/auth/session.store.ts`: estado local de sessao.
- [x] `apps/web/src/app/core/auth/auth.guard.ts`: guards.
- [x] `apps/web/src/app/core/preferences/preferences.service.ts`: idioma/tema.
- [x] `apps/web/src/app/features/*`: paginas placeholder do MVP.
- [x] `apps/web/src/assets/i18n/*.json`: traducoes.
- [x] `apps/web/e2e/shell.spec.ts`: cobertura visual/rotas/preferencias/guards.

## Verificacao

- [x] `pnpm --filter @bcb/web build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`
- [x] Checagem visual manual desktop/mobile via Playwright screenshot em `/tmp`
- [x] `pnpm exec prettier --check ...` nos arquivos tocados

## Commit sugerido

`feat(web): add angular shell routing i18n and theme`
