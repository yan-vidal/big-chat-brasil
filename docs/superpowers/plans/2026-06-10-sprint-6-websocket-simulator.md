# Sprint 6 - WebSocket e simulador de destinatario

Status: implementada e verificada em 2026-06-10.

## Objetivo

Adicionar tempo real no backend sem substituir a API REST: clientes autenticados conectam no namespace `/chat`, entram em salas escopadas ao proprio cliente/conversa e recebem eventos de mensagem, status, conversa e digitacao. O simulador de destinatario reage a mensagens entregues e cria respostas deterministicas com delays configuraveis.

## Escopo

- Criar `RealtimeModule` com gateway Socket.IO em `/chat`.
- Autenticar handshake via `socket.handshake.auth.token`.
- Entrar automaticamente na sala do cliente (`client:{clientId}`) e permitir entrada explicita em sala de conversa autorizada (`conversation:{conversationId}`).
- Publicar eventos:
  - `message.created`
  - `message.status`
  - `conversation.updated`
  - `typing.started`
  - `typing.stopped`
- Integrar fila existente para emitir `message.status` em cada transicao.
- Integrar envio REST para emitir `message.created` e `conversation.updated`.
- Criar `SimulatorModule` que ouve mensagens `delivered`, marca mensagens do cliente como `read`, emite typing, cria resposta `senderType='user'`, incrementa `unreadCount` e publica eventos.
- Adicionar envs:
  - `RECIPIENT_SIMULATOR_ENABLED`
  - `RECIPIENT_SIMULATOR_READ_DELAY_MS`
  - `RECIPIENT_SIMULATOR_TYPING_MS`
- Manter testes deterministas com delays zeraveis e `RECIPIENT_SIMULATOR_ENABLED=false` nos testes que nao dependem do simulador.

## Fora do escopo

- Cliente Angular consumindo Socket.IO; entra na Sprint 8/9.
- Persistencia dos agendamentos do simulador apos restart.
- Indicador de leitura por outro cliente real.

## TDD

1. Contratos shared
   - [x] Adicionar schemas de payload de eventos em `packages/shared/src/schemas/realtime.ts`.
   - [x] Teste falhou primeiro por `Cannot find module './realtime.js'`.

2. WebSocket autenticado
   - [x] Criar `apps/api/src/realtime/realtime.spec.ts`.
   - [x] Testar conexao sem token rejeitada.
   - [x] Testar conexao com token valida entra na sala do proprio cliente e recebe eventos publicados.
   - [x] Testar isolamento: cliente A nao recebe evento publicado para cliente B.
   - [x] Testar `conversation.join` autorizado e rejeicao quando conversa pertence a outro cliente.

3. Eventos da fila
   - [x] Ajustar `apps/api/src/queue/queue.spec.ts` para verificar que `processing`, `sent` e `delivered` publicam `message.status`.
   - [x] Implementar publicador injetavel sem acoplar queue ao gateway diretamente.

4. Simulador
   - [x] Criar `apps/api/src/simulator/simulator.spec.ts`.
   - [x] Com delays zero, ao receber `delivered`, marcar mensagens do cliente como `read`.
   - [x] Emitir `typing.started`, `typing.stopped`, `message.created` e `conversation.updated`.
   - [x] Criar mensagem de resposta com custo zero e `senderType='user'`.
   - [x] Com `RECIPIENT_SIMULATOR_ENABLED=false`, nao executar nenhuma acao.

## Implementacao

- [x] `packages/shared/src/schemas/realtime.ts`: schemas e tipos dos eventos.
- [x] `packages/shared/src/index.ts`: exportar contratos realtime.
- [x] `apps/api/src/realtime/`:
  - `chat.gateway.ts`
  - `realtime.module.ts`
  - `realtime.publisher.ts`
  - `realtime.repository.ts`
  - `realtime.types.ts`
  - `realtime.spec.ts`
- [x] `apps/api/src/simulator/`:
  - `simulator.config.ts`
  - `simulator.module.ts`
  - `simulator.repository.ts`
  - `simulator.service.ts`
  - `simulator.spec.ts`
- [x] Alterar `MessagesService` para publicar eventos apos mensagem criada.
- [x] Alterar `QueueService` para publicar status apos cada transicao.
- [x] Alterar `AppModule` para importar `RealtimeModule` e `SimulatorModule`.

## Verificacao

- [x] `pnpm --filter @bcb/shared test -- contracts.spec.ts`
- [x] `pnpm --filter @bcb/api test:db`
- [x] `pnpm --filter @bcb/api build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`
- [x] `pnpm exec prettier --check ...` nos arquivos tocados

## Commit sugerido

`feat(api): add authenticated chat websocket`
