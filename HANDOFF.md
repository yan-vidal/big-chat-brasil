# Handoff — Big Chat Brasil (BCB)

> Documento vivo de passagem de bastão entre sessões/agentes. Quem encerrar uma sessão de trabalho **atualiza as seções "Estado atual" e "Sua próxima ação"** antes de parar. Responder e documentar sempre em português (pt-BR).

## O que é este projeto

Desafio técnico da Irrah (plataforma de chat "Big Chat Brasil"), perfil **Fullstack** (avaliação: backend 40%, frontend 40%, integração 20%). A entrega é um repositório público no GitHub que o avaliador roda com `git clone && docker compose up`, seguida de entrevista de live-coding onde o Yan explica decisões e faz pequenas modificações ao vivo. Qualidade > quantidade: corte documentado no README vale mais que feature incompleta.

## Estado atual (2026-06-09)

- Planejamento completo, revisado e commitado em `fed6f79` (`docs: add implementation, architecture and testing plans`).
- Branch de implementação atual: `sprint-0-monorepo`.
- **Sprint 0 implementada e com gates verdes**, aguardando revisão/commit do bloco:
  - `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, ESLint, Prettier e lockfile.
  - `packages/shared` (`@bcb/shared`) com smoke test Vitest e build TypeScript.
  - `apps/api` (`@bcb/api`) com NestJS mínimo, `/health`, smoke test Jest, build e lint.
  - `apps/web` (`@bcb/web`) com Angular 22 standalone, rotas profundas planejadas e Tailwind 4.
  - `.env.example` e `docker-compose.yml` com PostgreSQL, API e web base.
- Plano detalhado da Sprint 0 salvo em `docs/superpowers/plans/2026-06-09-sprint-0-monorepo.md`.
- Gates executados nesta sessão:
  - `pnpm --filter @bcb/shared test` falhou primeiro por `./index` ausente e depois passou 1/1.
  - `pnpm --filter @bcb/api test` falhou primeiro por `./app.service` ausente e depois passou 1/1.
  - `pnpm --filter @bcb/web build` falhou primeiro por `baseUrl` depreciado no TypeScript 6; removido e depois passou.
  - `pnpm lint` passou.
  - `pnpm test` passou (`@bcb/api` 1/1, `@bcb/shared` 1/1, `@bcb/web` placeholder de Sprint 7).
  - `pnpm build` passou para API, shared e web.
  - `pnpm exec prettier --check ...` passou nos arquivos novos/alterados com parser conhecido.
  - `docker compose config` passou.
  - `docker compose up --detach db` subiu PostgreSQL `healthy`; `docker compose down` derrubou sem erro.
- Observação de versão: Angular/CLI `22.0.0` exige TypeScript `>=6.0 <6.1`; Sprint 0 usa TypeScript `6.0.3` apesar do alvo inicial "TypeScript 5" do plano mestre.
- Planejamento de referência (feito com Codex, revisado por Claude em 2026-06-09):
  - `IMPLEMENTATION_PLAN.md` — plano mestre: sprints 0–10, endpoints, premissas, registro de decisões. **Começa pela seção "Como Executar Este Plano".**
  - `docs/architecture-plan.md` — módulos NestJS/Angular, modelo de dados, exemplos Kysely prontos (débito atômico, reset preguiçoso), simulador de destinatário, eventos WebSocket, códigos de erro com HTTP.
  - `docs/testing-strategy.md` — runners por pacote, casos críticos, fixtures cravadas, determinismo de E2E.
- Documentos originais do desafio (especificação de referência, **não editar**): `README.md`, `docs/backend.md`, `docs/frontend.md`, `docs/fullstack.md`, `docs/regras-negocio.md`, `docs/requisitos-tecnicos.md`, `docs/dicas.md`.

## Sua próxima ação

1. Revisar o diff da Sprint 0 e commitar o bloco, se ainda não estiver commitado:
   ```bash
   git add .
   git commit -m "chore: scaffold monorepo workspace"
   ```
2. Iniciar a **Sprint 1 - Contratos compartilhados** somente após a Sprint 0 estar commitada.
3. Para Sprint 1, ler `IMPLEMENTATION_PLAN.md`, `docs/architecture-plan.md` e `docs/testing-strategy.md`, gerar plano detalhado em `docs/superpowers/plans/` e seguir TDD.

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
