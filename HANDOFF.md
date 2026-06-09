# Handoff — Big Chat Brasil (BCB)

> Documento vivo de passagem de bastão entre sessões/agentes. Quem encerrar uma sessão de trabalho **atualiza as seções "Estado atual" e "Sua próxima ação"** antes de parar. Responder e documentar sempre em português (pt-BR).

## O que é este projeto

Desafio técnico da Irrah (plataforma de chat "Big Chat Brasil"), perfil **Fullstack** (avaliação: backend 40%, frontend 40%, integração 20%). A entrega é um repositório público no GitHub que o avaliador roda com `git clone && docker compose up`, seguida de entrevista de live-coding onde o Yan explica decisões e faz pequenas modificações ao vivo. Qualidade > quantidade: corte documentado no README vale mais que feature incompleta.

## Estado atual (2026-06-09)

- Planejamento completo, revisado e commitado em `fed6f79` (`docs: add implementation, architecture and testing plans`).
- Branch de implementação atual: `sprint-0-monorepo`.
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
- **Sprint 1 implementada e com gates verdes, aguardando revisão/commit**:
  - Plano detalhado: `docs/superpowers/plans/2026-06-09-sprint-1-shared-contracts.md`.
  - `packages/shared/src/enums.ts`: roles, planos, tipos de documento, prioridades, status, sender, PIX e tipos de transação.
  - `packages/shared/src/documents.ts`: normalização conservadora, CPF/CNPJ por dígito verificador e inferência de tipo.
  - `packages/shared/src/money.ts`: custos de 25/50 centavos e `ESTIMATED_DELIVERY_SECONDS = 5`.
  - `packages/shared/src/schemas/`: common, auth, onboarding, billing, conversation e message.
  - `packages/shared/src/index.ts`: barrel público para API/web.
  - TDD observado: cada módulo começou com teste falhando por import/export ausente e passou após a implementação.
  - Gate isolado: `@bcb/shared` com 5 arquivos e 23 testes passando, lint e build verdes.
  - Gates raiz finais: `pnpm lint`, `pnpm test` e `pnpm build` passaram; Prettier passou no código/plano da Sprint 1.
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
2. Revisar e commitar a Sprint 1, se ainda estiver pendente:
   ```bash
   git add HANDOFF.md docs/superpowers/plans/2026-06-09-sprint-1-shared-contracts.md packages/shared/src
   git commit -m "feat(shared): add contracts and document validation"
   ```
3. Iniciar a **Sprint 2 - Banco, Kysely e seed** somente após o commit da Sprint 1.
4. Antes de codar Sprint 2, gerar plano detalhado em `docs/superpowers/plans/`; incluir PostgreSQL real, migrations, tipos Kysely, helpers de documento para testes e seed com as fixtures cravadas.

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

## Pendências que dependem do Yan

- Prazo exato ("até a call" — data não registrada nos documentos). Se o tempo apertar, a ordem de corte está no Registro de Decisões (primeiro corte: fluxo "Nova Conversa", decisão 11).
- Criação do repositório público de entrega / push (não fazer push sem ele pedir).
