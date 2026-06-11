# Plano de Implementação - Big Chat Brasil

Este plano transforma o desafio documental do BCB em uma implementação fullstack evolutiva. A primeira versão deve ser simples de executar e demonstrar, mas já nascer com arquitetura, contratos e testes suficientes para permitir evolução por pequenos commits.

## Como Executar Este Plano (leia antes de codar)

Instruções para qualquer agente (humano ou IA) que for implementar uma sprint:

1. Leia, nesta ordem: este arquivo, [docs/architecture-plan.md](./docs/architecture-plan.md) e [docs/testing-strategy.md](./docs/testing-strategy.md). Os documentos originais do desafio (`README.md` e os demais `docs/*.md`) são a especificação de referência.
2. As sprints são sequenciais. Não inicie uma sprint sem a anterior commitada e com gates verdes.
3. Antes de codar uma sprint, gere um plano detalhado dela (tarefas pequenas, caminhos de arquivo exatos, código completo e comandos com saída esperada) e salve em `docs/superpowers/plans/`. No Claude Code, use a skill `superpowers:writing-plans` para gerar e `superpowers:subagent-driven-development` (ou `superpowers:executing-plans`) para executar.
4. TDD é obrigatório: escreva o teste que prova o comportamento, veja-o falhar, implemente o mínimo, veja-o passar, commite. Critérios de pronto estão em docs/testing-strategy.md.
5. Não invente fora do plano:
   - Dúvida de regra de negócio → resolva pela seção "Aderência ao Contrato do Desafio e Premissas"; se não estiver lá, pare e pergunte em vez de assumir.
   - Biblioteca fora da seção "Stack e Versões Alvo" → só com registro prévio na seção "Registro de Decisões".
   - Nomes de entidades, campos, eventos, códigos de erro e variáveis de ambiente já estão definidos nestes documentos; use-os exatamente como escritos.
6. Nunca declare uma tarefa concluída sem rodar os comandos de verificação da sprint e apresentar a saída real como evidência.

## Objetivo do MVP

Entregar uma aplicação de chat fullstack com:

- Backend NestJS com PostgreSQL, Kysely, autenticação JWT, bcrypt e validações Zod.
- Frontend Angular com Tailwind, rotas profundas, i18n português/inglês e tema claro/escuro.
- Monorepo `pnpm workspaces` com pacote `shared` para contratos e schemas.
- Mensageria com prioridade normal/urgente, status persistido e eventos WebSocket.
- Pagamento simulado para ativação inicial de conta e validação de consumo pré-pago/pós-pago.
- Testes unitários, integração e E2E desde o primeiro ciclo de implementação.

### Stack e Versões Alvo

Use a major estável mais recente de cada item no momento do scaffold e registre as versões reais no README. Alvos:

- Node.js 22 LTS, pnpm 10, TypeScript 5 em modo estrito.
- Backend: NestJS 11, `@nestjs/jwt`, WebSocket via `@nestjs/platform-socket.io` (Socket.IO 4), Kysely + driver `pg`, `kysely-codegen` (dev), `bcryptjs` (algoritmo bcrypt em JS puro, evita compilação nativa no Docker), Zod.
- Frontend: Angular (major estável atual no `ng new`, standalone + signals), Tailwind CSS, `@ngx-translate/core` para i18n em runtime, `socket.io-client`.
- Testes: Jest na API (padrão NestJS, com supertest), runner padrão do Angular CLI no web, Vitest no `packages/shared`, Playwright no E2E.
- Sem Turbo/Nx: orquestração por scripts `pnpm -r` simples.
- Docker: imagens `node:22-slim` (não usar Alpine, evita surpresas com binários nativos) e `postgres:17`.
- Nomes dos pacotes do workspace: `@bcb/api`, `@bcb/web`, `@bcb/shared`.

## Escopo Funcional Inicial

### Fluxo do cliente

