import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { createDatabase } from '../database/database.client.js';
import { getDatabaseUrl } from '../database/database.config.js';
import { migrateToLatest } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { resetDatabaseForTests } from '../database/testing.js';
import { QueueService } from '../queue/queue.service.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import type { RealtimeDomainEvent } from '../realtime/realtime.types.js';
import type { Database } from '../database/database.types.js';
import type { Kysely } from 'kysely';
import type { Server } from 'node:http';

const describeDatabase = process.env.BCB_RUN_DB_TESTS === 'true' ? describe : describe.skip;

type SessionResponse = {
  readonly token: string;
};

type ConversationListItem = {
  readonly id: string;
  readonly recipientName: string;
};

describeDatabase('recipient simulator', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;
  let queueService: QueueService;
  let realtimePublisher: RealtimePublisher;

  beforeEach(async () => {
    process.env.QUEUE_AUTOSTART = 'false';
    process.env.QUEUE_SENT_DELAY_MS = '0';
    process.env.QUEUE_DELIVERED_DELAY_MS = '0';
    process.env.RECIPIENT_SIMULATOR_READ_DELAY_MS = '0';
    process.env.RECIPIENT_SIMULATOR_TYPING_MS = '0';
    db = createDatabase(getDatabaseUrl());
    await resetDatabaseForTests(db);
    await migrateToLatest(db);
    await seedDatabase(db);
  });

  afterEach(async () => {
    await app?.close();
    await db?.destroy();
    delete process.env.QUEUE_AUTOSTART;
    delete process.env.QUEUE_SENT_DELAY_MS;
    delete process.env.QUEUE_DELIVERED_DELAY_MS;
    delete process.env.RECIPIENT_SIMULATOR_ENABLED;
    delete process.env.RECIPIENT_SIMULATOR_READ_DELAY_MS;
    delete process.env.RECIPIENT_SIMULATOR_TYPING_MS;
  });

  async function initApp(simulatorEnabled: boolean): Promise<void> {
    process.env.RECIPIENT_SIMULATOR_ENABLED = simulatorEnabled ? 'true' : 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
    queueService = app.get(QueueService);
    realtimePublisher = app.get(RealtimePublisher);
  }

  async function createSession(): Promise<SessionResponse> {
    const response = await request(server)
      .post('/auth/session')
      .send({ documentId: '11222333000181', documentType: 'CNPJ', password: 'Demo@123' })
      .expect(201);

    return response.body as SessionResponse;
  }

  async function carlosConversationId(session: SessionResponse): Promise<string> {
    const conversations = await request(server)
      .get('/conversations')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);
    const conversation = (conversations.body as ConversationListItem[]).find(
      (item) => item.recipientName === 'Carlos Pereira',
    );

    if (!conversation) {
      throw new Error('Seeded Carlos Pereira conversation not found');
    }

    return conversation.id;
  }

  async function sendMessage(session: SessionResponse, conversationId: string): Promise<string> {
    const response = await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        conversationId,
        content: 'Pode me retornar quando possivel?',
        priority: 'normal',
      })
      .expect(201);

    return response.body.id as string;
  }

  async function waitForCondition(assertion: () => Promise<void> | void): Promise<void> {
    const deadline = Date.now() + 1000;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        await assertion();
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Timed out waiting for condition');
  }

  it('marks delivered client messages as read and creates a recipient response', async () => {
    await initApp(true);
    const events: RealtimeDomainEvent[] = [];
    const subscription = realtimePublisher.events$.subscribe((event) => events.push(event));
    const session = await createSession();
    const conversationId = await carlosConversationId(session);
    const messageId = await sendMessage(session, conversationId);

    await queueService.processNextForTests();

    await waitForCondition(async () => {
      const clientMessage = await db
        .selectFrom('messages')
        .select(['status'])
        .where('id', '=', messageId)
        .executeTakeFirstOrThrow();
      const responseMessage = await db
        .selectFrom('messages')
        .select(['sender_type as senderType', 'cost_cents as cost', 'status'])
        .where('conversation_id', '=', conversationId)
        .where('sender_type', '=', 'user')
        .executeTakeFirst();
      const conversation = await db
        .selectFrom('conversations')
        .select(['unread_count as unreadCount'])
        .where('id', '=', conversationId)
        .executeTakeFirstOrThrow();

      expect(clientMessage.status).toBe('read');
      expect(responseMessage).toMatchObject({
        senderType: 'user',
        cost: 0,
        status: 'delivered',
      });
      expect(conversation.unreadCount).toBe(1);
    });

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'typing.started' }),
        expect.objectContaining({ name: 'typing.stopped' }),
        expect.objectContaining({
          name: 'message.status',
          payload: expect.objectContaining({ messageId, status: 'read' }),
        }),
        expect.objectContaining({
          name: 'message.created',
          payload: expect.objectContaining({
            message: expect.objectContaining({ senderType: 'user', cost: 0 }),
          }),
        }),
        expect.objectContaining({
          name: 'conversation.updated',
          payload: expect.objectContaining({ conversationId, unreadCount: 1 }),
        }),
      ]),
    );
    subscription.unsubscribe();
  });

  it('does nothing when the simulator is disabled', async () => {
    await initApp(false);
    const events: RealtimeDomainEvent[] = [];
    const subscription = realtimePublisher.events$.subscribe((event) => events.push(event));
    const session = await createSession();
    const conversationId = await carlosConversationId(session);
    const messageId = await sendMessage(session, conversationId);

    await queueService.processNextForTests();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const clientMessage = await db
      .selectFrom('messages')
      .select(['status'])
      .where('id', '=', messageId)
      .executeTakeFirstOrThrow();
    const responseMessage = await db
      .selectFrom('messages')
      .select(['id'])
      .where('conversation_id', '=', conversationId)
      .where('sender_type', '=', 'user')
      .executeTakeFirst();

    expect(clientMessage.status).toBe('delivered');
    expect(responseMessage).toBeUndefined();
    expect(events).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'typing.started' })]),
    );
    subscription.unsubscribe();
  });
});
