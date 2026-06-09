# Estratégia de Testes

Este projeto deve ser implementado por TDD sempre que possível. A regra prática é: escrever ou ajustar o teste que prova o comportamento antes de implementar a feature.

## Objetivos

- Permitir evolução por agentes de IA com segurança.
- Proteger regras de negócio financeiras e de autorização.
- Garantir que frontend, backend e contratos compartilhados não divergem.
- Cobrir o fluxo fullstack principal com Playwright.

## Ferramentas (decididas, não rediscutir)

- `@bcb/api`: Jest (padrão NestJS) + supertest para integração HTTP.
- `@bcb/web`: runner padrão do Angular CLI da versão usada.
- `@bcb/shared`: Vitest.
- E2E: Playwright em `apps/web/e2e`.
- Integração com banco usa PostgreSQL real (o mesmo do docker compose), em database separado `bcb_test` recriado pelas migrations no setup. Nunca usar SQLite/mocks de banco em teste de integração.
- Testes de integração da API rodam com `RECIPIENT_SIMULATOR_ENABLED=false` e delays de fila zerados, exceto os testes do próprio simulador.

## Pirâmide de Testes

### Shared

Tipo: unitário.

Cobrir:

- CPF válido e inválido.
- CNPJ válido e inválido.
- Normalização de documento.
- Inferência CPF/CNPJ por formato.
- Schemas Zod de requests e responses.
- Cálculo de custo por prioridade.

Exemplos:

- `inferDocumentType('12345678909')` retorna `CPF`.
- Documento com letras falha na validação.
- Mensagem urgente custa `50` centavos.

### Backend

Tipos: unitário, integração HTTP e integração com banco.

Unitário:

- Regras financeiras.
- Decisão da fila.
- Cálculo de custo.
- Autorização de dono.

Integração HTTP:

- Auth.
- Onboarding.
- Billing.
- Conversas.
- Mensagens.
- Guards e roles.

Banco:

- Migrations aplicam em PostgreSQL limpo.
- Seeds criam admin e dados de demonstração.
- Transações financeiras são persistidas corretamente.

Casos críticos:

- Criar conta nova com CPF/CNPJ e senha.
- Login existente com senha correta.
- Login existente com senha errada.
- Documento inválido não cria conta.
- Token sem role correta não acessa endpoint admin.
- Cliente A não acessa conversa do cliente B.
- Pré-pago sem saldo não envia.
- Pré-pago com saldo debita no envio.
- Débito concorrente: dois envios simultâneos (`Promise.all`) com saldo para apenas um → exatamente um sucesso e saldo nunca negativo.
- Pós-pago respeita limite mensal.
- Reset preguiçoso: cliente pós-pago com `usageMonth` de mês anterior tem consumo zerado no primeiro envio do mês.
- Mensagem urgente tem prioridade.
- Regra anti-starvation processa normal mesmo com urgentes acumuladas.
- Recuperação no boot: mensagens `queued`/`processing` no banco voltam à fila quando o módulo inicia.
- `POST /messages` com `recipientId` cria conversa nova; com `recipientId` inexistente retorna `RECIPIENT_NOT_FOUND`.
- `POST /conversations/:id/read` zera `unreadCount` apenas da conversa do dono.
- Simulador (suite própria, com simulador ligado e delays zerados): após `delivered`, mensagens do cliente viram `read` e surge resposta com `senderType: 'user'`.

### Frontend

Tipos: unitário/componentes e integração leve de services.

Cobrir:

- Validação do formulário de login.
- Inferência CPF/CNPJ sem seletor.
- Redirecionamento por estado de sessão.
- Guard de onboarding.
- Persistência de idioma e tema.
- Renderização de saldo ou limite conforme plano.
- Composer bloqueia mensagem vazia.
- Chat abre diretamente por URL.
- Eventos WebSocket atualizam status visual.

### E2E

Ferramenta: Playwright.

Determinismo:

- Backend de E2E sobe com `QUEUE_SENT_DELAY_MS`/`QUEUE_DELIVERED_DELAY_MS` baixos (ex.: 100ms) e simulador ligado com delays baixos.
- Cada teste que precisa de conta nova cria a própria conta via `generateCpf()` do shared, em vez de reutilizar fixtures mutáveis.
- Asserções de status usam `expect(...).toHaveText` com retry do Playwright, nunca `waitForTimeout` fixo.

