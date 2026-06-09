# Handoff — Big Chat Brasil (BCB)

> Documento vivo de passagem de bastão entre sessões/agentes. Quem encerrar uma sessão de trabalho **atualiza as seções "Estado atual" e "Sua próxima ação"** antes de parar. Responder e documentar sempre em português (pt-BR).

## O que é este projeto

Desafio técnico da Irrah (plataforma de chat "Big Chat Brasil"), perfil **Fullstack** (avaliação: backend 40%, frontend 40%, integração 20%). A entrega é um repositório público no GitHub que o avaliador roda com `git clone && docker compose up`, seguida de entrevista de live-coding onde o Yan explica decisões e faz pequenas modificações ao vivo. Qualidade > quantidade: corte documentado no README vale mais que feature incompleta.

## Estado atual (2026-06-09)

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
2. Iniciar a **Sprint 3 - Autenticação e sessão**.
3. Antes de codar Sprint 3, gerar plano detalhado em `docs/superpowers/plans/`; incluir login/criação por CPF/CNPJ, hash bcrypt, JWT, guards, headers de cliente e testes HTTP.

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

## Pendências que dependem do Yan

- Prazo exato ("até a call" — data não registrada nos documentos). Se o tempo apertar, a ordem de corte está no Registro de Decisões (primeiro corte: fluxo "Nova Conversa", decisão 11).
- Criação do repositório público de entrega / push (não fazer push sem ele pedir).