1. Usuário acessa `/login`.
2. Informa CPF ou CNPJ e senha. Não haverá seletor CPF/CNPJ.
3. Frontend infere o tipo pelo formato e envia ao backend.
4. Backend normaliza e valida o documento com Zod.
5. Se o documento existir, valida a senha com bcrypt.
6. Se não existir, cria uma conta cliente com senha hash bcrypt e retorna JWT com `requiresOnboarding: true`.
7. Usuário completa onboarding em `/onboarding`, escolhendo nome, plano e pagamento simulado.
8. Conta fica ativa após confirmação simulada.
9. Usuário acessa lista de conversas em `/conversations`.
10. Usuário abre uma conversa em `/conversations/:conversationId`.
11. Usuário envia mensagem normal ou urgente.
12. Backend valida saldo/limite, debita ou registra consumo, persiste mensagem e enfileira processamento.
13. Status da mensagem é atualizado por WebSocket.

### Fluxo de navegação

Todas as telas importantes devem ter URL própria:

- `/login`
- `/onboarding`
- `/conversations`
- `/conversations/:conversationId`
- `/billing`

O estado de navegação deve ser recuperável por URL para permitir abrir chats em nova aba, compartilhar links internos e restaurar estado após reload.

### Idioma e tema

Desde o início o topo da aplicação deve ter:

- Select de idioma: `pt-BR` e `en-US`.
- Toggle claro/escuro com ícone sol/lua.
- Persistência local da preferência de idioma e tema.

## Aderência ao Contrato do Desafio e Premissas

Perfil escolhido: **Fullstack** (avaliação: backend 40%, frontend 40%, integração 20%).

O enunciado sugere endpoints e payloads em `docs/backend.md` e `docs/fullstack.md`. Onde divergimos, o motivo fica registrado aqui e deve ser repetido no README final:

| Enunciado | Nossa implementação | Nota |
|-----------|---------------------|------|
| `POST /auth` | `POST /auth/session` | Mesmo contrato de resposta (`{token, client}`), mas com senha e auto-registro. |
| `GET /clients/:id/balance` | `GET /billing/me` | Cliente autenticado consulta o próprio saldo; a variante admin por `:id` fica pós-MVP. |
| `GET /conversations`, `GET /conversations/:id`, `GET /conversations/:id/messages` | Iguais | — |
| `POST /messages` | Igual | Resposta inclui `estimatedDelivery` e `currentBalance` (pré-pago), como no enunciado. Aceita `recipientId` para criar conversa nova. |
| `GET /messages/:id`, `GET /messages/:id/status` | Iguais | — |
| `GET /messages` (lista com filtros) | Coberto por `GET /conversations/:id/messages` | Premissa: listagem global com filtros só faz sentido com admin, fica pós-MVP. |
| `GET /queue/status` | Igual (role `admin`) | Entra no MVP na Sprint 5; vitrine do desafio principal. |
| CRUD `/clients` (admin) | Pós-MVP | Auto-registro + onboarding cobrem criação/ativação de cliente no MVP. |

Premissas assumidas (copiar para o README final):

1. O campo "tipo (SMS/WhatsApp)" citado em `docs/regras-negocio.md` não é modelado no MVP: os exemplos JSON do próprio enunciado não trazem esse campo. Adicionar uma coluna `channel` depois é trivial e fica documentado como evolução.
2. Não há seletor PF/PJ na tela de login: o tipo é inferido pelo tamanho do documento (11 dígitos = CPF, 14 = CNPJ) com validação de dígitos verificadores. A tela de identificação exigida existe, apenas sem o radio button.
3. Autenticação com senha + bcrypt + JWT excede o mínimo do FAQ (token/header simples) por decisão consciente, para demonstrar segurança.
4. Não há envio real de mensagens (FAQ permite simular): `sent`/`delivered` são produzidos pelo processador da fila com delays configuráveis, e `read`/respostas/typing pelo simulador de destinatário.
5. Funções administrativas de `docs/regras-negocio.md` §4 (adicionar créditos, ajustar limite, converter plano) ficam pós-MVP e documentadas como trabalho futuro.
6. Reset mensal do consumo pós-pago é atendido por reset preguiçoso no envio (coluna `usageMonth`), sem cron.
7. Sem paginação real de mensagens no MVP: histórico retorna as últimas 200 mensagens da conversa em ordem cronológica.
8. Valores monetários são sempre inteiros em centavos no banco e nos contratos; formatação em BRL acontece só na UI.

