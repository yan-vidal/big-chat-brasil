# Plano de Arquitetura

Este documento detalha a arquitetura pretendida para implementação do BCB.

## Princípios

- Seguir padrões do NestJS e Angular, evitando uma arquitetura artificial demais para o tamanho do desafio.
- Usar DDD leve: entidades, regras e casos de uso claros, sem excesso de camadas.
- Aplicar SOLID de forma pragmática.
- Aceitar injeção de dependência do NestJS, mantendo o domínio testável e legível.
- Compartilhar contratos com Zod para evitar divergência entre frontend e backend.
- Persistir estado crítico no PostgreSQL, mesmo quando o mecanismo inicial de fila for em memória.

## Backend NestJS

Módulos sugeridos:

```txt
src
├── app.module.ts
├── auth
├── billing
├── clients
├── conversations
├── messages
├── queue
├── realtime
├── simulator
├── database
└── shared
```

Responsabilidades:

- `auth`: login/criação, bcrypt (`bcryptjs`), JWT, guards e roles.
- `billing`: onboarding, saldo, limite, PIX simulado e transações.
- `clients`: perfil do cliente autenticado e endpoints admin futuros.
- `conversations`: listagem e autorização de conversas, catálogo de recipients (`GET /recipients`) e marcação de leitura (`POST /conversations/:id/read`).
- `messages`: envio, histórico, status e regras de custo.
- `queue`: fila em memória, prioridade, processador, recuperação de pendências no boot e contadores para `GET /queue/status`.
- `realtime`: gateway WebSocket e salas.
- `simulator`: simulador de destinatário (read, typing, respostas automáticas).
- `database`: conexão Kysely, tipos do banco, migrations, seeds e helpers de transação.
- `shared`: pipes Zod, filtros de erro e utilitários internos da API.

## DDD Leve

Camadas práticas:

- Controller: traduz HTTP para comando/query.
- Application service: orquestra caso de uso.
- Domain service ou função pura: regra de negócio testável.
- Repository/Kysely service: persistência explícita com queries tipadas.
- Gateway/event emitter: comunicação em tempo real.

Exemplos de regras que devem ficar fora do controller:

- Inferir CPF/CNPJ.
- Calcular custo por prioridade.
- Validar saldo/limite.
- Decidir próxima mensagem da fila.
- Determinar se uma conta precisa de onboarding.

## Fronteiras de Segurança

Endpoints de cliente:

- Sempre derivam `clientId` do JWT.
- Nunca aceitam `clientId` como autoridade no body.
- Conferem dono da conversa/mensagem antes de retornar dado.
- Endpoints de conversas/mensagens/billing exigem onboarding completo: se `onboardingCompleted = false`, responder 403 com código `ONBOARDING_REQUIRED`.

Endpoints admin:

- Devem exigir role `admin`.
- Podem receber `clientId` por path.
- Não entram no MVP, exceto se forem necessários para seed/demo.

## WebSocket

O WebSocket deve complementar a REST API, não substituí-la no MVP.

REST:

- Login.
- Onboarding.
- Listagem inicial.
- Envio de mensagem.

WebSocket:

- Status de mensagem.
- Atualização de conversa.
- Indicador de digitação.

Eventos sugeridos:

```ts
type ChatSocketEvents =
  | 'message.created'
  | 'message.status'
  | 'conversation.updated'
  | 'typing.started'
  | 'typing.stopped';
```

Regras:

- Handshake exige JWT, transportado em `socket.handshake.auth.token` (no cliente: `io(url + '/chat', { auth: { token } })`).
- Cliente entra apenas nas salas autorizadas.
- Eventos devem incluir IDs suficientes para o frontend atualizar o cache local.

Payloads mínimos por evento:

```ts
// message.created  → { message: MessageResponse }
// message.status   → { messageId: string; conversationId: string; status: MessageStatus; occurredAt: string }
// conversation.updated → { conversationId: string; lastMessageContent: string; lastMessageAt: string; unreadCount: number }
// typing.started / typing.stopped → { conversationId: string; senderType: 'user' }
```

## Frontend Angular

Estrutura sugerida:

```txt
src
├── app
│   ├── core
│   ├── shared
│   ├── features
│   │   ├── auth
│   │   ├── onboarding
│   │   ├── billing
│   │   └── chat
│   └── app.routes.ts
├── assets
│   └── i18n
└── styles.css
```

Responsabilidades:

- `core`: API client, auth store, interceptors, route guards, theme e i18n.
- `shared`: componentes reutilizáveis, pipes e helpers visuais.
- `features/auth`: login e sessão.
- `features/onboarding`: escolha de plano e pagamento simulado.
- `features/billing`: saldo, limite e histórico.
- `features/chat`: lista de conversas, tela de chat, composer e status.

