# Sprint 9 Integrated Chat Web Implementation Plan

## Goal

Build the main web chat experience on top of the Sprint 5/6 backend contracts: list conversations, open a direct conversation URL, read history, mark conversations as read, send normal/urgent messages, show billing balance/limit, and react to realtime events.

## Scope

- Conversation list with search, unread badges, latest preview and responsive layout.
- Conversation detail with message bubbles, priority/status indicators, typing state and composer.
- REST integration for:
  - `GET /billing/me`
  - `GET /conversations`
  - `GET /conversations/:id`
  - `GET /conversations/:id/messages`
  - `POST /conversations/:id/read`
  - `POST /messages`
  - `GET /recipients`
- Socket.IO client integration for:
  - `message.created`
  - `message.status`
  - `conversation.updated`
  - `typing.started`
  - `typing.stopped`
- "+ Nova Conversa" with recipient selection and first message via `recipientId`.

## Non-goals

- Infinite pagination for messages.
- Admin queue screens.
- Full backend boot inside web Playwright. Playwright will mock REST and drive realtime through a narrow e2e hook, while the real Socket.IO client remains the production integration path.

## Architecture

- Add `ChatApiService` beside the chat feature to wrap REST calls and parse shared schemas.
- Add `ChatRealtimeService` to own the `/chat` Socket.IO connection, event subscriptions and `conversation.join`.
- Keep page state local to standalone components for this sprint. A global chat store can be introduced later if the same state becomes shared across billing/dashboard pages.
- Use `ApiClientService` for base URL, auth headers and JSON requests.
- Add a browser-only e2e realtime injection hook gated by `localStorage['bcb.e2e.realtime'] === 'true'`. This keeps Playwright deterministic without requiring a Socket.IO test server in the static web server.

## TDD Plan

1. Add `apps/web/e2e/chat.spec.ts` with mocked REST.
   - Direct `/conversations/:id` loads detail, fetches history and posts `/read`.
   - Sending an urgent message posts `POST /messages`, appends an optimistic/current message and shows queued status/cost.
   - Injected realtime status events update the sent message through `delivered`/`read`.
   - Injected typing and `message.created` events show "escrevendo..." and then append the recipient reply.
   - List route shows unread badges, billing summary, search and recipient-based new conversation.
2. Run Playwright and confirm failures against the current placeholder pages.
3. Implement services/components just enough to pass.
4. Run focused and full verification.

## Verification

- [x] `pnpm --filter @bcb/shared build && pnpm --filter @bcb/web build`
- [x] `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] Desktop and mobile screenshots for `/conversations` and `/conversations/:id`, visually inspected for layout overlap, readable controls and nonblank content.

## Completion Notes

- Added `ChatApiService` with schema parsing for billing, conversations, messages, recipients and sending.
- Added `ChatRealtimeService` for Socket.IO `/chat`, `conversation.join`, realtime event parsing and deterministic Playwright event injection gated by `localStorage['bcb.e2e.realtime']`.
- Replaced placeholder chat pages with conversation list/search/badges/new conversation and conversation detail/history/read/send/status/typing UI.
- Expanded Playwright to cover chat route loading, urgent send payloads, status updates, typing/reply events, list realtime badge updates, new conversation and i18n controls.
- Kept web unit tests as the existing placeholder; Sprint 9 frontend behavioral coverage is Playwright e2e/visual.

## Commit

Suggested commit: `feat(web): add integrated chat experience`