## Regras de Autenticação e Segurança

O JWT deve conter, no mínimo:

```ts
type JwtPayload = {
  sub: string;
  documentId: string;
  documentType: 'CPF' | 'CNPJ';
  role: 'client' | 'admin';
  clientId?: string;
};
```

No NestJS, usar guards é mais idiomático que middleware para autorização. A implementação deve ter:

- `JwtAuthGuard` para validar assinatura, expiração e payload.
- `RolesGuard` para checar `client` ou `admin`.
- Escopo por dono nos endpoints de cliente, conversa, mensagem e cobrança.
- Permissão admin apenas nos endpoints administrativos.

Nunca confiar em `clientId` vindo do body quando o endpoint é de cliente autenticado. O backend deve derivar o cliente a partir do token.

## Modelo de Pagamento Sugerido

Os documentos do desafio definem as regras principais:

- Pré-pago: verificar saldo, debitar, registrar transação e enfileirar mensagem.
- Pós-pago: verificar limite mensal, registrar consumo, atualizar limite e enfileirar mensagem.
- Normal custa R$0,25.
- Urgente custa R$0,50.

Como não há gateway real no desafio, o MVP deve simular pagamento de forma explícita e testável.

### Onboarding pré-pago

1. Usuário escolhe plano `prepaid`.
2. Usuário escolhe um valor inicial, por exemplo R$25, R$50 ou R$100.
3. Backend cria uma intenção de pagamento PIX simulada com status `pending`.
4. Frontend mostra uma tela de pagamento fictícia.
5. Usuário clica em "Já paguei".
6. Backend confirma o pagamento simulado, cria transação `credit`, ativa a conta e credita saldo.

Regra de envio:

- Se `balanceCents < messageCostCents`, retornar erro de saldo insuficiente.
- Se houver saldo, debitar no enfileiramento.
- O débito deve ser atômico: `UPDATE` condicional (`WHERE balance_cents >= custo`) dentro da mesma transação que cria a `BillingTransaction` e a `Message`. Dois envios simultâneos nunca podem deixar o saldo negativo. Exemplo de query em docs/architecture-plan.md, seção Kysely.
- Se a simulação de envio falhar, criar transação de estorno e marcar mensagem como `failed`.

### Onboarding pós-pago

1. Usuário escolhe plano `postpaid`.
2. Usuário escolhe limite mensal, por exemplo R$50, R$100 ou R$200.
3. Backend ativa a conta com `monthlyLimitCents` e `monthlyUsedCents = 0`.
4. Nenhum pagamento inicial é necessário no MVP.

Regra de envio:

- Antes de validar, aplicar o reset preguiçoso: se `usageMonth` for diferente do mês corrente (`YYYY-MM`), zerar `monthlyUsedCents` e gravar o mês corrente em `usageMonth`, na mesma transação do envio. Isso cumpre a regra "limite zerado no início de cada mês" sem cron.
- Se `monthlyUsedCents + messageCostCents > monthlyLimitCents`, retornar erro de limite insuficiente.
- Se houver limite, incrementar `monthlyUsedCents` com `UPDATE` condicional atômico, no mesmo padrão do débito pré-pago. Exemplo em docs/architecture-plan.md, seção Kysely.
- A tela de cobrança mostra consumo atual e limite restante.

### O que fica para depois

- Webhook real de PIX.
- Fatura mensal real para pós-pago.
- Admin para adicionar créditos, ajustar limite e converter plano.

O reset mensal de consumo não fica para depois: é atendido no MVP pelo reset preguiçoso via `usageMonth` descrito acima.

## Endpoints Principais

### Auth

- `POST /auth/session`: login ou criação automática por CPF/CNPJ e senha.
- `POST /auth/logout`: opcional, limpa sessão no cliente.
- `GET /auth/me`: retorna usuário atual, role, perfil e flags de onboarding.

