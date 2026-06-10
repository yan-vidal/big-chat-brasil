import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { createDatabase } from '../database/database.client.js';
import { getDatabaseUrl } from '../database/database.config.js';
import { migrateToLatest } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { resetDatabaseForTests } from '../database/testing.js';
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

type RecipientListItem = {
  readonly id: string;
  readonly name: string;
};

describeDatabase('messages HTTP API', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;

  beforeEach(async () => {
    process.env.QUEUE_AUTOSTART = 'false';
    process.env.QUEUE_SENT_DELAY_MS = '0';
    process.env.QUEUE_DELIVERED_DELAY_MS = '0';
    db = createDatabase(getDatabaseUrl());
    await resetDatabaseForTests(db);
    await migrateToLatest(db);
    await seedDatabase(db);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app?.close();
    await db?.destroy();
    delete process.env.QUEUE_AUTOSTART;
    delete process.env.QUEUE_SENT_DELAY_MS;
    delete process.env.QUEUE_DELIVERED_DELAY_MS;
  });

  async function createSession(
    documentId: string,
    documentType: 'CPF' | 'CNPJ',
  ): Promise<SessionResponse> {
    const response = await request(server)
      .post('/auth/session')
      .send({ documentId, documentType, password: 'Demo@123' })
      .expect(201);

    return response.body as SessionResponse;
  }

  async function firstEmpresaConversation(): Promise<{
    readonly session: SessionResponse;
    readonly conversationId: string;
  }> {
    const session = await createSession('11222333000181', 'CNPJ');
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

    return { session, conversationId: conversation.id };
  }

  it('sends a message to an existing conversation and debits prepaid balance', async () => {
    const { session, conversationId } = await firstEmpresaConversation();

    const response = await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        conversationId,
        content: 'Pode priorizar esse atendimento?',
        priority: 'urgent',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'queued',
      cost: 50,
      currentBalance: 2450,
    });
    expect(new Date(response.body.estimatedDelivery).getTime()).toBeGreaterThanOrEqual(
      new Date(response.body.timestamp).getTime(),
    );

    await request(server)
      .get(`/messages/${response.body.id}`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: response.body.id,
          conversationId,
          senderType: 'client',
          priority: 'urgent',
          status: 'queued',
          cost: 50,
        });
      });
  });

  it('creates a conversation when sending by recipientId', async () => {
    const session = await createSession('11222333000181', 'CNPJ');
    const recipients = await request(server)
      .get('/recipients')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);
    const ana = (recipients.body as RecipientListItem[]).find(
      (recipient) => recipient.name === 'Ana Costa',
    );

    const response = await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        recipientId: ana?.id,
        content: 'Olá, Ana. Podemos começar uma conversa?',
        priority: 'normal',
      })
      .expect(201);

    const conversations = await request(server)
      .get('/conversations')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    expect(response.body).toMatchObject({ status: 'queued', cost: 25, currentBalance: 2475 });
    expect(conversations.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientName: 'Ana Costa',
          lastMessageContent: 'Olá, Ana. Podemos começar uma conversa?',
        }),
      ]),
    );
  });

  it('returns RECIPIENT_NOT_FOUND for an unknown recipientId', async () => {
    const session = await createSession('11222333000181', 'CNPJ');

    await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        recipientId: '550e8400-e29b-41d4-a716-446655440099',
        content: 'Mensagem sem destinatário válido',
        priority: 'normal',
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe('RECIPIENT_NOT_FOUND');
      });
  });

  it('rejects message sending for insufficient prepaid balance and postpaid limit', async () => {
    const empty = await createSession('11144477735', 'CPF');
    const atLimit = await createSession('12345678909', 'CPF');
    const emptyRecipients = await request(server)
      .get('/recipients')
      .set('Authorization', `Bearer ${empty.token}`)
      .expect(200);
    const emptyRecipient = (emptyRecipients.body as RecipientListItem[]).find(
      (recipient) => recipient.name === 'Ana Costa',
    );

    await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${empty.token}`)
      .send({
        recipientId: emptyRecipient?.id,
        content: 'Sem saldo',
        priority: 'normal',
      })
      .expect(422)
      .expect(({ body }) => {
        expect(body.code).toBe('INSUFFICIENT_BALANCE');
      });

    const recipients = await request(server)
      .get('/recipients')
      .set('Authorization', `Bearer ${atLimit.token}`)
      .expect(200);
    const ana = (recipients.body as RecipientListItem[]).find(
      (recipient) => recipient.name === 'Ana Costa',
    );

    await request(server)
      .post('/messages')
      .set('Authorization', `Bearer ${atLimit.token}`)
      .send({
        recipientId: ana?.id,
        content: 'Sem limite mensal',
        priority: 'normal',
      })
      .expect(422)
      .expect(({ body }) => {
        expect(body.code).toBe('INSUFFICIENT_LIMIT');
      });
  });
});