Padrões:

- Angular standalone components.
- Angular Router como fonte de estado de navegação.
- Signals para estado local e stores simples por feature.
- Services para comunicação HTTP/WebSocket.
- Tailwind com dark mode por classe no elemento raiz.

## Contratos Compartilhados

O pacote `packages/shared` deve exportar:

- Enums.
- Zod schemas de request/response.
- Tipos inferidos dos schemas.
- Validadores e normalizadores de CPF/CNPJ.
- Utilitários de custo de mensagem.

Exemplo:

```ts
export const SendMessageRequestSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    recipientId: z.string().uuid().optional(),
    content: z.string().min(1).max(2000),
    priority: z.enum(['normal', 'urgent']),
  })
  .refine((data) => data.conversationId || data.recipientId, {
    message: 'conversationId ou recipientId é obrigatório',
  });

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
```

### Validação na API

A API valida bodies com um `ZodValidationPipe` próprio (sem lib externa), em `apps/api/src/shared/zod-validation.pipe.ts`:

```ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Requisição inválida',
        details: result.error.issues,
      });
    }
    return result.data;
  }
}
```

Uso: `@Body(new ZodValidationPipe(SendMessageRequestSchema)) body: SendMessageRequest`.

## Banco de Dados

Modelo conceitual:

```txt
Account 1--1 ClientProfile
ClientProfile 1--N Conversation
Recipient 1--N Conversation
Conversation 1--N Message
ClientProfile 1--N BillingTransaction
ClientProfile 1--N PaymentIntent
```

Campos principais:

- `Account`: `id`, `documentId`, `documentType`, `passwordHash`, `role`, `active`.
- `ClientProfile`: `id`, `accountId`, `name`, `planType`, `onboardingCompleted`, `balanceCents`, `monthlyLimitCents`, `monthlyUsedCents`, `usageMonth` (texto `YYYY-MM`, usado no reset preguiçoso do pós-pago).
- `Recipient`: `id`, `name`.
- `Conversation`: `id`, `clientId`, `recipientId`, `lastMessageContent`, `lastMessageAt`, `unreadCount` (mensagens do destinatário ainda não lidas pelo cliente; zerado por `POST /conversations/:id/read`).
- `Message`: `id`, `conversationId`, `senderType`, `content`, `priority`, `status`, `costCents`, `createdAt`, `processedAt`.
- `BillingTransaction`: `id`, `clientId`, `type`, `amountCents`, `messageId`, `paymentIntentId`, `createdAt`.
- `PaymentIntent`: `id`, `clientId`, `method`, `amountCents`, `status`, `confirmedAt`.

## Kysely

Organização sugerida:

```txt
apps/api
├── migrations
│   └── 001_initial_schema.ts
└── src
    └── database
        ├── database.module.ts
        ├── database.service.ts
        ├── database.types.ts
        ├── migrate.ts
        └── seed.ts
```

Diretrizes:

- `database.service.ts` expõe a instância Kysely configurada com `PostgresDialect`.
- Repositórios recebem `DatabaseService` por DI do NestJS.
- `database.types.ts` define a interface `Database` usada por Kysely.
- Migrations ficam explícitas e versionadas.
- Seeds usam as mesmas queries Kysely usadas pela aplicação sempre que fizer sentido.
- Transações financeiras devem usar `db.transaction().execute(...)`.
- Queries de autorização devem conferir dono no próprio `where` ou `join`, evitando buscar recurso e validar depois quando uma query única resolver.

Exemplo de estilo esperado:

```ts
const conversation = await db
  .selectFrom('conversations')
  .innerJoin('client_profiles', 'client_profiles.id', 'conversations.client_id')
  .select([
    'conversations.id',
    'conversations.recipient_id as recipientId',
    'conversations.last_message_content as lastMessageContent',
  ])
  .where('conversations.id', '=', conversationId)
  .where('client_profiles.id', '=', authenticatedClientId)
  .executeTakeFirst();
```

### Validação financeira atômica

O débito pré-pago é um `UPDATE` condicional: a própria query falha em concorrência, sem janela entre ler e gravar. Dentro da transação que também cria `BillingTransaction` e `Message`:

```ts
const debited = await trx
  .updateTable('client_profiles')
  .set((eb) => ({ balance_cents: eb('balance_cents', '-', costCents) }))
  .where('id', '=', clientId)
  .where('balance_cents', '>=', costCents)
  .returning('balance_cents')
  .executeTakeFirst();

if (!debited) {
  throw new InsufficientBalanceException(); // vira 422 INSUFFICIENT_BALANCE
}
```

