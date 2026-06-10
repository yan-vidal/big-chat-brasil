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
  readonly unreadCount: number;
};

describeDatabase('conversations HTTP API', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;

  beforeEach(async () => {
    process.env.QUEUE_AUTOSTART = 'false';
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

  async function listEmpresaConversations(): Promise<{
    readonly session: SessionResponse;
    readonly conversations: readonly ConversationListItem[];
  }> {
    const session = await createSession('11222333000181', 'CNPJ');
    const response = await request(server)
      .get('/conversations')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    return { session, conversations: response.body as ConversationListItem[] };
  }

  it('lists seeded conversations for the authenticated client', async () => {
    const { conversations } = await listEmpresaConversations();

    expect(conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientName: 'Maria Oliveira',
          lastMessageContent: 'Acabei de anexar a nota fiscal ao atendimento.',
          unreadCount: 1,
        }),
        expect.objectContaining({
          recipientName: 'Carlos Pereira',
          lastMessageContent: null,
          unreadCount: 0,
        }),
      ]),
    );
  });

  it('returns message history in chronological order', async () => {
    const { session, conversations } = await listEmpresaConversations();
    const maria = conversations.find(
      (conversation) => conversation.recipientName === 'Maria Oliveira',
    );
    expect(maria).toBeDefined();

    const response = await request(server)
      .get(`/conversations/${maria?.id}/messages`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    expect(response.body.map((message: { content: string }) => message.content)).toEqual([
      'Olá, Maria. Pode confirmar o andamento do pedido?',
      'Pedido confirmado. Envio programado para hoje.',
      'Acabei de anexar a nota fiscal ao atendimento.',
    ]);
  });

  it('marks only the owner conversation as read', async () => {
    const { session, conversations } = await listEmpresaConversations();
    const maria = conversations.find(
      (conversation) => conversation.recipientName === 'Maria Oliveira',
    );
    expect(maria).toBeDefined();

    await request(server)
      .post(`/conversations/${maria?.id}/read`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({ conversationId: maria?.id, unreadCount: 0 });
      });

    const afterRead = await request(server)
      .get('/conversations')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    expect(
      (afterRead.body as ConversationListItem[]).find(
        (conversation) => conversation.id === maria?.id,
      ),
    ).toMatchObject({ unreadCount: 0 });
  });

  it('does not allow another client to read a conversation it does not own', async () => {
    const { conversations } = await listEmpresaConversations();
    const maria = conversations.find(
      (conversation) => conversation.recipientName === 'Maria Oliveira',
    );
    const otherClient = await createSession('11444777000161', 'CNPJ');
    expect(maria).toBeDefined();

    await request(server)
      .get(`/conversations/${maria?.id}`)
      .set('Authorization', `Bearer ${otherClient.token}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe('CONVERSATION_NOT_FOUND');
      });
  });
});
