import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { createDatabase } from '../database/database.client.js';
import { getDatabaseUrl } from '../database/database.config.js';
import { migrateToLatest } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { resetDatabaseForTests } from '../database/testing.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { QueueService } from './queue.service.js';
import type { Database } from '../database/database.types.js';
import type { Kysely } from 'kysely';
import type { RealtimeDomainEvent } from '../realtime/realtime.types.js';
import type { Server } from 'node:http';

const describeDatabase = process.env.BCB_RUN_DB_TESTS === 'true' ? describe : describe.skip;

type SessionResponse = {
  readonly token: string;
};

type ConversationListItem = {
  readonly id: string;
  readonly recipientName: string;
};

describeDatabase('queue HTTP API and processor', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;
  let queueService: QueueService;
  let realtimePublisher: RealtimePublisher;

  beforeEach(async () => {
    process.env.QUEUE_AUTOSTART = 'false';
    process.env.QUEUE_SENT_DELAY_MS = '0';
    process.env.QUEUE_DELIVERED_DELAY_MS = '0';
    process.env.RECIPIENT_SIMULATOR_ENABLED = 'false';
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
  });

  async function initApp(): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
    queueService = app.get(QueueService);
    realtimePublisher = app.get(RealtimePublisher);
  }

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

  async function sendMessage(
    session: SessionResponse,
    conversationId: string,
    priority: 'normal' | 'urgent',
    content: string,
  ): Promise<string> {
    const response = await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ conversationId, content, priority })
      .expect(201);

    return response.body.id as string;
  }

  it('allows admin and rejects client access to queue status', async () => {
    await initApp();
    const admin = await createSession('52998224725', 'CPF', 'Admin@123');
    const client = await createSession('11222333000181', 'CNPJ');

    await request(server)
      .get('/queue/status')
      .set('Authorization', `Bearer ${client.token}`)
      .expect(403);

    await request(server)
      .get('/queue/status')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          normalQueued: 0,
          urgentQueued: 0,
          processing: false,
          processedCount: 0,
          failedCount: 0,
        });
      });
  });

  it('processes urgent messages before normal messages and advances status to delivered', async () => {
    await initApp();
    const events: RealtimeDomainEvent[] = [];
    const subscription = realtimePublisher.events$.subscribe((event) => events.push(event));
    const session = await createSession('11222333000181', 'CNPJ');
    const conversationId = await firstEmpresaConversation(session);
    const normalId = await sendMessage(session, conversationId, 'normal', 'Mensagem normal');
    const urgentId = await sendMessage(session, conversationId, 'urgent', 'Mensagem urgente');

    await queueService.processNextForTests();

    await request(server)
      .get(`/messages/${urgentId}/status`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('delivered');
      });
    await request(server)
      .get(`/messages/${normalId}/status`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('queued');
      });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'message.status',
          payload: expect.objectContaining({ messageId: urgentId, status: 'processing' }),
        }),
        expect.objectContaining({
          name: 'message.status',
          payload: expect.objectContaining({ messageId: urgentId, status: 'sent' }),
        }),
        expect.objectContaining({
          name: 'message.status',
          payload: expect.objectContaining({ messageId: urgentId, status: 'delivered' }),
        }),
      ]),
    );
    subscription.unsubscribe();
  });

  it('applies anti-starvation after three urgent messages', async () => {
    await initApp();
    const session = await createSession('11222333000181', 'CNPJ');
    const conversationId = await firstEmpresaConversation(session);
    const normalId = await sendMessage(session, conversationId, 'normal', 'Mensagem normal');
    const urgentIds = [
      await sendMessage(session, conversationId, 'urgent', 'Urgente 1'),
      await sendMessage(session, conversationId, 'urgent', 'Urgente 2'),
      await sendMessage(session, conversationId, 'urgent', 'Urgente 3'),
      await sendMessage(session, conversationId, 'urgent', 'Urgente 4'),
    ];

    await queueService.processNextForTests();
    await queueService.processNextForTests();
    await queueService.processNextForTests();
    await queueService.processNextForTests();

    await request(server)
      .get(`/messages/${normalId}/status`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('delivered');
      });
    await request(server)
      .get(`/messages/${urgentIds[3]}/status`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('queued');
      });
  });

  it('recovers queued and processing messages on bootstrap', async () => {
    const client = await db
      .selectFrom('accounts')
      .innerJoin('client_profiles', 'client_profiles.account_id', 'accounts.id')
      .select(['client_profiles.id as clientId'])
      .where('accounts.document_id', '=', '11222333000181')
      .executeTakeFirstOrThrow();
    const recipient = await db
      .selectFrom('recipients')
      .select(['id'])
      .where('name', '=', 'Ana Costa')
      .executeTakeFirstOrThrow();
    const conversation = await db
      .insertInto('conversations')
      .values({
        client_id: client.clientId,
        recipient_id: recipient.id,
        last_message_content: 'Pendente',
        last_message_at: new Date('2026-06-10T12:00:00.000Z'),
        unread_count: 0,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await db
      .insertInto('messages')
      .values([
        {
          conversation_id: conversation.id,
          sender_type: 'client',
          content: 'Mensagem queued recuperada',
          priority: 'normal',
          status: 'queued',
          cost_cents: 25,
        },
        {
          conversation_id: conversation.id,
          sender_type: 'client',
          content: 'Mensagem processing recuperada',
          priority: 'urgent',
          status: 'processing',
          cost_cents: 50,
        },
      ])
      .execute();

    await initApp();

    await request(server)
      .get('/queue/status')
      .set(
        'Authorization',
        `Bearer ${(await createSession('52998224725', 'CPF', 'Admin@123')).token}`,
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          normalQueued: 1,
          urgentQueued: 1,
        });
      });
  });
});
