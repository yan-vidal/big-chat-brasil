import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ADMIN_DOCUMENT_ID } from '@bcb/shared';
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

type JwtBody = {
  readonly sub: string;
  readonly clientId: string;
  readonly role: string;
  readonly documentId: string;
  readonly documentType: string;
  readonly requiresOnboarding: boolean;
};

function decodeJwtPayload(token: string): JwtBody {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('JWT payload segment not found');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtBody;
}

describeDatabase('auth HTTP API', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;

  beforeAll(async () => {
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

  afterAll(async () => {
    await app?.close();
    await db?.destroy();
  });

  it('creates a client account for a new CPF and returns an onboarding JWT', async () => {
    const documentId = generateCpf(3001);

    const response = await request(server)
      .post('/auth/session')
      .send({ documentId, documentType: 'CPF', password: 'NewUser@123' })
      .expect(201);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      requiresOnboarding: true,
      client: {
        id: expect.any(String),
        name: expect.any(String),
        documentId,
        documentType: 'CPF',
        role: 'client',
        planType: 'prepaid',
        active: true,
        onboardingCompleted: false,
        balanceCents: 0,
        monthlyUsedCents: 0,
      },
    });
    expect(response.body.client).not.toHaveProperty('monthlyLimitCents');
    expect(decodeJwtPayload(response.body.token)).toMatchObject({
      sub: expect.any(String),
      clientId: response.body.client.id,
      role: 'client',
      documentId,
      documentType: 'CPF',
      requiresOnboarding: true,
    });
  });

  it('logs in a seeded client with a formatted CNPJ and returns the normalized profile', async () => {
    const response = await request(server)
      .post('/auth/session')
      .send({
        documentId: '11.222.333/0001-81',
        documentType: 'CNPJ',
        password: 'Demo@123',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      requiresOnboarding: false,
      client: {
        name: 'Empresa ABC',
        documentId: '11222333000181',
        documentType: 'CNPJ',
        role: 'client',
        planType: 'prepaid',
        active: true,
        onboardingCompleted: true,
        balanceCents: 2500,
      },
    });
    expect(decodeJwtPayload(response.body.token)).toMatchObject({
      documentId: '11222333000181',
      documentType: 'CNPJ',
      role: 'client',
      requiresOnboarding: false,
    });
  });

  it('logs in the reserved admin CPF with the default admin password', async () => {
    const response = await request(server)
      .post('/auth/session')
      .send({
        documentId: '000.000.000-00',
        documentType: 'CPF',
        password: 'Admin@123',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      requiresOnboarding: false,
      client: {
        name: 'Administrador BCB',
        documentId: ADMIN_DOCUMENT_ID,
        documentType: 'CPF',
        role: 'admin',
        planType: 'prepaid',
        active: true,
        onboardingCompleted: true,
        balanceCents: 0,
        monthlyUsedCents: 0,
      },
    });
    expect(response.body.client).not.toHaveProperty('monthlyLimitCents');
    expect(decodeJwtPayload(response.body.token)).toMatchObject({
      documentId: ADMIN_DOCUMENT_ID,
      documentType: 'CPF',
      role: 'admin',
      requiresOnboarding: false,
    });
  });

  it('rejects a wrong password for an existing account', async () => {
    await request(server)
      .post('/auth/session')
      .send({
        documentId: '11222333000181',
        documentType: 'CNPJ',
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('rejects an invalid document before touching credentials', async () => {
    await request(server)
      .post('/auth/session')
      .send({ documentId: '123', documentType: 'CPF', password: 'Demo@123' })
      .expect(400);
  });

  it('returns the authenticated client from a bearer token', async () => {
    const session = await request(server)
      .post('/auth/session')
      .send({
        documentId: '11222333000181',
        documentType: 'CNPJ',
        password: 'Demo@123',
      })
      .expect(201);

    const response = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${session.body.token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: session.body.client.id,
      name: 'Empresa ABC',
      documentId: '11222333000181',
      documentType: 'CNPJ',
      role: 'client',
      onboardingCompleted: true,
    });
  });
});
