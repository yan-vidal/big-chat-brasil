# Aderência ao desafio BCB

Data da revisão: 2026-06-10.

## Fontes revisadas

- Commit raiz `e3e1f35`: contem apenas `README.md` com `# irrah-tech-challenges`.
- Especificação detalhada atualmente no repo: `docs/backend.md`, `docs/frontend.md`, `docs/fullstack.md`, `docs/regras-negocio.md`, `docs/requisitos-tecnicos.md`, `docs/dicas.md`.
- Implementação atual: controllers NestJS, `OPENAPI_OPERATIONS`, README e suites de testes.

## Resultado executivo

O projeto atende ao fluxo fullstack principal e excede a maior parte dos diferenciais esperados: backend real, PostgreSQL, Docker Compose, fila priorizada com worker separado, cobrança pré/pós-paga, WebSocket, simulador, painel admin, Swagger/OpenAPI e testes automatizados.

As divergências restantes são de contrato literal, não de fluxo principal:

- A especificação backend sugere paths genéricos `/auth` e `/clients`; a implementação usa `/auth/session` e `/admin/clients` com JWT/role admin.
- A especificação sugere `GET /messages` com filtros; a implementação expõe histórico por `GET /conversations/:id/messages` e detalhes/status por `GET /messages/:id` e `GET /messages/:id/status`.
- `docs/regras-negocio.md` cita tipo SMS/WhatsApp, mas o modelo implementado é chat channel-agnostic com prioridade `normal`/`urgent`, alinhado aos modelos de mensagem dos documentos backend/fullstack.

## Matriz de aderência

| Item do desafio                                     | Status                   | Implementação atual                                                               |
| --------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| Login/identificação por CPF/CNPJ                    | Atendido                 | `POST /auth/session`, `GET /auth/me`, validação de CPF/CNPJ e auto-registro       |
| Gerenciamento de clientes                           | Atendido com paths admin | `GET/POST /admin/clients`, status, créditos, limite e conversão de plano          |
| Cliente PF/PJ, ativo/inativo, pré/pago e pós/pago   | Atendido                 | Schema compartilhado, seed, onboarding e painel admin                             |
| Envio de mensagens                                  | Atendido                 | `POST /messages` com `conversationId` ou `recipientId`, prioridade e custo        |
| Histórico de conversas                              | Atendido                 | `GET /conversations`, `GET /conversations/:id`, `GET /conversations/:id/messages` |
| Detalhe/status de mensagem                          | Atendido                 | `GET /messages/:id`, `GET /messages/:id/status`                                   |
| Fila FIFO básica                                    | Atendido/excedido        | Fila em memória no worker com fonte de verdade no PostgreSQL                      |
| Prioridade normal/urgente                           | Atendido                 | Filas separadas e custo `R$0,25`/`R$0,50`                                         |
| Anti-starvation                                     | Atendido                 | Normal recebe turno após tres urgentes consecutivas                               |
| Worker assíncrono separado                          | Atendido/excedido        | Serviço Docker `worker`, polling e ponte interna para realtime                    |
| Status queued/processing/sent/delivered/read/failed | Atendido                 | Persistência, APIs, WebSocket e simulador                                         |
| Validação pré-paga                                  | Atendido                 | Débito atomico, saldo insuficiente e refund em falha pós-cobrança                 |
| Validação pós-paga                                  | Atendido                 | Limite mensal, consumo e reset preguiçoso por mês                                 |
| Saldo/consumo e transações                          | Atendido                 | `GET /billing/me`, PIX simulado e aba `Cobrança`                                  |
| Estatísticas da fila                                | Atendido                 | `GET /queue/status`, restrito a admin                                             |
| Interface de login                                  | Atendido                 | Angular `/login`, senha e documento                                               |
| Lista de conversas                                  | Atendido                 | Busca, badges e nova conversa                                                     |
| Chat com histórico e envio                          | Atendido                 | Bolhas, prioridade, status e composer                                             |
| Indicador de saldo/limite                           | Atendido                 | Lista, conversa e cobrança                                                        |
| Responsividade básica                               | Atendido                 | Layout Tailwind responsivo e Playwright cobrindo shell                            |
| Tempo real                                          | Atendido/excedido        | Socket.IO autenticado e eventos de status/mensagem/conversa/digitação             |
| Simulador de resposta                               | Atendido/excedido        | Recipients simulados e resposta automática                                        |
| Conversa entre contas reais                         | Atendido/excedido        | Recipients vinculados a contas onboarded                                          |
| Docker Compose                                      | Atendido                 | API, web, db e worker                                                             |
| README de execução                                  | Atendido                 | Instruções, credenciais demo, endpoints e decisões                                |
| Swagger/OpenAPI                                     | Atendido                 | `/docs`, `/docs-json` e teste de contrato                                         |
| Testes automatizados                                | Atendido                 | Jest/Supertest API, Vitest shared, Playwright e full-stack dedicado               |

## Endpoints sugeridos vs implementados

| Sugerido                          | Status                   | Implementado                                                                       |
| --------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `POST /auth`                      | Equivalente              | `POST /auth/session`                                                               |
| `GET /clients`                    | Equivalente admin        | `GET /admin/clients`                                                               |
| `POST /clients`                   | Equivalente admin        | `POST /admin/clients`                                                              |
| `GET /clients/:id`                | Parcial/equivalente      | Dados aparecem em `GET /admin/clients`; não há path literal de detalhe             |
| `PUT /clients/:id`                | Parcial/equivalente      | Operações específicas: status, crédito, limite e plano                             |
| `GET /clients/:id/balance`        | Equivalente por contexto | `GET /billing/me` para cliente autenticado; admin enxerga saldo/limite na listagem |
| `GET /conversations`              | Atendido                 | `GET /conversations`                                                               |
| `GET /conversations/:id`          | Atendido                 | `GET /conversations/:id`                                                           |
| `GET /conversations/:id/messages` | Atendido                 | `GET /conversations/:id/messages`                                                  |
| `POST /messages`                  | Atendido                 | `POST /messages`                                                                   |
| `GET /messages`                   | Parcial/equivalente      | Não há listagem global com filtros; histórico é por conversa                       |
| `GET /messages/:id`               | Atendido                 | `GET /messages/:id`                                                                |
| `GET /messages/:id/status`        | Atendido                 | `GET /messages/:id/status`                                                         |
| `GET /queue/status`               | Atendido                 | `GET /queue/status`, admin-only                                                    |

## Recomendação

Para a entrega fullstack, o sistema está acima do escopo mínimo e cobre os diferenciais principais. Se o objetivo for maximizar aderência literal ao documento backend, o próximo bloco opcional seria adicionar aliases/compatibilidade para:

1. `POST /auth` apontando para a criação de sessão.
2. `GET/POST /clients` e alguns paths `/clients/:id` protegidos por admin, delegando ao módulo admin.
3. `GET /messages` com filtros simples por conversa/status/prioridade.

Esses aliases não são necessários para o fluxo principal já entregue, mas reduzem atrito se alguém comparar automaticamente a lista de endpoints sugeridos.
