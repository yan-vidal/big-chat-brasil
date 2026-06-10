# Handoff — Big Chat Brasil (BCB)

> Documento vivo de passagem de bastão entre sessões/agentes. Quem encerrar uma sessão de trabalho **atualiza as seções "Estado atual" e "Sua próxima ação"** antes de parar. Responder e documentar sempre em português (pt-BR).

## O que é este projeto

Desafio técnico da Irrah (plataforma de chat "Big Chat Brasil"), perfil **Fullstack** (avaliação: backend 40%, frontend 40%, integração 20%). A entrega é um repositório público no GitHub que o avaliador roda com `git clone && docker compose up`, seguida de entrevista de live-coding onde o Yan explica decisões e faz pequenas modificações ao vivo. Qualidade > quantidade: corte documentado no README vale mais que feature incompleta.

## Estado atual (2026-06-10)

- Planejamento completo, revisado e commitado em `fed6f79` (`docs: add implementation, architecture and testing plans`).
- Branch de implementação atual: `sprint-0-monorepo`. Ela ainda pode ser usada para continuar o trabalho local sem fragmentar contexto, mas o nome já ficou estreito; antes de push/PR público, considerar renomear para `challenge-implementation` ou `bcb-implementation`.
- **Sprint 0 implementada, verificada e commitada em `df188bc`** (`chore: scaffold monorepo workspace`):
  - `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, ESLint, Prettier e lockfile.
  - `packages/shared` (`@bcb/shared`) com smoke test Vitest e build TypeScript.
  - `apps/api` (`@bcb/api`) com NestJS mínimo, `/health`, smoke test Jest, build e lint.
  - `apps/web` (`@bcb/web`) com Angular 22 standalone, rotas profundas planejadas e Tailwind 4.
  - `.env.example` e `docker-compose.yml` com PostgreSQL, API e web base.
- Plano detalhado da Sprint 0 salvo em `docs/superpowers/plans/2026-06-09-sprint-0-monorepo.md`.
- Gates executados antes do commit `df188bc`:
  - `pnpm --filter @bcb/shared test` falhou primeiro por `./index` ausente e depois passou 1/1.
  - `pnpm --filter @bcb/api test` falhou primeiro por `./app.service` ausente e depois passou 1/1.
  - `pnpm --filter @bcb/web build` falhou primeiro por `baseUrl` depreciado no TypeScript 6; removido e depois passou.
  - `pnpm lint` passou.
  - `pnpm test` passou (`@bcb/api` 1/1, `@bcb/shared` 1/1, `@bcb/web` placeholder de Sprint 7).
  - `pnpm build` passou para API, shared e web.
  - `pnpm exec prettier --check ...` passou nos arquivos novos/alterados com parser conhecido.
  - `docker compose config` passou.
  - `docker compose up --detach db` subiu PostgreSQL `healthy`; `docker compose down` derrubou sem erro.
- Estado operacional ao encerrar Sprint 0: sem containers ativos do Compose; branch local `sprint-0-monorepo` contém o commit de planejamento e o commit de scaffold.
- Handoff pós-Sprint 0 commitado em `382e391` (`docs: update handoff after sprint 0`).
- **Sprint 1 implementada, verificada e commitada em `2e6709a`** (`feat(shared): add contracts and document validation`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-09-sprint-1-shared-contracts.md`.
  - `packages/shared/src/enums.ts`: roles, planos, tipos de documento, prioridades, status, sender, PIX e tipos de transação.
  - `packages/shared/src/documents.ts`: normalização conservadora, CPF/CNPJ por dígito verificador e inferência de tipo.
  - `packages/shared/src/money.ts`: custos de 25/50 centavos e `ESTIMATED_DELIVERY_SECONDS = 5`.
  - `packages/shared/src/schemas/`: common, auth, onboarding, billing, conversation e message.
  - `packages/shared/src/index.ts`: barrel público para API/web.
  - TDD observado: cada módulo começou com teste falhando por import/export ausente e passou após a implementação.
  - Gate isolado: `@bcb/shared` com 5 arquivos e 23 testes passando, lint e build verdes.
  - Gates raiz finais: `pnpm lint`, `pnpm test` e `pnpm build` passaram; Prettier passou no código/plano da Sprint 1.
- **Bloco antecipado de Playwright consolidado no commit `test(web): add playwright smoke check`**:
  - `@playwright/test` `1.60.0` adicionado ao `@bcb/web`; `pnpm test:e2e` chama `@bcb/web test:e2e`.
  - `apps/web/playwright.config.ts` roda um smoke em Chromium desktop usando `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable` quando disponível.
  - O e2e usa build estático (`pnpm build && node e2e/static-server.mjs --port 4200`) em vez de `ng serve`; isso evita a falha de resolução do dev server Angular/Vite sob pnpm e testa um artefato mais próximo do deploy.
  - `apps/web/e2e/shell.spec.ts` abre `/login`, valida textos da shell e também estilos computados (`header` flex, título `20px`/`600`), anexando screenshot `login-shell`.
  - O ciclo red/green visual foi observado: o teste falhou com `header` computado como `display: block`; a causa era o Tailwind não rodando via PostCSS.
  - Correção aplicada: Angular 22 só carrega `postcss.config.json`/`.postcssrc.json`; `postcss.config.mjs` foi removido e substituído por `postcss.config.json`. `apps/web/src/styles.css` ganhou `@source './**/*.{ts,html}'`.
  - Captura visual pós-correção validada: fundo slate, conteúdo centralizado, título à esquerda, `Sprint 0` à direita e separador do header.
  - Gates finais deste bloco passaram: `pnpm lint`, `pnpm test`, `pnpm build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` e `pnpm exec prettier --check ...` nos arquivos tocados.
  - Tudo deste bloco deve permanecer em um único commit coeso: Playwright, servidor estático, PostCSS/Tailwind, ESLint `.mjs`, lockfile, `.gitignore` e este handoff.