### Onboarding e cobrança

- `POST /billing/onboarding`: define nome, plano e configuração inicial.
- `POST /billing/pix-intents`: cria pagamento PIX simulado para pré-pago.
- `POST /billing/pix-intents/:id/confirm`: confirma pagamento simulado.
- `GET /billing/me`: saldo, limite, consumo e histórico resumido.

### Conversas

- `GET /conversations`: lista conversas do cliente autenticado.
- `GET /conversations/:id`: detalhe da conversa, com checagem de dono.
- `GET /conversations/:id/messages`: mensagens da conversa (últimas 200, ordem cronológica).
- `POST /conversations/:id/read`: zera `unreadCount`; o frontend chama ao abrir a conversa.
- `GET /recipients`: catálogo de contatos (seedados) para iniciar conversa nova.

### Mensagens

- `POST /messages`: envia mensagem. Recebe `conversationId` ou, para conversa nova, `recipientId` (find-or-create da conversa, como prevê o contrato do enunciado). Resposta: `{ id, status: 'queued', timestamp, estimatedDelivery, cost, currentBalance? }`.
- `GET /messages/:id`: detalhe da mensagem, com checagem de dono.
- `GET /messages/:id/status`: status atual.

### Fila

- `GET /queue/status`: tamanho das filas por prioridade, contadores de processadas/falhas. Exige role `admin` (demonstrável via curl/Swagger com o admin do seed).

### WebSocket

- Namespace sugerido: `/chat`.
- Autenticação no handshake com JWT.
- Salas por cliente e conversa.
- Eventos mínimos:
  - `message.created`
  - `message.status`
  - `conversation.updated`
  - `typing.started`
  - `typing.stopped`

### Admin futuro

O CRUD administrativo não entra no MVP, mas a arquitetura deve deixar pronto:

- `GET /clients`
- `POST /clients`
- `GET /clients/:id`
- `PATCH /clients/:id`
- `GET /clients/:id/balance`
- `POST /clients/:id/credits`
- `PATCH /clients/:id/plan`

Todos devem exigir role `admin`. (`GET /queue/status` já entra no MVP, ver seção Fila acima.)

## Arquitetura do Monorepo

Estrutura sugerida:

