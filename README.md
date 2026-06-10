# Big Chat Brasil

Implementação fullstack do desafio técnico BCB: autenticação por CPF/CNPJ, onboarding de plano, cobrança pré/pós-paga, fila de mensagens com prioridade, WebSocket com simulador de destinatário e interface Angular de chat.

## Como Rodar

Requisitos:

- Docker com Docker Compose.
- Portas livres por padrão: `3000` API, `4200` web, `5432` Postgres.

```bash
docker compose up --build
```

Depois acesse:

- Web: `http://localhost:4200`
- API healthcheck: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`

Na inicialização, a API executa automaticamente `db:migrate` e `db:seed`. Isso deixa o banco pronto para demonstração sem passos manuais.
O Compose também sobe um serviço `worker` separado para processar a fila de mensagens; a API apenas persiste a mensagem e emite eventos realtime quando o worker chama a ponte interna.

Para encerrar e apagar o banco local:

```bash
docker compose down --volumes
```

Se a porta `3000` já estiver ocupada, a API pode ser publicada em outra porta:

```bash
API_PUBLISHED_PORT=3002 docker compose up --build
```

O web Docker recebe essa porta automaticamente e passa a chamar `http://localhost:3002`.

## Credenciais Demo

| Perfil              | Documento        | Tipo | Senha       | Observação                   |
| ------------------- | ---------------- | ---- | ----------- | ---------------------------- |
| Admin               | `52998224725`    | CPF  | `Admin@123` | Acesso para endpoints admin  |
| Empresa ABC         | `11222333000181` | CNPJ | `Demo@123`  | Pré-pago, saldo inicial R$25 |
| Pré-pago sem saldo  | `11144477735`    | CPF  | `Demo@123`  | Exercita saldo insuficiente  |
| Pós-pago com limite | `11444777000161` | CNPJ | `Demo@123`  | Limite mensal R$100          |
| Pós-pago no limite  | `12345678909`    | CPF  | `Demo@123`  | Exercita limite insuficiente |

Também é possível entrar com um CPF/CNPJ válido novo e senha qualquer. A conta é criada automaticamente e segue para o onboarding.

## Funcionalidades

- Login por documento e senha, com validação de CPF/CNPJ.
- Auto-registro de novo cliente.
- Onboarding pré-pago com PIX simulado e pós-pago com limite mensal.
- Listagem de conversas, busca, badges de não lidas e criação de nova conversa.
- Tela de conversa com histórico, bolhas, status, prioridade normal/urgente e composer.
- Cobrança por mensagem: normal `R$0,25`, urgente `R$0,50`.
- Fila processada por worker separado, com prioridade urgente, anti-starvation, polling do banco e recuperação de mensagens pendentes.
- Socket.IO autenticado para status, novas mensagens, atualização de conversa e digitação.
- Simulador de destinatário que marca mensagens como lidas, mostra digitação e responde.
- Swagger/OpenAPI gerado pela API, com schemas e teste para manter endpoints documentados.

## Stack

- Node.js `22`
- pnpm `10.33`
- TypeScript `6.0`
- NestJS `11`
- PostgreSQL `17`
- Kysely `0.29`
- Angular `22`
- Tailwind CSS `4`
- Socket.IO `4`
- Jest, Vitest e Playwright

## Comandos de Desenvolvimento

Instalação local:

```bash
pnpm install
```

Gates principais:

```bash
pnpm lint
pnpm test
pnpm build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e
```

Teste full-stack contra a stack Docker:

```bash
docker compose up --build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e:fullstack
```

Testes de banco da API, com Postgres disponível:

```bash
pnpm --filter @bcb/api test:db
```

## Endpoints Principais

- `GET /docs`
- `GET /docs-json`
- `POST /auth/session`
- `GET /auth/me`
- `POST /billing/onboarding`
- `POST /billing/pix-intents`
- `POST /billing/pix-intents/:id/confirm`
- `GET /billing/me`
- `GET /recipients`
- `GET /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/read`
- `POST /messages`
- `GET /messages/:id/status`
- `GET /queue/status`
- Socket.IO namespace `/chat`

## Worker da Fila

No Docker, a fila roda fora do processo HTTP:

- `api`: recebe requisições, persiste mensagens `queued`, mantém Socket.IO e simulador de destinatário.
- `worker`: faz polling de mensagens `queued`/`processing` no PostgreSQL, aplica prioridade e avança status `processing -> sent -> delivered`.
- Ponte interna: o worker chama `POST /internal/realtime/message-status` no API usando `x-internal-token`; o API publica o evento Socket.IO e aciona o simulador.

Variáveis principais:

- `QUEUE_PROCESSOR_ENABLED=false` no API Docker evita processamento local.
- `QUEUE_STATUS_PUBLISHER=http` no worker usa a ponte interna.
- `QUEUE_POLL_INTERVAL_MS=250` define a frequência de descoberta de mensagens novas.
- `INTERNAL_API_BASE_URL=http://api:3000` aponta o worker para o API na rede Docker.
- `INTERNAL_API_TOKEN` protege a ponte interna; em produção, trocar o default.

## Decisões e Premissas

- Kysely foi escolhido para manter SQL explícito e controle de transações.
- Dinheiro é sempre armazenado em centavos inteiros.
- A fila usa estruturas em memória dentro do worker, mas a fonte de verdade é o PostgreSQL; mensagens `queued`/`processing` são recuperadas no boot e por polling.
- O reset mensal pós-pago é preguiçoso, feito no uso.
- O seed roda no start da API em Docker para privilegiar demonstração reprodutível. Reiniciar a API reseta os dados demo.
- O frontend usa `http://localhost:3000` como fallback. No Docker, o web injeta a URL pública da API via `BCB_API_BASE_URL`; em desenvolvimento local, ainda é possível sobrescrever por `localStorage['bcb.api.baseUrl']`.
- O WebSocket usa JWT no handshake e salas por cliente/conversa.

## Limitações Conhecidas

- Sem paginação real de mensagens; o MVP retorna as últimas mensagens da conversa.
- Sem broker externo para fila; Redis/RabbitMQ ou pub/sub compartilhado seria o próximo passo para produção.
- `apps/web` ainda não tem runner unitário/component real; a cobertura de frontend está nos testes Playwright.
- O servidor web Docker usa um servidor estático Node simples, não Nginx.

## Documentação de Apoio

- Plano mestre: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)
- Arquitetura: [`docs/architecture-plan.md`](./docs/architecture-plan.md)
- Estratégia de testes: [`docs/testing-strategy.md`](./docs/testing-strategy.md)
- Especificação original do desafio: [`docs/fullstack.md`](./docs/fullstack.md)
