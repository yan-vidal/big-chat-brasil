import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { createDatabase } from '../database/database.client.js';
import { getDatabaseUrl } from '../database/database.config.js';
import { migrateToLatest } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { resetDatabaseForTests } from '../database/testing.js';
import { RealtimePublisher } from './realtime.publisher.js';
import type { Database } from '../database/database.types.js';
import type { Kysely } from 'kysely';
import type { RealtimeDomainEvent } from './realtime.types.js';
import type { Server } from 'node:http';

const describeDatabase = process.env.BCB_RUN_DB_TESTS === 'true' ? describe : describe.skip;

type SessionResponse = {
  readonly token: string;
  readonly client: {
    readonly id: string;
  };
};

type ConversationListItem = {
  readonly id: string;
  readonly recipientName: string;
};

describeDatabase('chat websocket gateway', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;
  let baseUrl: string;
  let realtimePublisher: RealtimePublisher;
  const sockets: ClientSocket[] = [];

  beforeEach(async () => {
    process.env.QUEUE_AUTOSTART = 'false';
    process.env.QUEUE_SENT_DELAY_MS = '0';
    process.env.QUEUE_DELIVERED_DELAY_MS = '0';
    process.env.RECIPIENT_SIMULATOR_ENABLED = 'false';
    process.env.INTERNAL_API_TOKEN = 'test-internal-token';
    db = createDatabase(getDatabaseUrl());
    await resetDatabaseForTests(db);
    await migrateToLatest(db);
    await seedDatabase(db);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    server = app.getHttpServer() as Server;
    baseUrl = await app.getUrl();
    realtimePublisher = app.get(RealtimePublisher);
  });

  afterEach(async () => {
    for (const socket of sockets) {
      socket.disconnect();
    }
    sockets.length = 0;
    await app?.close();
    await db?.destroy();
    delete process.env.QUEUE_AUTOSTART;
    delete process.env.QUEUE_SENT_DELAY_MS;
    delete process.env.QUEUE_DELIVERED_DELAY_MS;
    delete process.env.RECIPIENT_SIMULATOR_ENABLED;
    delete process.env.INTERNAL_API_TOKEN;
  });

  async function createSession(
    documentId: string,
    documentType: 'CPF' | 'CNPJ',
    password = 'Demo@123',
  ): Promise<SessionResponse> {
    const response = await request(server)
      .post('/auth/session')
      .send({ documentId, documentType, password })
      .expect(201);

    return response.body as SessionResponse;
  }

  async function firstEmpresaConversation(session: SessionResponse): Promise<string> {
    const conversations = await request(server)
      .get('/conversations')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);
    const conversation = (conversations.body as ConversationListItem[]).find(
      (item) => item.recipientName === 'Maria Oliveira',
    );

    if (!conversation) {
      throw new Error('Seeded Maria Oliveira conversation not found');
    }

    return conversation.id;
  }

  async function connectSocket(token: string): Promise<ClientSocket> {
    const socket = io(`${baseUrl}/chat`, {
      auth: { token },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    sockets.push(socket);

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
      setTimeout(() => reject(new Error('Timed out waiting for websocket connect')), 1000);
    });

    return socket;
  }

  async function expectConnectError(auth?: { readonly token?: string }): Promise<void> {
    const socket = io(`${baseUrl}/chat`, {
      auth,
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    sockets.push(socket);

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => reject(new Error('Socket connected without credentials')));
      socket.once('connect_error', () => resolve());
      setTimeout(() => reject(new Error('Timed out waiting for websocket rejection')), 1000);
    });
  }

  async function waitForSocketEvent<T>(socket: ClientSocket, eventName: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      socket.once(eventName, (payload: T) => resolve(payload));
      setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), 1000);
    });
  }

  async function expectNoSocketEvent(socket: ClientSocket, eventName: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(eventName, handler);
        resolve();
      }, 100);
      const handler = (): void => {
        clearTimeout(timer);
        reject(new Error(`Unexpected ${eventName}`));
      };
      socket.once(eventName, handler);
    });
  }

  it('rejects connections without a valid JWT', async () => {
    await expectConnectError();
    await expectConnectError({ token: 'invalid-token' });
  });

  it('emits client-scoped events only to the owning client', async () => {
    const empresa = await createSession('11222333000181', 'CNPJ');
    const postpaid = await createSession('11444777000161', 'CNPJ');
    const empresaSocket = await connectSocket(empresa.token);
    const postpaidSocket = await connectSocket(postpaid.token);
    const conversationId = await firstEmpresaConversation(empresa);

    const eventPromise = waitForSocketEvent(empresaSocket, 'message.status');
    realtimePublisher.publishMessageStatus(empresa.client.id, {
      messageId: '550e8400-e29b-41d4-a716-446655440010',
      conversationId,
      status: 'sent',
      occurredAt: '2026-06-10T12:00:00.000Z',
    });

    await expect(eventPromise).resolves.toMatchObject({
      conversationId,
      status: 'sent',
    });
    await expectNoSocketEvent(postpaidSocket, 'message.status');
  });

  it('allows joining only authorized conversation rooms', async () => {
    const empresa = await createSession('11222333000181', 'CNPJ');
    const postpaid = await createSession('11444777000161', 'CNPJ');
    const empresaSocket = await connectSocket(empresa.token);
    const postpaidSocket = await connectSocket(postpaid.token);
    const conversationId = await firstEmpresaConversation(empresa);

    await expect(
      empresaSocket.emitWithAck('conversation.join', { conversationId }),
    ).resolves.toEqual({
      ok: true,
      conversationId,
    });
    await expect(
      postpaidSocket.emitWithAck('conversation.join', { conversationId }),
    ).resolves.toEqual({
      ok: false,
      code: 'FORBIDDEN_RESOURCE',
    });

    const typingPromise = waitForSocketEvent(empresaSocket, 'typing.started');
    realtimePublisher.publishTypingStarted(empresa.client.id, {
      conversationId,
      senderType: 'user',
    });

    await expect(typingPromise).resolves.toMatchObject({ conversationId, senderType: 'user' });
    await expectNoSocketEvent(postpaidSocket, 'typing.started');
  });

  it('protects the internal worker realtime bridge and publishes status events', async () => {
    const empresa = await createSession('11222333000181', 'CNPJ');
    const conversationId = await firstEmpresaConversation(empresa);
    const events: RealtimeDomainEvent[] = [];
    const subscription = realtimePublisher.events$.subscribe((event) => events.push(event));
    const payload = {
      clientId: empresa.client.id,
      messageId: '550e8400-e29b-41d4-a716-446655440020',
      conversationId,
      status: 'delivered',
      occurredAt: '2026-06-10T12:00:00.000Z',
    };

    await request(server).post('/internal/realtime/message-status').send(payload).expect(401);
    await request(server)
      .post('/internal/realtime/message-status')
      .set('x-internal-token', 'wrong-token')
      .send(payload)
      .expect(401);

    await request(server)
      .post('/internal/realtime/message-status')
      .set('x-internal-token', 'test-internal-token')
      .send(payload)
      .expect(202);

    expect(events).toContainEqual({
      name: 'message.status',
      clientId: empresa.client.id,
      payload: {
        messageId: payload.messageId,
        conversationId,
        status: 'delivered',
        occurredAt: payload.occurredAt,
      },
    });
    subscription.unsubscribe();
  });
});