- **Sprint 2 - Banco, Kysely e seed implementada, verificada e commitada** (`feat(api): add kysely migrations and seed data`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-09-sprint-2-database-kysely-seed.md`.
  - `@bcb/api` recebeu `kysely`, `pg`, `bcryptjs`, `@types/pg`, dependência workspace de `@bcb/shared`, scripts `db:migrate`, `db:rollback`, `db:seed` e `test:db`.
  - API convertida para ESM/NodeNext para consumir Kysely 0.29 e `@bcb/shared` corretamente; `start` agora aponta para `dist/src/main.js`.
  - `@bcb/shared` também foi ajustado para NodeNext com imports/exports relativos `.js`, mantendo build consumível pelo Node e pelo API.
  - Helpers `generateCpf()`/`generateCnpj()` adicionados em `@bcb/shared/testing`, com testes Vitest.
  - Migration explícita `apps/api/migrations/001_initial_schema.ts` cria `accounts`, `client_profiles`, `recipients`, `conversations`, `messages`, `payment_intents` e `billing_transactions` com constraints, FKs e índices.
  - `apps/api/src/database/` agora contém client Kysely, config, service/module Nest, tipos manuais, provider de migrations, CLI, seed, fixtures e helper de reset para testes.
  - Seed idempotente recria as tabelas da aplicação e insere as cinco contas demo, quatro recipients e duas conversas da Empresa ABC, incluindo histórico.
  - TDD observado: helpers de documento falharam por módulo ausente; `database.config` falhou por módulo ausente; seed-data falhou por módulo ausente; integração DB falhou por módulos ausentes e depois passou com Postgres real.
  - Gates executados e verdes: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter @bcb/api test:db`, `pnpm --filter @bcb/api db:migrate`, `pnpm --filter @bcb/api db:seed`, Prettier nos arquivos tocados.
  - Observação operacional: `test:db`, `db:migrate` e `db:seed` precisam de conexão TCP com PostgreSQL local; no Codex sandbox, rodar fora do sandbox/escalado. O container `big-chat-brasil-irrah-db-1` está `healthy` e o banco local foi migrado/seedado nesta sessão.
- **Sprint 3 - Autenticação e sessão implementada e verificada** (`feat(api): implement jwt auth with document login`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-09-sprint-3-auth-jwt.md`.
  - `@bcb/api` recebeu `@nestjs/jwt`, `supertest` e `@types/supertest`; `test:db` agora roda todos os specs API com `BCB_RUN_DB_TESTS=true`, incluindo HTTP auth e integração DB.
  - `packages/shared/src/schemas/auth.ts` passou a exigir `requiresOnboarding` no `JwtPayloadSchema`, alinhando o contrato ao plano mestre.
  - Novo `AuthModule` com `POST /auth/session` e `GET /auth/me`.
  - `POST /auth/session` valida o body com `AuthSessionRequestSchema`, normaliza CPF/CNPJ, cria automaticamente conta cliente quando o documento não existe, salva hash `bcryptjs`, compara hash em login existente e retorna JWT assinado.
  - Auto-criação de conta cria um `client_profiles` mínimo (`name = "Cliente BCB"`, `plan_type = prepaid`, `onboarding_completed = false`) para manter `clientId` presente no JWT; dados reais ficam para a Sprint 4.
  - JWT inclui `sub`, `clientId`, `role`, `documentId`, `documentType` e `requiresOnboarding`; `GET /auth/me` carrega o perfil atual a partir do token Bearer.
  - Guards reutilizáveis adicionados: `JwtAuthGuard`, `RolesGuard` e decorator `@Roles(...)`.
  - TDD observado: contrato JWT falhou por campo descartado; auth HTTP falhou primeiro por rota 404; `RolesGuard` falhou por imports ausentes; todos ficaram verdes após implementação.
  - Gates finais verdes: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter @bcb/api test:db`.
  - Observação operacional: o primeiro `pnpm install --lockfile-only` dentro do sandbox emitiu muitos `EAI_AGAIN`, mas concluiu e sincronizou `pnpm-lock.yaml`; comandos de DB continuam exigindo permissão fora do sandbox para TCP local.
- **Sprint 4 - Onboarding e cobrança implementada e verificada** (`feat(api): add onboarding and billing rules`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-4-onboarding-billing.md`.
  - Novo `BillingModule` com `POST /billing/onboarding`, `POST /billing/pix-intents`, `POST /billing/pix-intents/:id/confirm` e `GET /billing/me`.
  - `POST /billing/onboarding` atualiza o `client_profiles` criado pela auth; pré-pago fica com `onboarding_completed=false` até confirmar PIX, pós-pago fica ativo imediatamente com `monthly_limit_cents`, `monthly_used_cents=0` e `usage_month` atual.
  - PIX simulado persiste `payment_intents`, confirma apenas uma vez, cria transação `credit`, credita saldo e ativa onboarding pré-pago.
  - `GET /billing/me` retorna resumo discriminado por plano com histórico resumido de transações e exige onboarding completo.
  - `BillingService.chargeMessage()` ficou pronto para a Sprint 5: pré-pago faz débito atômico e transação `debit`; pós-pago aplica reset preguiçoso de `usage_month`, consumo atômico e transação `usage`; saldo/limite insuficiente retornam `INSUFFICIENT_BALANCE`/`INSUFFICIENT_LIMIT`.
  - `BillingService.refundPrepaid()` cria transação `refund` e recompõe saldo para uso futuro quando envio falhar.
  - `OnboardingGuard` consulta o banco via `BillingService.isClientOnboarded()` em vez de confiar no claim `requiresOnboarding`, evitando token stale após onboarding.
  - TDD observado: `OnboardingGuard` falhou por módulo ausente; billing HTTP falhou por `BillingService` ausente; depois houve correções guiadas por falhas reais de DI (`JwtModule` não exportado) e SQL (`clientId` usado como alias no `where`).
  - Gates finais verdes: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter @bcb/api test:db`.
- **Sprint 5 - Conversas, mensagens e fila implementada e verificada** (`feat(api): add conversations messages and priority queue`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-5-conversations-messages-queue.md`.
  - Novos módulos API: `recipients`, `conversations`, `messages`, `queue` e erros compartilhados em `chat/chat.errors.ts`.
  - Endpoints implementados: `GET /recipients`, `GET /conversations`, `GET /conversations/:id`, `GET /conversations/:id/messages`, `POST /conversations/:id/read`, `POST /messages`, `GET /messages/:id`, `GET /messages/:id/status`, `GET /queue/status`.
  - Todos os endpoints de chat usam `JwtAuthGuard` e `OnboardingGuard`; `GET /queue/status` usa `JwtAuthGuard`, `RolesGuard` e `@Roles('admin')`.
  - `POST /messages` aceita `conversationId` ou `recipientId`, faz find-or-create de conversa por destinatário, chama `BillingService.chargeMessage()`, persiste mensagem `queued`, atualiza preview da conversa e enfileira a mensagem.
  - Fila em memória com filas `urgent` e `normal`, urgentes antes de normais e anti-starvation após três urgentes consecutivas. Status persistem `queued -> processing -> sent -> delivered`; recovery no bootstrap re-enfileira mensagens `queued`/`processing`.
  - `packages/shared/src/schemas/message.ts` recebeu `QueueStatusResponseSchema` para o contrato de `GET /queue/status`; a API usa tipo local para não depender de build prévio do `@bcb/shared` durante `test:db`.
  - TDD observado: contrato de queue falhou por schema ausente; specs Supertest falharam por 404/módulos ausentes; depois houve correções guiadas por falha real de runtime (`@bcb/shared` dist stale) e tipagem (`unreadCount` literal).
  - Gates finais verdes: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm --filter @bcb/api test:db`.
- **Sprint 6 - WebSocket e simulador de destinatário implementada e verificada** (`feat(api): add authenticated chat websocket`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-6-websocket-simulator.md`.
  - `@bcb/api` recebeu `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` e `socket.io-client` para testes.
  - `packages/shared/src/schemas/realtime.ts` define os contratos de payload para `message.created`, `message.status`, `conversation.updated`, `typing.started` e `typing.stopped`.
  - Novo `RealtimeModule` com gateway Socket.IO no namespace `/chat`, handshake JWT via `socket.handshake.auth.token`, sala automática `client:{clientId}` e `conversation.join` autorizado por dono da conversa.
  - `RealtimePublisher` centraliza emissão para salas e expõe `events$` para testes e integrações internas, evitando acoplamento direto de fila/simulador ao gateway.
  - `MessagesService` publica `message.created` e `conversation.updated` após persistir mensagem REST; `QueueService` publica `message.status` em `processing`, `sent`, `delivered` e `failed`.
  - Novo `SimulatorModule` assina eventos `delivered`, respeita `RECIPIENT_SIMULATOR_ENABLED`, `RECIPIENT_SIMULATOR_READ_DELAY_MS` e `RECIPIENT_SIMULATOR_TYPING_MS`, marca mensagens do cliente como `read`, emite typing e cria resposta `senderType='user'` com custo zero.
  - Testes adicionados: WebSocket autenticado/isolamento/salas, emissão de status pela fila, simulador ligado com resposta/read/typing e simulador desligado.
  - TDD observado: contrato shared falhou por `Cannot find module './realtime.js'`; specs de API falharam por `RealtimePublisher` ausente; build apontou `processed_at` nullable e foi corrigido nos repositories.
  - Gates verdes: `pnpm --filter @bcb/shared test -- contracts.spec.ts`, `pnpm --filter @bcb/api test:db` (14 suites, 43 testes), `pnpm --filter @bcb/api build`, `pnpm lint`, `pnpm test`, `pnpm build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`.
- **Sprint 7 - Shell Angular, rotas, i18n e tema implementada e verificada** (`feat(web): add angular shell routing i18n and theme`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-7-angular-shell-routing-i18n-theme.md`.
  - `apps/web/src/main.ts` agora só faz bootstrap standalone com `provideRouter(routes)` e `provideTranslateService`.
  - Nova estrutura `apps/web/src/app/`: `app.component.ts`, `app.routes.ts`, `core/auth`, `core/preferences` e páginas placeholder por feature (`auth`, `onboarding`, `chat`, `billing`).
  - Shell visual operacional com header, nav principal, seletor `pt-BR`/`en-US` e toggle claro/escuro; layout foi validado visualmente em desktop e mobile.
  - `PreferencesService` persiste idioma em `bcb.preferences.language`, tema em `bcb.preferences.theme` e aplica `.dark` no `documentElement`.
  - Na Sprint 7, `SessionStore` ainda lia chaves provisórias (`bcb.session.active` e `bcb.onboarding.completed`); a Sprint 8 substituiu isso por sessão real em `bcb.session`.
  - Traduções em `apps/web/src/assets/i18n/pt-BR.json` e `en-US.json`, consumidas pelo `@ngx-translate/core`.
  - Playwright cobre shell/rotas, persistência de idioma/tema e redirects de guards por estado de sessão em `localStorage`.
  - TDD observado: Playwright falhou primeiro contra o placeholder (`Acesso do cliente`/`Idioma` ausentes e `/conversations` sem redirect); depois houve uma falha real por seletor ambíguo de `Onboarding` e uma correção visual mobile para nav que esticava/cortava texto.
  - Gates verdes: `pnpm --filter @bcb/web build`, `pnpm lint`, `pnpm test`, `pnpm build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (3 testes), `pnpm exec prettier --check ...` nos arquivos tocados.
- **Sprint 8 - Login e onboarding web implementada e verificada** (`feat(web): add login and onboarding flows`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-8-login-onboarding-web.md`.
  - `@bcb/web` agora depende de `@bcb/shared` e usa schemas/validadores compartilhados para documento, auth e onboarding.
  - `main.ts` adicionou `provideHttpClient`; `ApiClientService` usa `http://localhost:3000` por padrão e aceita override via `localStorage['bcb.api.baseUrl']`.
  - `SessionStore` persiste sessão real em `bcb.session` (`token`, `requiresOnboarding`, `client`) e os guards passaram a ler essa sessão.
  - `LoginPageComponent` tem formulário real com documento/senha, inferência visual CPF/CNPJ, validação client-side por `AuthSessionRequestSchema`, chamada `POST /auth/session` e redirect para `/onboarding` ou `/conversations`.
  - `OnboardingPageComponent` tem fluxo pré-pago com `POST /billing/onboarding`, `POST /billing/pix-intents`, confirmação `POST /billing/pix-intents/:id/confirm` e fluxo pós-pago com `monthlyLimitCents`.
  - `OnboardingApiService` parseia respostas de onboarding e PIX; após confirmação PIX, a sessão local é marcada como onboarded com o saldo retornado.
  - Playwright foi ampliado para 8 testes: validação de documento sem chamada HTTP, login ativo, autoregistro com onboarding, onboarding pré-pago com PIX, onboarding pós-pago, shell, preferências e guards.
  - TDD observado: Playwright falhou primeiro por ausência dos campos `Documento`/`Senha`/`Nome` e por guards lendo chaves antigas; depois 6/8 passaram e as 2 falhas restantes eram seletor ambíguo `CPF`/`CNPJ`.
  - Gates verdes: `pnpm --filter @bcb/web build`, `pnpm lint`, `pnpm test`, `pnpm build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (8 testes), checagem visual desktop/mobile por screenshot, `pnpm exec prettier --check ...` nos arquivos tocados.
- **Sprint 9 - Chat web integrado implementada e verificada** (`feat(web): add integrated chat experience`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-9-integrated-chat-web.md`.
  - Novos serviços web: `ChatApiService` encapsula REST com `HttpClient`, headers do `ApiClientService` e parsing dos schemas compartilhados; `ChatRealtimeService` conecta no namespace Socket.IO `/chat`, faz `conversation.join`, parseia eventos realtime e expõe `events$`.
  - `ConversationsPageComponent` substituiu o placeholder por listagem real com `GET /billing/me`, `GET /conversations`, busca, badges `unreadCount`, preview/hora, atualização por `conversation.updated`, formulário "Nova conversa" com `GET /recipients` e envio inicial por `POST /messages` com `recipientId`.
  - `ConversationDetailPageComponent` carrega rota direta `/conversations/:conversationId` com `GET /conversations/:id`, `GET /conversations/:id/messages`, `POST /conversations/:id/read`, bolhas cliente/usuário, status (`queued`, `processing`, `sent`, `delivered`, `read`, `failed`), prioridade normal/urgente, saldo/limite e composer por `POST /messages`.
  - Eventos realtime cobertos no frontend: `message.status` atualiza a bolha enviada; `typing.started`/`typing.stopped` mostram/ocultam "escrevendo"; `message.created` insere resposta do destinatário; `conversation.updated` atualiza preview/badge na lista.
  - Playwright ganhou `apps/web/e2e/chat.spec.ts` com 3 testes: i18n da lista, rota direta + envio urgente + status/typing/resposta e lista + billing + busca + badge realtime + nova conversa. `shell.spec.ts` foi ajustado para mockar REST no detalhe real.
  - TDD observado: Playwright falhou primeiro contra os placeholders (`Maria Oliveira`/`Saldo R$ 25,00` ausentes); depois houve falha real porque mocks `**/conversations` interceptavam a navegação SPA e devolviam JSON, corrigida restringindo mocks ao host `http://localhost:3000`; um teste adicional falhou por i18n fixo e foi corrigido migrando textos para `pt-BR.json`/`en-US.json`; outro falhou por badge realtime ausente e foi corrigido assinando `conversation.updated`.
  - Checagem visual manual: screenshots em `/tmp/bcb-sprint9-conversations-desktop.png` e `/tmp/bcb-sprint9-chat-mobile.png` renderizaram lista desktop e chat mobile sem sobreposição, com saldo, badges, bolhas, status, prioridade urgente e composer visíveis.
  - Gates verdes: `pnpm --filter @bcb/shared build && pnpm --filter @bcb/web build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (11 testes), `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm exec prettier --check ...` nos arquivos tocados.
- **Sprint 10 - E2E, Docker e documentação final implementada e verificada** (`test: add e2e coverage for main chat flow`):
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-sprint-10-e2e-docker-docs.md`.
  - Docker finalizado com `Dockerfile` multi-target (`api` e `web`) e `.dockerignore`; Compose agora builda imagens em vez de usar bind mount/dev server.
  - API Docker roda `pnpm --filter @bcb/api db:migrate`, `pnpm --filter @bcb/api db:seed` e depois `pnpm --filter @bcb/api start`; web Docker serve `dist/apps/web/browser` via `apps/web/e2e/static-server.mjs` com `WEB_HOST=0.0.0.0`.
  - Portas publicadas do Compose agora são parametrizáveis: `API_PUBLISHED_PORT`, `WEB_PUBLISHED_PORT`, `DB_PUBLISHED_PORT`. Defaults continuam `3000`, `4200`, `5432`.
  - Novo e2e full-stack: `apps/web/e2e/full-stack.spec.ts` + `apps/web/playwright.fullstack.config.ts`, script raiz `pnpm test:e2e:fullstack`. Ele loga com a Empresa ABC real seedada, abre Maria Oliveira, envia mensagem urgente e espera status/feedback do simulador sem mocks REST.
  - `apps/web/playwright.config.ts` ignora `full-stack.spec.ts`, mantendo o e2e padrão como suíte mockada/determinística.
  - `README.md` virou README de entrega: execução Docker, credenciais demo, funcionalidades, stack, comandos de teste, endpoints, decisões, premissas e limitações.
  - TDD/depuração observados: full-stack falhou primeiro por conexão recusada; Docker build falhou por falta de `angular.json`/`postcss.config.json` no build context; Docker up local falhou porque outro container ocupava host `3000`; full-stack falhou com CORS por `127.0.0.1` versus `localhost`; e2e padrão falhou por coletar o spec full-stack. Todas as causas foram corrigidas na origem.
  - Verificação Docker: `docker compose config` passou; `docker compose build` passou; ambiente limpo com `docker compose down --volumes --remove-orphans` seguido de `API_PUBLISHED_PORT=3002 docker compose up --detach db api web` subiu banco healthy, API e web; logs da API confirmaram migrate, seed e start.
  - Gates verdes: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable E2E_API_BASE_URL=http://localhost:3002 pnpm test:e2e:fullstack` (1 teste), `pnpm lint`, `pnpm test`, `pnpm build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (11 testes), `pnpm format:check`, `docker compose config`, `docker compose build`.
- **Hotfix pós-Sprint 10 - API base runtime no Docker web**:
  - Sintoma reportado no navegador: `POST http://localhost:3000/auth/session net::ERR_SOCKET_NOT_CONNECTED/ERR_CONNECTION_RESET/ERR_EMPTY_RESPONSE`.
  - Causa confirmada: nesta máquina, `big-chat-brasil-irrah-api-1` estava publicado em `3002->3000` porque o container externo `pokedex_api` ocupava host `3000`; o bundle web ainda usava o fallback `http://localhost:3000`.
  - Correção: `docker-compose.yml` injeta `BCB_API_BASE_URL=http://localhost:${API_PUBLISHED_PORT:-3000}` no serviço web; `apps/web/e2e/static-server.mjs` injeta `window.__BCB_RUNTIME_CONFIG__` no `index.html`; `ApiClientService` resolve API base por `localStorage['bcb.api.baseUrl']`, depois runtime config, depois fallback `http://localhost:3000`.
  - O teste `apps/web/e2e/full-stack.spec.ts` não injeta mais `localStorage`; ele valida que o browser usa a configuração runtime servida pelo Docker.
  - A suíte Playwright mockada agora sobe o servidor estático em `4210` e força `--api-base-url=` para não reutilizar o web Docker de `4200` nem herdar `BCB_API_BASE_URL`.
  - Verificação: RED reproduzido com `pnpm test:e2e:fullstack` ficando preso em `/login`; depois `docker compose build web` passou, `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate web` recriou o web, e checagem dentro do container retornou HTTP `200` com `window.__BCB_RUNTIME_CONFIG__` e `http://localhost:3002` no HTML.
  - Gates verdes finais: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e:fullstack` (1 teste), `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (11 testes), `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`, `docker compose config`, `API_PUBLISHED_PORT=3002 docker compose config`.
- **OpenAPI/Swagger implementado**:
  - Dependências adicionadas à API: `@nestjs/swagger`, `class-transformer`, `class-validator`.
  - `apps/api/src/openapi/openapi.ts` expõe Swagger UI em `/docs` e JSON em `/docs-json`, configurado no bootstrap da API.
  - `apps/api/src/openapi/openapi.schemas.ts` centraliza os schemas OpenAPI, reutilizando os arrays de enums exportados por `@bcb/shared`.
  - `apps/api/src/openapi/openapi.spec.ts` gera o documento a partir do `AppModule` real e valida paths, bearer auth, schemas críticos e metadata mínima (`summary`, `tags`, `responses`) em toda operação. Endpoint novo sem documentação deve quebrar esse teste.
  - `README.md` agora documenta `/docs` e `/docs-json`; `IMPLEMENTATION_PLAN.md` deixou Swagger/OpenAPI de opcional e registrou o teste de sincronização.
  - O full-stack spec foi estabilizado para aceitar qualquer status válido inicial da mensagem (`Na fila|Processando|Enviada|Entregue|Lida`), porque `Na fila` é transitório e pode ser perdido quando a fila avança rápido; a exigência de chegar a `Entregue` ou `Lida` continua.
  - Verificação Docker: `docker compose build api` passou; `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate api` recriou a API; chamadas internas do container para `/docs` e `/docs-json` retornaram HTTP `200`, com título `Big Chat Brasil API`, `/auth/session` e bearer auth no JSON.
  - Gates verdes: `pnpm --filter @bcb/api test -- openapi.spec.ts`, `pnpm --filter @bcb/api build`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e:fullstack`.
- **Worker separado da fila implementado e verificado**:
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-queue-worker-bridge.md`.
  - Novo `QueueConfig`: `QUEUE_PROCESSOR_ENABLED`, `QUEUE_POLL_INTERVAL_MS`, `QUEUE_STATUS_PUBLISHER`, `INTERNAL_API_BASE_URL` e `INTERNAL_API_TOKEN`.
  - `QueueService` agora respeita processo sem worker local, faz polling de mensagens `queued`/`processing` no banco, deduplica jobs em memória e publica status por uma abstração (`RealtimeQueueStatusPublisher` ou `HttpQueueStatusPublisher`).
  - Nova ponte interna protegida: `POST /internal/realtime/message-status` com header `x-internal-token`. Ela fica fora do OpenAPI público via `@ApiExcludeController()` e repassa status para `RealtimePublisher`, preservando Socket.IO e simulador no processo API.
  - Novo entrypoint `apps/api/src/worker.ts` com `WorkerModule`; `apps/api/package.json` ganhou `start:worker`; `Dockerfile` ganhou target `worker`.
  - `docker-compose.yml` agora sobe `api` com `QUEUE_PROCESSOR_ENABLED=false` e `worker` com `QUEUE_STATUS_PUBLISHER=http`, `QUEUE_POLL_INTERVAL_MS=250` e `INTERNAL_API_BASE_URL=http://api:3000`. A API ganhou healthcheck para o worker aguardar serviço saudável.
  - TDD observado:
    - `queue.config.spec.ts` falhou primeiro porque os campos de worker não existiam.
    - `realtime.spec.ts` falhou primeiro com `404` em `/internal/realtime/message-status`.
    - `queue.spec.ts` falhou primeiro com timeout porque mensagem inserida após bootstrap não era descoberta por polling.
  - Depuração observada: `pnpm --filter @bcb/api build` falhou quando `internal-realtime.controller.ts` importou `zod` diretamente; causa raiz era dependência transitiva, corrigida usando o tipo exportado por `@bcb/shared`.
  - Verificação Docker: `docker compose build` passou; `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate db api worker web` subiu API healthy e worker; logs confirmaram `Queue processor disabled for this process` no API e `Queue worker started`/`Recovered 1 pending messages` no worker.
  - E2E full-stack passou contra Docker com worker separado: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e:fullstack` (1 teste).
  - Armadilha nova: se a stack Docker estiver rodando, pare `api/worker/web` antes de `pnpm --filter @bcb/api test:db`; o worker usa o mesmo Postgres local e pode avançar mensagens que testes esperam controlar manualmente. Com `docker compose stop api worker web`, `test:db` passou 16 suites/49 testes.
- **Comunicação entre contas reais implementada**:
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-account-to-account-chat.md`.
  - `recipients` virou catálogo unificado: rows sem `client_profile_id` continuam sendo recipients simulados; rows com `client_profile_id` representam contas reais logáveis/onboarded.
  - Nova migration `002_account_recipients` adiciona `recipients.client_profile_id`, remove a unicidade rígida de `name` e cria índice único por `client_profile_id`. A migration `001` foi mantida histórica; não duplicar a coluna nela.
  - Seed cria recipients para as contas demo onboarded e mantém os quatro simulados (`Maria Oliveira`, `Carlos Pereira`, `Ana Costa`, `Pedro Santos`).
  - `/recipients` agora recebe o `clientId` autenticado: lista simulados + outras contas ativas/onboarded, excluindo a própria conta.
  - `BillingRepository` faz upsert do recipient da conta quando onboarding fica completo: pós-pago no onboarding, pré-pago na confirmação PIX.
  - `MessagesRepository.createClientMessage()` agora cria a mensagem do remetente e, se o recipient for uma conta real, cria conversa/mensagem espelhada no inbox do destinatário (`senderType='user'`, custo zero, `delivered`, `unreadCount + 1`). O remetente continua sendo cobrado e sua mensagem continua entrando na fila.
  - `SimulatorService` consulta se o recipient é simulado; recipients de conta real não geram resposta automática.
  - TDD observado: `recipients.spec.ts`, `messages.spec.ts` e `simulator.spec.ts` falharam primeiro porque recipients de contas ainda não existiam; depois passaram 3 suites/11 testes.
  - E2E full-stack foi ampliado para logar como Empresa ABC, iniciar conversa com `Cliente Pós-pago Com Limite`, trocar sessão e validar a mensagem logando como a segunda conta.
  - Depuração observada: a suíte DB completa expôs um teste de seed ainda contando apenas recipients simulados; ele foi corrigido para validar simulados e recipients de contas separadamente. O full-stack novo também pegou um seletor de botão desatualizado (`Enviar mensagem` vs. `Enviar nova conversa`) e foi corrigido pelo snapshot do Playwright.
  - Gates finais verdes: `pnpm build`, `docker compose stop api worker web`, `pnpm --filter @bcb/api test:db` (16 suites/52 testes), `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (11 testes), `pnpm format:check`, `docker compose config`, `docker compose build`, `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate db api worker web`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e:fullstack` (2 testes).
  - Estado operacional ao fechar o bloco: stack Docker ficou rodando para demo local, com API em `localhost:3002`, web em `localhost:4200`, DB healthy em `5432` e worker ativo; logs recentes mostram `Queue processor disabled for this process` na API e `Queue worker started` no worker.
- **Bloco Admin Management Console implementado neste commit**:
  - Plano detalhado: `docs/superpowers/plans/2026-06-10-admin-management-console.md`.
  - Conta admin seedada com documento reservado `00000000000`, senha por `BCB_ADMIN_PASSWORD` e fallback Docker Compose `${BCB_ADMIN_PASSWORD:-Admin@123}`. Este documento continua rejeitado pelo validador genérico de CPF/CNPJ e é aceito apenas no contrato de login.
  - `POST /auth/session` usa a mesma tela/rota para cliente e admin. O backend é a única fonte da `role`, assina o JWT com `role='admin'` para a conta seedada e impede auto-registro do documento reservado se a seed estiver ausente.
  - Admin não vira recipient de chat. `seed.ts` cria recipients apenas para contas `client` com onboarding completo.
  - Novo `AdminModule` com endpoints protegidos por `JwtAuthGuard`, `RolesGuard` e `@Roles('admin')`: `GET/POST /admin/clients`, `PATCH /admin/clients/:id/status`, `POST /admin/clients/:id/credits`, `PATCH /admin/clients/:id/limit`, `POST /admin/clients/:id/plan`.
  - Payloads admin são schemas Zod `.strict()`: campo `role` é somente leitura e qualquer tentativa de envio em criação/mutação é rejeitada. Mutar a própria conta admin também retorna conflito.
  - Financial ops administrativas gravam `billing_transactions` com novo tipo `adjustment`; a migration `003_billing_adjustments` atualiza a constraint do banco.
  - Frontend ganhou rota `/admin`, `adminGuard`, redirecionamento por role após login, item de navegação "Administração" apenas para sessão admin, `AdminApiService` e tela para listar contas, criar cliente, ativar/inativar, adicionar crédito, alterar limite e converter plano. A UI não envia `role`.
  - Swagger/OpenAPI agora documenta a tag `Admin`, schemas/payloads admin e os novos paths. `openapi.spec.ts` trava paths, bearer auth e schemas críticos.
  - README documenta o admin `00000000000`, `BCB_ADMIN_PASSWORD`, fallback `Admin@123`, `/admin` e endpoints admin.
  - TDD observado: shared contracts para documento admin, Supertest DB para auth/admin, Playwright admin e OpenAPI foram escritos/ajustados antes da implementação correspondente. O E2E admin falhou primeiro esperando `Inativar`/conversão e passou após a UI expor essas ações.
  - Gates finais verdes deste bloco: `pnpm lint`; `pnpm test` (shared 6 arquivos/30 testes, API isolada 7 suites/16 testes, DB suites puladas como esperado, web placeholder); `pnpm build`; `pnpm --filter @bcb/api test:db` (17 suites/57 testes); `pnpm format:check`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (14 testes); `API_PUBLISHED_PORT=3002 docker compose config`; `docker compose build`; `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate db api worker web`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e:fullstack` (2 testes).
  - Validação Docker adicional: login direto em `http://localhost:3002/auth/session` com `00000000000`/`Admin@123` retornou HTTP `201`, `role='admin'`, `documentId='00000000000'` e `requiresOnboarding=false`.
  - Validação visual adicional: screenshots Playwright do painel admin Docker em desktop e mobile (`/tmp/bcb-admin-docker.png`, `/tmp/bcb-admin-mobile-docker.png`) confirmaram heading, 5 linhas de tabela e layout sem sobreposição óbvia depois do ajuste no grid do formulário "Novo cliente".
  - Estado operacional ao fechar o bloco: stack Docker ficou rodando para demo local, com API em `localhost:3002`, web em `localhost:4200`, DB healthy em `5432` e worker ativo.
- **Hotfix web - onboarding só aparece quando a sessão ainda precisa configurar plano**:
  - Pedido do Yan: a tela/aba de onboarding só deve existir para usuário novo sem configuração; ao logar ou já estar logado em conta existente, a aba deve sumir do header e `/onboarding` não deve ficar acessível.
  - `SessionStore` ganhou `requiresOnboarding`, o header renderiza o link `Onboarding` apenas quando essa flag está ativa, e a rota `/onboarding` usa `onboardingSetupGuard` para redirecionar sessão já configurada para `/conversations` ou admin para `/admin`.
  - TDD observado: `apps/web/e2e/shell.spec.ts` falhou primeiro porque o link continuava visível para conta ativa; depois passou com o novo comportamento.
  - Gates verdes: `pnpm --filter @bcb/web build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm --filter @bcb/web exec playwright test -c playwright.config.ts e2e/shell.spec.ts` (4 testes), `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (15 testes), `pnpm lint`, `pnpm test`, `pnpm format:check`, `pnpm build`.
  - Docker local atualizado: `docker compose build web` e `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate web`; checagem Playwright contra `localhost:4200` retornou `activeOnboardingLinks=0`, `activeRedirect=/conversations`, `pendingOnboardingLinks=1`.
  - Estado operacional ao fechar o hotfix: stack Docker segue rodando para demo local com API em `localhost:3002`, web em `localhost:4200`, DB healthy e worker ativo.
- **Hotfix web - aba Cobrança conectada ao billing real**:
  - Pedido do Yan: a aba `Cobrança` ainda mostrava texto de placeholder ("será conectado ao endpoint de billing"), embora o backend já tivesse `GET /billing/me` funcional.
  - `apps/web/src/app/features/billing/billing-page.component.ts` agora consome `BillingApiService.getSummary()` e renderiza resumo real: pré-pago mostra plano, saldo disponível e histórico; pós-pago mostra plano, limite mensal, usado no mês, restante, mês de uso e histórico.
  - Novo `apps/web/src/app/features/billing/billing-api.service.ts` reutiliza `ApiClientService` e valida resposta com `BillingSummaryResponseSchema`.
  - Novo `apps/web/e2e/billing.spec.ts` cobre pré-pago e pós-pago. O teste falhou primeiro contra o placeholder e depois passou após a conexão. Também travou que `debit`/`usage` aparecem como valores negativos mesmo quando o backend retorna `amountCents` positivo para esses tipos.
  - Textos `pt-BR`/`en-US` de billing foram atualizados para remover o aviso de placeholder e incluir labels de resumo, tabela, origens e tipos de transação.
  - Gates verdes: `pnpm --filter @bcb/web build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm --filter @bcb/web exec playwright test -c playwright.config.ts e2e/billing.spec.ts` (2 testes), `pnpm lint`, `pnpm test`, `pnpm format:check`, `pnpm build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (17 testes).
  - Docker local atualizado: `docker compose build web` e `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate web`; checagem Playwright contra `localhost:4200/billing` com conta demo real confirmou `placeholder=0`, 3 linhas de histórico e captura `/tmp/bcb-billing-docker.png` sem sobreposição óbvia.
  - Estado operacional ao fechar o hotfix: stack Docker segue rodando para demo local com API em `localhost:3002`, web em `localhost:4200`, DB healthy e worker ativo.
- **Hotfix web - esconder Acesso e adicionar logout com sessão ativa**:
  - Pedido do Yan: depois de logado, a aba `Acesso` não deve continuar visível e o shell deve expor um botão de logout.
  - `apps/web/src/app/app.component.ts` agora renderiza o link `Acesso` apenas quando `SessionStore.authenticated()` é falso e renderiza `Sair` quando existe sessão ativa.
  - O botão `Sair` chama `SessionStore.clear()`, remove `bcb.session` do `localStorage` e navega para `/login`.
  - Textos `pt-BR`/`en-US` receberam `nav.logout`.
  - `apps/web/e2e/shell.spec.ts` ganhou o teste `hides access navigation after login and logs out from the shell`; ele falhou primeiro porque `Acesso` ainda estava visível, depois passou após a implementação.
  - Gates verdes: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm --filter @bcb/web exec playwright test -c playwright.config.ts e2e/shell.spec.ts` (5 testes), `pnpm --filter @bcb/web build`, `pnpm lint`, `pnpm test`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` (18 testes).
  - Docker local atualizado após o commit inicial: `docker compose build web` e `API_PUBLISHED_PORT=3002 docker compose up --detach --force-recreate web`; validação focada contra `localhost:4200` passou com uma config Playwright temporária sem `webServer` e essa config foi removida.
- Observação de versão: Angular/CLI `22.0.0` exige TypeScript `>=6.0 <6.1`; Sprint 0 usa TypeScript `6.0.3` apesar do alvo inicial "TypeScript 5" do plano mestre.
- Planejamento de referência (feito com Codex, revisado por Claude em 2026-06-09):
  - `IMPLEMENTATION_PLAN.md` — plano mestre: sprints 0–10, endpoints, premissas, registro de decisões. **Começa pela seção "Como Executar Este Plano".**
  - `docs/architecture-plan.md` — módulos NestJS/Angular, modelo de dados, exemplos Kysely prontos (débito atômico, reset preguiçoso), simulador de destinatário, eventos WebSocket, códigos de erro com HTTP.
  - `docs/testing-strategy.md` — runners por pacote, casos críticos, fixtures cravadas, determinismo de E2E.
- Documentos originais do desafio (especificação de referência, **não editar**): `README.md`, `docs/backend.md`, `docs/frontend.md`, `docs/fullstack.md`, `docs/regras-negocio.md`, `docs/requisitos-tecnicos.md`, `docs/dicas.md`.

## Sua próxima ação

1. Confirmar status:
   ```bash
   git status --short --branch
   git log --oneline --decorate -3
   ```
2. Confirmar se o hotfix de logout aparece no log como `fix(web): add authenticated logout`; se não aparecer, revisar o diff deste bloco e commitar antes de seguir.
3. Fazer uma revisão final de entrega: checar README do ponto de vista do avaliador, validar Docker/full-stack em ambiente limpo, limpar containers se não quiser manter a demo local rodando e considerar renomear a branch antes de push/PR.
4. Não iniciar features novas sem alinhar escopo; o MVP planejado já está fechado, e worker separado, conversa entre contas reais e painel admin foram tratados como melhorias técnicas/demonstração.

## Skills sugeridas para o próximo agente

- `superpowers:using-superpowers` — ativar workflow de skills no início.
- `tlc-spec-driven` — manter sprints sequenciais, rastreio de decisões e handoff.
- `superpowers:writing-plans` — criar o plano detalhado da próxima sprint antes de tocar código.
- `superpowers:test-driven-development` — obrigatório para contratos/validadores.
- `superpowers:systematic-debugging` — usar em qualquer falha de teste/build.
- `superpowers:verification-before-completion` — rodar e registrar gates antes de afirmar conclusão.

## Regras inegociáveis (detalhes nos documentos)

- Sprints sequenciais; não iniciar uma sem a anterior commitada com gates verdes.
- TDD obrigatório; gates por commit (`pnpm lint` + testes dos pacotes afetados + `pnpm build`); nunca declarar tarefa concluída sem mostrar a saída real dos comandos.
- Não re-litigar stack nem decisões: tudo que está em "Registro de Decisões" e "Stack e Versões Alvo" é final. Ambiguidade de regra de negócio → seção "Aderência ao Contrato do Desafio e Premissas"; se não estiver lá, **pergunte ao Yan em vez de assumir**.
- Nomes de entidades, campos, envs, eventos WebSocket e códigos de erro já estão definidos nos documentos — usar exatamente como escritos.

## Armadilhas já neutralizadas (não recriar o problema)

- CPF/CNPJ do seed estão cravados e validados por dígito verificador (tabela na Sprint 2). **Não inventar documentos**; extras via `generateCpf()`/`generateCnpj()` do `@bcb/shared`.
- `bcryptjs`, não `bcrypt` nativo; imagem `node:22-slim`, não Alpine (evita falha de build nativo no Docker).
- Testes de integração rodam com `RECIPIENT_SIMULATOR_ENABLED=false` e delays de fila zerados, senão os status finais ficam não determinísticos.
- Dinheiro sempre em centavos (int); débito/consumo via `UPDATE` condicional atômico — exemplos prontos na seção Kysely do architecture-plan, não improvisar outro padrão.
- O docker compose final (Sprint 10) precisa rodar `db:migrate` + `db:seed` sozinho: o avaliador não executa passos manuais.
- Angular 22 neste repo não lê `postcss.config.mjs`; manter `postcss.config.json` para o Tailwind 4 realmente gerar utilities.
- E2E local depende do Chrome do sistema em `/usr/bin/google-chrome-stable` via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; sem isso o Playwright pode tentar usar browser baixado.
- `@bcb/api` e `@bcb/shared` estão em ESM/NodeNext. Imports relativos em TypeScript devem usar sufixo `.js`; não voltar para imports extensionless.
- `pnpm test` pula a integração DB por padrão; usar `pnpm --filter @bcb/api test:db` com o Postgres do Compose healthy para validar migrations/seed.
- `POST /auth/session` já cria conta/perfil mínimo para documentos novos; a Sprint 4 deve atualizar esse perfil via onboarding em vez de criar outro perfil para a mesma conta.
- `OnboardingGuard` deve proteger conversas/mensagens na Sprint 5. Para billing, só `GET /billing/me` usa esse guard; onboarding e PIX precisam funcionar antes do onboarding completo.
- Na Sprint 5, não reimplementar débito/limite: chamar `BillingService.chargeMessage()` dentro da transação/fluxo de envio planejado e, em falha pós-cobrança pré-paga, chamar `refundPrepaid()`.
- `QUEUE_AUTOSTART=false` nos testes mantém mensagens `queued` até o teste chamar `QueueService.processNextForTests()`. Em runtime, o default é autostart ligado.
- A fila já emite `message.status` via `RealtimePublisher`; não duplicar processamento no frontend. A integração Socket.IO do cliente fica para os fluxos de conversa da Sprint 9.
- O simulador de destinatário fica ligado por padrão; em testes que afirmam estados finais da fila, setar `RECIPIENT_SIMULATOR_ENABLED=false`.
- A shell web agora usa sessão real em `bcb.session`. Não voltar para as chaves provisórias `bcb.session.active`/`bcb.onboarding.completed`.
- `apps/web` ainda não tem runner unitário real; `pnpm test` segue placeholder. A cobertura efetiva das Sprints 7/8/9 está em Playwright visual/rotas/preferências/fluxos HTTP mockados e eventos realtime injetados.
- O `ApiClientService` usa `localStorage['bcb.api.baseUrl']` como override manual, depois `window.__BCB_RUNTIME_CONFIG__.apiBaseUrl` injetado pelo web Docker, e só então o fallback `http://localhost:3000`.
- `pnpm test:e2e` usa `127.0.0.1:4210` para não conflitar com o web Docker manual em `4200`.
- Em Playwright web, mocks de API devem mirar `http://localhost:3000/...`; padrões amplos como `**/conversations` interceptam a navegação SPA do servidor estático e retornam JSON como documento.
- O e2e full-stack deve rodar pelo script/config dedicado (`pnpm test:e2e:fullstack`); não colocar `full-stack.spec.ts` de volta na suíte mockada padrão.
- Nesta máquina, a porta host `3000` estava ocupada pelo container externo `pokedex_api`; a validação Docker local usa `API_PUBLISHED_PORT=3002`. Depois do hotfix, não use mais `E2E_API_BASE_URL` nem console do navegador para esse caso.
- Ao rodar `pnpm --filter @bcb/api test:db`, não deixe `big-chat-brasil-irrah-worker-1` ativo contra o mesmo Postgres; use `docker compose stop api worker web` e mantenha só `db` se precisar da conexão local.
- A migration `002_account_recipients` depende de `001_initial_schema`; em banco limpo, não adicione `client_profile_id` na `001`, senão `migrateToLatest()` tentará criar a coluna duas vezes.
- Para recipients reais, não ativar o simulador: ele deve responder apenas quando `recipients.client_profile_id is null`.
- Logs de navegador com `console-log.service.ts`, `background.js`, `Fido2Client`, `SignalR`, `triggerAutofillScriptInjection` e chamadas para `hidden42gate.yanlucas.com` são de extensão do browser/perfil local, não do BCB. Testar em perfil limpo/incógnito com extensões desativadas remove esse ruído.
- Ao adicionar/alterar endpoint REST, atualizar `OPENAPI_OPERATIONS` e `OPENAPI_SCHEMAS`; `pnpm --filter @bcb/api test -- openapi.spec.ts` deve falhar se a documentação não acompanhar a rota.
- O documento admin `00000000000` é uma exceção intencional somente para login/seed; não trocar `DocumentIdSchema` genérico para aceitar CPFs repetidos.
- `BCB_ADMIN_PASSWORD` fica no Compose com default `${BCB_ADMIN_PASSWORD:-Admin@123}`. Não hardcodar outra senha em testes/docs sem atualizar `.env.example`, README e seed-data.

## Pendências que dependem do Yan

- Prazo exato ("até a call" — data não registrada nos documentos). Se o tempo apertar, a ordem de corte está no Registro de Decisões (primeiro corte: fluxo "Nova Conversa", decisão 11).
- Criação do repositório público de entrega / push (não fazer push sem ele pedir).