Fluxos mínimos:

1. Registro novo pré-pago:
   - Acessa `/login`.
   - Informa CPF/CNPJ novo e senha.
   - Vai para `/onboarding`.
   - Escolhe pré-pago e valor.
   - Confirma PIX simulado.
   - Vai para `/conversations`.

2. Envio de mensagem:
   - Abre `/conversations/:conversationId`.
   - Envia mensagem normal.
   - Vê status `queued`, depois `processing`, depois `sent`.
   - Saldo é atualizado.

3. Limite financeiro:
   - Usuário pré-pago sem saldo tenta enviar.
   - UI mostra erro de saldo insuficiente.

4. Navegação profunda:
   - Abre URL de conversa em nova aba/contexto.
   - Chat carrega com histórico.

5. Preferências:
   - Alterna idioma.
   - Alterna tema.
   - Recarrega página.
   - Preferências permanecem.

## Comandos Esperados

Scripts raiz sugeridos:

```json
{
  "scripts": {
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "test:api": "pnpm --filter @bcb/api test",
    "test:web": "pnpm --filter @bcb/web test",
    "test:shared": "pnpm --filter @bcb/shared test",
    "test:e2e": "pnpm --filter @bcb/web test:e2e",
    "build": "pnpm -r build"
  }
}
```

## Critérios de Done por Tarefa

Uma tarefa só está pronta quando:

- Contratos compartilhados foram atualizados se o payload mudou.
- Testes foram escritos ou ajustados antes da implementação.
- Testes relevantes passam localmente.
- Erros esperados têm código estável.
- Rotas protegidas têm teste de autorização.
- Estados de loading, erro e sucesso existem quando houver UI.
- README ou docs foram atualizados se o modo de execução mudou.

## Testes por Sprint

### Sprint 0

- Build vazio dos workspaces.
- Docker compose sobe PostgreSQL.

### Sprint 1

- Unit tests de validadores e schemas compartilhados.

### Sprint 2

- Testes de SQL migration, tipos Kysely e seed em banco limpo.

### Sprint 3

- Testes HTTP de auth.
- Testes de guards.

### Sprint 4

- Testes de onboarding e cobrança.
- Testes de transações financeiras.

### Sprint 5

- Testes de conversas, mensagens e fila.
- Testes de prioridade e anti-starvation.
- Testes de débito atômico concorrente, recuperação no boot, `recipientId` e marcação de leitura.

### Sprint 6

- Testes de WebSocket autenticado.
- Testes de isolamento por cliente/conversa.
- Testes do simulador de destinatário (read, typing, resposta) e do desligamento por env.

### Sprint 7

- Testes de rotas, tema e i18n.

### Sprint 8

- Testes de login/onboarding web.

### Sprint 9

- Testes de chat web integrado.

### Sprint 10

- Playwright cobrindo fluxo completo.
- Build e Docker compose em ambiente limpo.

## Dados de Teste

Fixtures previsíveis (mesmos valores do seed da Sprint 2 do IMPLEMENTATION_PLAN.md — não duplicar com valores diferentes):

| Conta | Documento | Senha | Estado |
|-------|-----------|-------|--------|
| Admin | CPF `52998224725` | `Admin@123` | role `admin` |
| Empresa ABC (pré-pago com saldo) | CNPJ `11222333000181` | `Demo@123` | `balanceCents: 2500` |
| Pré-pago sem saldo | CPF `11144477735` | `Demo@123` | `balanceCents: 0` |
| Pós-pago com limite | CNPJ `11444777000161` | `Demo@123` | limite R$100, consumo zero |
| Pós-pago no limite | CPF `12345678909` | `Demo@123` | limite R$10, consumo R$10 |

Mais:

- Conversa com histórico e conversa vazia para a Empresa ABC.
- Documentos extras sempre via `generateCpf()`/`generateCnpj()` do `@bcb/shared` — nunca digitar documentos inventados (o validador rejeita dígitos verificadores errados).

Senhas de fixture devem existir apenas em ambiente local/teste e nunca em produção.