Pós-pago segue o mesmo padrão, precedido do reset preguiçoso do mês (usando o helper `sql` do Kysely para comparar colunas):

```ts
import { sql } from 'kysely';

const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

await trx
  .updateTable('client_profiles')
  .set({ monthly_used_cents: 0, usage_month: currentMonth })
  .where('id', '=', clientId)
  .where('usage_month', '<>', currentMonth)
  .execute();

const consumed = await trx
  .updateTable('client_profiles')
  .set((eb) => ({ monthly_used_cents: eb('monthly_used_cents', '+', costCents) }))
  .where('id', '=', clientId)
  .where(sql<boolean>`monthly_used_cents + ${costCents} <= monthly_limit_cents`)
  .returning(['monthly_used_cents', 'monthly_limit_cents'])
  .executeTakeFirst();

if (!consumed) {
  throw new InsufficientLimitException(); // vira 422 INSUFFICIENT_LIMIT
}
```

## Priorização

Estratégia inicial:

- Duas filas em memória: `urgent` e `normal`.
- Mensagens urgentes saem antes das normais.
- Para evitar starvation, aplicar regra simples: a cada 3 urgentes processadas, processar 1 normal se existir.

Essa regra é simples, demonstrável e fácil de testar.

Ciclo de processamento de cada job:

1. Marca a mensagem como `processing` e persiste.
2. Após `QUEUE_SENT_DELAY_MS`, marca `sent`.
3. Após `QUEUE_DELIVERED_DELAY_MS`, marca `delivered`.
4. Cada transição persiste no banco e emite `message.status` no WebSocket.
5. `read` não é responsabilidade do processador (vem do simulador de destinatário).
6. Falha simulada (ex.: exceção no processamento) marca `failed` e dispara estorno no pré-pago.

Recuperação no boot: ao iniciar o módulo `queue`, buscar mensagens `queued`/`processing` no banco e re-enfileirar por `createdAt`, urgentes primeiro. A fila também mantém contadores em memória (enfileiradas, processadas, falhas) para `GET /queue/status`.

## Simulador de Destinatário

Os destinatários são fictícios; sem simulação, `typing.*`, `read`, `unreadCount` e mensagens recebidas nunca acontecem. O módulo `simulator` ouve as transições para `delivered` e reage:

1. Aguarda `RECIPIENT_SIMULATOR_READ_DELAY_MS`.
2. Marca as mensagens `delivered` do cliente naquela conversa como `read` e emite `message.status` para cada uma.
3. Emite `typing.started`, aguarda `RECIPIENT_SIMULATOR_TYPING_MS`, cria a resposta (`Message` com `senderType: 'user'`, prioridade `normal`, custo zero — mensagem recebida não é cobrada) com texto escolhido de uma lista fixa de respostas plausíveis.
4. Emite `typing.stopped` e `message.created`, incrementa `unreadCount` e emite `conversation.updated`.

Regras:

- `RECIPIENT_SIMULATOR_ENABLED=false` desliga tudo (obrigatório nos testes de integração que afirmam estados finais).
- Agendamentos em memória; não sobrevivem a restart (aceitável, documentado).
- O simulador usa os mesmos serviços de domínio de `messages`/`conversations` — nada de SQL próprio duplicado.

## Tratamento de Erros

Padronizar resposta de erro:

```ts
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

Códigos iniciais, com status HTTP fixo (o frontend traduz `code` para mensagem i18n; nunca depender do texto de `message`):

| Código | HTTP |
|--------|------|
| `VALIDATION_ERROR` | 400 |
| `INVALID_DOCUMENT` | 400 |
| `INVALID_CREDENTIALS` | 401 |
| `ACCOUNT_INACTIVE` | 403 |
| `ONBOARDING_REQUIRED` | 403 |
| `FORBIDDEN_RESOURCE` | 403 |
| `CONVERSATION_NOT_FOUND` | 404 |
| `MESSAGE_NOT_FOUND` | 404 |
| `RECIPIENT_NOT_FOUND` | 404 |
| `INSUFFICIENT_BALANCE` | 422 |
| `INSUFFICIENT_LIMIT` | 422 |

## Observabilidade Inicial

O MVP deve incluir logs básicos para:

- Criação/login de conta sem expor senha.
- Confirmação de pagamento simulado.
- Enfileiramento e processamento de mensagens.
- Falhas de autorização.
- Eventos WebSocket relevantes.

Não é necessário incluir stack de observabilidade externa no MVP.