```txt
.
├── apps
│   ├── api
│   │   ├── migrations
│   │   ├── src
│   │   └── test
│   └── web
│       ├── src
│       └── e2e
├── packages
│   └── shared
│       └── src
├── docs
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

Orquestração por scripts `pnpm -r` no `package.json` raiz; sem Turbo/Nx (ver Registro de Decisões).

Pacotes:

- `apps/api`: NestJS, Kysely, JWT, WebSocket, regras de negócio.
- `apps/web`: Angular standalone, Tailwind, router, i18n, tema.
- `packages/shared`: Zod schemas, tipos inferidos, enums, validadores de CPF/CNPJ e contratos de API.

## Banco de Dados Inicial

Usar Kysely com PostgreSQL.

Diretriz:

- A fonte de verdade do banco deve ser a migration SQL/TypeScript.
- O acesso ao banco deve ficar explícito nos repositórios usando Kysely.
- Queries complexas devem ser escritas de maneira próxima ao SQL, com joins, locks e transações visíveis no arquivo.
- Usar o driver `pg` com o dialeto PostgreSQL do Kysely.
- Manter tipos do banco em `src/database/database.types.ts`, preferencialmente gerados por `kysely-codegen` após aplicar migrations. Se a geração automática atrasar o scaffold, manter tipos manuais inicialmente e documentar o comando de geração.

Entidades iniciais:

- `Account`: credencial, documento, senha hash, role, status.
- `ClientProfile`: dados comerciais, plano, saldo, limite, onboarding.
- `Recipient`: contato final da conversa.
- `Conversation`: relação cliente-contato.
- `Message`: conteúdo, prioridade, status, custo e timestamps.
- `BillingTransaction`: créditos, débitos, consumo, estornos e pagamentos simulados.
- `PaymentIntent`: PIX simulado, valor e status.

Observação sobre Kysely, queries e ORM:

- Queries TypeScript são viáveis.
- Kysely é um query builder SQL tipado. Ele é mais próximo de escrever SQL em TypeScript e não é um ORM completo.
- Kysely tende a dar mais controle e previsibilidade para queries complexas, autorização por dono, transações financeiras e relatórios.
- Prisma é um ORM com schema próprio, migrations, client tipado e boa legibilidade para CRUD e relações.
- TypeORM é ORM tradicional com entities/decorators e integração comum no NestJS.
- Para este desafio, Kysely passa a ser a escolha preferida porque deixa as queries explícitas no arquivo, facilita raciocínio de agentes de IA e mantém flexibilidade para SQL mais manual.
- A decisão não deve ser vendida como "mais performático por padrão"; o ganho principal é controle. Performance dependerá dos índices, plano de execução, joins, transações e volume de roundtrips.

## Estratégia de Fila Inicial

A fila inicial será em memória, mas persistindo o estado da mensagem no banco.

Fluxo:

1. `POST /messages` valida entrada com Zod.
2. Backend busca cliente pelo token.
3. Backend calcula custo pela prioridade.
4. Numa única transação Kysely: valida e debita saldo/limite com `UPDATE` condicional atômico, cria a `BillingTransaction` e cria a `Message` com status `queued`.
5. Resposta retorna `estimatedDelivery = createdAt + 5s` (constante `ESTIMATED_DELIVERY_SECONDS` no shared; valor simulado e documentado).
6. Backend adiciona job em fila em memória.
7. Processador atualiza status: `processing` → `sent` (após `QUEUE_SENT_DELAY_MS`) → `delivered` (após `QUEUE_DELIVERED_DELAY_MS`). Em falha simulada: `failed` + estorno no pré-pago.
8. `read` não vem do processador: é marcado pelo simulador de destinatário (abaixo) quando o contato "lê e responde".
9. Cada mudança de status é persistida e emitida por WebSocket.

Recuperação após restart (a fila é em memória, o estado não): no bootstrap do módulo `queue`, buscar mensagens com status `queued` ou `processing` no banco e re-enfileirá-las por `createdAt`, urgentes primeiro. Isso evita mensagens órfãs e é um diferencial citado no FAQ do desafio.

Preparação para worker futuro:

- Definir uma interface `MessageQueuePort`.
- Implementar `InMemoryMessageQueue`.
- Isolar o processador em serviço próprio.
- Evitar que controller conheça a implementação da fila.

### Simulador de Destinatário

Sem ele, `typing.*`, `read`, `unreadCount` e mensagens recebidas não têm fonte — o chat vira monólogo. Comportamento (detalhes em docs/architecture-plan.md):

1. Quando uma mensagem do cliente chega a `delivered`, o simulador agenda uma reação com delay configurável.
2. A reação: marca as mensagens `delivered` do cliente naquela conversa como `read` (emite `message.status`), emite `typing.started`, aguarda, cria mensagem de resposta (`senderType: 'user'`, texto de uma lista fixa), emite `typing.stopped` e `message.created`, incrementa `unreadCount` e emite `conversation.updated`.
3. Controlado por env: `RECIPIENT_SIMULATOR_ENABLED` (default `true`; `false` em testes de integração), `RECIPIENT_SIMULATOR_READ_DELAY_MS`, `RECIPIENT_SIMULATOR_TYPING_MS`.
4. Agendamentos não sobrevivem a restart (aceitável; é simulação, documentar no README).

## TDD e Qualidade

Nenhuma funcionalidade deve ser considerada concluída sem testes.

Gates mínimos:

- Por commit: `pnpm lint`, testes dos pacotes afetados (`pnpm test:api` / `pnpm test:web` / `pnpm test:shared`) e `pnpm build`.
- Por fechamento de sprint: suíte completa (`pnpm lint`, `pnpm test`, `pnpm build`).
- `pnpm test:e2e` passa a ser gate a partir da Sprint 9, quando existe fluxo web completo.

A estratégia detalhada está em [docs/testing-strategy.md](./docs/testing-strategy.md).

## Subtarefas por Sprint

### Sprint 0 - Fundação do monorepo

Objetivo: criar estrutura base executável.

Tarefas:

- Criar `pnpm-workspace.yaml`.
- Criar `apps/api` (`@bcb/api`), `apps/web` (`@bcb/web`) e `packages/shared` (`@bcb/shared`).
- Configurar TypeScript, ESLint, Prettier e scripts raiz (`pnpm -r`, sem Turbo).
- Criar `docker-compose.yml` com PostgreSQL, API e web.
- Criar `.env.example` com todas as variáveis usadas no projeto:

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

Verificação:

- `pnpm install`
- `pnpm lint`
- `pnpm build`
- `docker compose up` sobe PostgreSQL e serviços base.

Commit sugerido: `chore: scaffold monorepo workspace`

### Sprint 1 - Contratos compartilhados

Objetivo: estabelecer contratos antes das telas e endpoints.

Tarefas:

- Criar enums compartilhados: roles, planos, prioridades, status de mensagem.
- Criar validadores Zod para CPF/CNPJ e inferência de tipo.
- Criar schemas de auth, onboarding, billing, conversation e message.
- Exportar tipos inferidos para API e web.
- Testar validação de documentos, custos e contratos.

Verificação:

- `pnpm --filter @bcb/shared test`
- Casos inválidos de CPF/CNPJ falham.
- Tipos de request/response são inferidos dos schemas.

Commit sugerido: `feat(shared): add contracts and document validation`

### Sprint 2 - Banco, Kysely e seed

Objetivo: persistência real com dados mínimos de demo.

Tarefas:

- Configurar Kysely com driver `pg` no backend.
- Criar tipos do banco em `src/database/database.types.ts`.
- Criar migrations explícitas em `apps/api/migrations`.
- Criar helpers `generateCpf()`/`generateCnpj()` em `@bcb/shared` (subpath de testing) — documentos gerados com dígitos verificadores válidos, para seed e testes. Não inventar documentos à mão: o validador do shared os rejeita.
- Criar seed com as contas demo abaixo (documentos válidos, publicar no README final), recipients dos wireframes (Maria Oliveira, Carlos Pereira, Ana Costa, Pedro Santos) e conversas com histórico para a Empresa ABC:

| Conta | Documento | Senha | Estado |
|-------|-----------|-------|--------|
| Admin | CPF `52998224725` | `Admin@123` | role `admin` |
| Empresa ABC (pré-pago com saldo) | CNPJ `11222333000181` | `Demo@123` | `balanceCents: 2500`, onboarding completo |
| Pré-pago sem saldo | CPF `11144477735` | `Demo@123` | `balanceCents: 0`, onboarding completo |
| Pós-pago com limite | CNPJ `11444777000161` | `Demo@123` | limite R$100, consumo zero |
| Pós-pago no limite | CPF `12345678909` | `Demo@123` | limite R$10, consumo R$10 |

- Criar helper de limpeza/seed para testes.
- Criar scripts de migration `db:migrate`, `db:rollback` e `db:seed`.

Verificação:

- `pnpm --filter @bcb/api db:migrate`
- `pnpm --filter @bcb/api db:seed`
- Testes de repositório ou integração validam schema básico e queries Kysely.

Commit sugerido: `feat(api): add kysely migrations and seed data`

### Sprint 3 - Auth JWT e bcrypt

Objetivo: login ou criação automática segura.

Tarefas:

- Implementar `POST /auth/session`.
- Hash de senha com bcrypt na criação (pacote `bcryptjs`).
- Comparação de senha no login.
- JWT com role e identificador (`@nestjs/jwt`).
- Guards de JWT e roles.
- Endpoint `GET /auth/me`.
- Habilitar CORS no Nest com origem vinda de `CORS_ORIGIN`.
- Implementar `ZodValidationPipe` próprio em `apps/api/src/shared` (sem lib externa; código de referência em docs/architecture-plan.md).
- Testes de criação, login, senha incorreta, documento inválido e payload JWT.

Verificação:

- `pnpm test:api`
- Endpoints protegidos recusam requisições sem token.
- Token não permite acessar recurso de outro cliente.

Commit sugerido: `feat(api): implement jwt auth with document login`

### Sprint 4 - Onboarding e cobrança

Objetivo: ativar contas por plano com pagamento simulado.

Tarefas:

- Implementar onboarding para pré-pago e pós-pago.
- Implementar PIX simulado para pré-pago.
- Implementar saldo, limite e histórico resumido.
- Criar transações de crédito, débito, consumo e estorno.
- Testar regras financeiras.

Verificação:

- Pré-pago sem saldo não envia mensagem.
- Pré-pago com pagamento confirmado ganha saldo.
- Pós-pago respeita limite mensal.
- Conta sem onboarding não acessa chat.

Commit sugerido: `feat(api): add onboarding and billing rules`

### Sprint 5 - Conversas, mensagens e fila

Objetivo: fluxo principal de chat no backend.

Tarefas:

- Implementar listagem de conversas.
- Implementar histórico de mensagens e `POST /conversations/:id/read`.
- Implementar `GET /recipients` (catálogo seedado).
- Implementar envio de mensagem com `conversationId` ou `recipientId` (find-or-create de conversa) e resposta com `estimatedDelivery`.
- Implementar fila em memória com prioridade e contadores.
- Implementar recuperação de mensagens `queued`/`processing` no bootstrap do módulo.
- Implementar `GET /queue/status` com role `admin`.
- Persistir mudanças de status (`processing` → `sent` → `delivered`, delays por env).
- Testar FIFO para normal, prioridade para urgente e anti-starvation básico.

Verificação:

- `POST /messages` cria mensagem `queued` e retorna `estimatedDelivery`.
- `POST /messages` com `recipientId` cria a conversa quando não existe.
- Mensagens urgentes são processadas antes das normais pendentes.
- Status progride para `processing`, `sent` e `delivered`.
- Regras financeiras rodam antes de enfileirar, com débito atômico.
- Após restart simulado, mensagens pendentes voltam para a fila.

Commit sugerido: `feat(api): add conversations messages and priority queue`

### Sprint 6 - WebSocket

Objetivo: atualizar o frontend em tempo real.

Tarefas:

- Criar gateway `/chat`.
- Autenticar handshake com JWT (`socket.handshake.auth.token`).
- Entrar em sala por cliente/conversa.
- Emitir eventos de status de mensagem.
- Implementar o módulo `simulator` (simulador de destinatário): marca `read`, emite `typing.started`/`typing.stopped`, cria mensagem de resposta e atualiza `unreadCount`, conforme a seção "Simulador de Destinatário".
- Testar autorização e emissão de eventos (simulador com delays zerados via env).

Verificação:

- Cliente recebe status da própria mensagem.
- Cliente não recebe evento de outro cliente.
- Evento de digitação aparece apenas na conversa correta.
- Após `delivered`, simulador marca `read` e cria resposta do destinatário.
- `RECIPIENT_SIMULATOR_ENABLED=false` desativa completamente o simulador.

Commit sugerido: `feat(api): add authenticated chat websocket`

### Sprint 7 - Shell Angular, rotas, tema e i18n

Objetivo: base navegável do frontend.

Tarefas:

- Criar app Angular standalone.
- Configurar Tailwind (dark mode por classe no elemento raiz).
- Configurar rotas.
- Configurar i18n runtime com `@ngx-translate/core`; traduções em `src/assets/i18n/pt-BR.json` e `en-US.json`, organizadas por feature.
- Criar layout com seletor de idioma e toggle claro/escuro (persistência em `localStorage`).
- Criar guards de rota para auth e onboarding.
- Testar navegação e persistência de preferências.

Verificação:

- `/login`, `/onboarding`, `/conversations` e `/conversations/:id` funcionam.
- Idioma e tema persistem após reload.
- Rotas protegidas redirecionam corretamente.

Commit sugerido: `feat(web): add angular shell routing i18n and theme`

### Sprint 8 - Login e onboarding web

Objetivo: criar conta, autenticar e ativar plano pelo frontend.

Tarefas:

- Tela de login com documento e senha.
- Inferência visual de CPF/CNPJ.
- Validação client-side com schemas compartilhados.
- Fluxo de criação automática.
- Tela de onboarding com escolha de plano.
- Tela de pagamento PIX simulado.
- Testes de componentes e services.

Verificação:

- Documento inválido mostra erro.
- Conta nova vai para onboarding.
- Conta ativa vai para conversas.
- Confirmação PIX ativa pré-pago.

Commit sugerido: `feat(web): add login and onboarding flows`

### Sprint 9 - Chat web integrado

Objetivo: experiência principal de conversa.

Tarefas:

- Lista de conversas responsiva, com badge de `unreadCount`.
- Tela de chat com bolhas, indicadores de status (✓ enviada, ✓✓ entregue, ✓✓ destacado para lida, erro) e indicador "escrevendo...".
- Campo de mensagem com prioridade normal/urgente.
- Exibição de saldo ou limite.
- Integração REST para histórico e envio; marcar conversa como lida ao abrir (`POST /conversations/:id/read`).
- Integração WebSocket para status, novas mensagens e digitação.
- Botão "+ Nova Conversa" listando `GET /recipients` (primeiro item a cortar se o prazo apertar; nesse caso, documentar no README).
- Busca básica em conversas.

Verificação:

- Abrir `/conversations/:id` direto carrega conversa.
- Enviar mensagem atualiza UI sem reload.
- Status muda via WebSocket até `read` (com simulador ligado).
- Resposta do simulador aparece na conversa e incrementa o badge em `/conversations`.
- Urgente tem diferenciação visual.

Commit sugerido: `feat(web): add integrated chat experience`

### Sprint 10 - E2E, Docker e documentação final

Objetivo: fechar entrega executável e demonstrável.

Tarefas:

- Criar testes Playwright do fluxo completo.
- Ajustar docker compose para ambiente limpo: a API roda `db:migrate` e `db:seed` automaticamente no start em Docker (entrypoint), para que `git clone && docker compose up` funcione sem passos manuais.
- Criar README de execução com: tecnologias e versões, passo a passo, tabela de credenciais demo (Sprint 2), tabela de aderência ao contrato do desafio e premissas (seção deste plano), decisões e limitações, trabalho futuro.
- Swagger/OpenAPI em `/docs` e `/docs-json`, com teste que falha se endpoint novo entrar sem documentação.

Verificação:

- `docker compose up` em ambiente limpo sobe banco (migrado e seedado), API e web.
- Login com as credenciais demo do README funciona.
- Playwright cobre login/criação, onboarding, conversas, envio e status.
- README permite rodar o projeto sem conhecimento prévio.

Commit sugerido: `test: add e2e coverage for main chat flow`

## Registro de Decisões

Decisões confirmadas para o MVP. Mudar qualquer uma exige atualizar este registro (e as seções afetadas) antes de codar:

1. Kysely em vez de Prisma/TypeORM — queries explícitas e controle de transações.
2. Guards do Nest em vez de middleware puro para autorização.
3. i18n runtime com `@ngx-translate/core` em vez do i18n build-time do Angular.
4. Socket.IO pelo gateway do Nest para reduzir boilerplate WebSocket.
5. `bcryptjs` em vez de `bcrypt` nativo — elimina compilação nativa no Docker.
6. Jest na API, Vitest no shared, runner padrão do Angular CLI no web — não unificar runners no MVP.
7. Scripts `pnpm -r` sem Turbo/Nx.
8. Reset mensal do pós-pago é preguiçoso (coluna `usageMonth`), sem cron.
9. Fila em memória com recuperação de pendências no boot; sem broker externo no MVP.
10. Simulador de destinatário no backend dá fonte a typing/read/respostas; desligável por env.
11. "Nova conversa" (`GET /recipients` + `recipientId` no envio) entra no MVP, mas é o primeiro corte se o prazo apertar — documentando no README.
12. Sem paginação real de mensagens no MVP (últimas 200 por conversa).
