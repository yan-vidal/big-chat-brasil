# Handoff — Big Chat Brasil (BCB)

> Documento vivo de passagem de bastão entre sessões/agentes. Quem encerrar uma sessão de trabalho **atualiza as seções "Estado atual" e "Sua próxima ação"** antes de parar. Responder e documentar sempre em português (pt-BR).

## O que é este projeto

Desafio técnico da Irrah (plataforma de chat "Big Chat Brasil"), perfil **Fullstack** (avaliação: backend 40%, frontend 40%, integração 20%). A entrega é um repositório público no GitHub que o avaliador roda com `git clone && docker compose up`, seguida de entrevista de live-coding onde o Yan explica decisões e faz pequenas modificações ao vivo. Qualidade > quantidade: corte documentado no README vale mais que feature incompleta.

## Estado atual (2026-06-09)

- **Nenhum código implementado. Sprint 0 não iniciada.**
- Planejamento completo, revisado e pronto para execução (feito com Codex, revisado por Claude em 2026-06-09):
  - `IMPLEMENTATION_PLAN.md` — plano mestre: sprints 0–10, endpoints, premissas, registro de decisões. **Começa pela seção "Como Executar Este Plano".**
  - `docs/architecture-plan.md` — módulos NestJS/Angular, modelo de dados, exemplos Kysely prontos (débito atômico, reset preguiçoso), simulador de destinatário, eventos WebSocket, códigos de erro com HTTP.
  - `docs/testing-strategy.md` — runners por pacote, casos críticos, fixtures cravadas, determinismo de E2E.
- Documentos originais do desafio (especificação de referência, **não editar**): `README.md`, `docs/backend.md`, `docs/frontend.md`, `docs/fullstack.md`, `docs/regras-negocio.md`, `docs/requisitos-tecnicos.md`, `docs/dicas.md`.
- Os 3 documentos de planejamento e este handoff estão **untracked** no git (branch `main`; commits existentes são só o upload do enunciado).
- Não existe nenhuma decisão tomada fora desses documentos. Este handoff é completo.

## Sua próxima ação

1. Commitar o planejamento:
   ```bash
   git add IMPLEMENTATION_PLAN.md docs/architecture-plan.md docs/testing-strategy.md HANDOFF.md
   git commit -m "docs: add implementation, architecture and testing plans"
   ```
2. Ler, nesta ordem: `IMPLEMENTATION_PLAN.md` → `docs/architecture-plan.md` → `docs/testing-strategy.md`.
3. Executar a **Sprint 0** seguindo o processo da seção "Como Executar Este Plano": gerar o plano detalhado da sprint com a skill `superpowers:writing-plans`, salvar em `docs/superpowers/plans/`, executar com `superpowers:subagent-driven-development` (ou `superpowers:executing-plans`).

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
