import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { generateCpf } from '@bcb/shared/testing';
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

describeDatabase('recipients HTTP API', () => {
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
    password = 'Demo@123',
  ): Promise<SessionResponse> {
    const response = await request(server)
      .post('/auth/session')
      .send({ documentId, documentType, password })
      .expect(201);

    return response.body as SessionResponse;
  }

  it('lists the seeded recipient catalog for an onboarded client', async () => {
    const session = await createSession('11222333000181', 'CNPJ');

    const response = await request(server)
      .get('/recipients')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({ name: 'Ana Costa' }),
      expect.objectContaining({ name: 'Carlos Pereira' }),
      expect.objectContaining({ name: 'Maria Oliveira' }),
      expect.objectContaining({ name: 'Pedro Santos' }),
    ]);
  });

  it('requires completed onboarding before listing recipients', async () => {
    const documentId = generateCpf(5101);
    const session = await createSession(documentId, 'CPF', 'NewUser@123');

    await request(server)
      .get('/recipients')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('ONBOARDING_REQUIRED');
      });
  });
});
