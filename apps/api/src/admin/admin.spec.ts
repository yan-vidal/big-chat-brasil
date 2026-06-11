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

type SessionResponse = {
  readonly token: string;
  readonly client: {
    readonly id: string;
    readonly role: 'admin' | 'client';
  };
};

type AdminClientListItem = {
  readonly id: string;
  readonly name: string;
  readonly documentId: string;
  readonly documentType: 'CPF' | 'CNPJ';
  readonly role: 'admin' | 'client';
  readonly active: boolean;
  readonly planType: 'prepaid' | 'postpaid';
  readonly onboardingCompleted: boolean;
  readonly balanceCents: number;
  readonly monthlyLimitCents?: number;
  readonly monthlyUsedCents: number;
};

describeDatabase('admin client management API', () => {
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

  async function login(documentId: string, documentType: 'CPF' | 'CNPJ'): Promise<SessionResponse> {
    const response = await request(server)
      .post('/auth/session')
      .send({
        documentId,
        documentType,
        password: documentId === ADMIN_DOCUMENT_ID ? 'Admin@123' : 'Demo@123',
      })
      .expect(201);

    return response.body as SessionResponse;
  }

  it('allows only admins to list client accounts', async () => {
    const admin = await login(ADMIN_DOCUMENT_ID, 'CPF');
    const client = await login('11222333000181', 'CNPJ');

    await request(server)
      .get('/admin/clients')
      .set('Authorization', `Bearer ${client.token}`)
      .expect(403);

    const response = await request(server)
      .get('/admin/clients')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const clients = response.body as AdminClientListItem[];

    expect(clients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: ADMIN_DOCUMENT_ID,
          role: 'admin',
          active: true,
          balanceCents: 0,
          monthlyUsedCents: 0,
        }),
        expect.objectContaining({
          documentId: '11222333000181',
          role: 'client',
          planType: 'prepaid',
          balanceCents: 2500,
        }),
      ]),
    );
  });

  it('rejects role changes and creates only regular client accounts', async () => {
    const admin = await login(ADMIN_DOCUMENT_ID, 'CPF');
    const documentId = generateCpf(4301);

    await request(server)
      .post('/admin/clients')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        documentId,
        documentType: 'CPF',
        password: 'Client@123',
        name: 'Cliente Criado Pelo Admin',
        planType: 'prepaid',
        initialBalanceCents: 1000,
        role: 'admin',
      })
      .expect(400);

    const created = await request(server)
      .post('/admin/clients')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        documentId,
        documentType: 'CPF',
        password: 'Client@123',
        name: 'Cliente Criado Pelo Admin',
        planType: 'prepaid',
        initialBalanceCents: 1000,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      documentId,
      role: 'client',
      active: true,
      planType: 'prepaid',
      balanceCents: 1000,
      monthlyUsedCents: 0,
    });
  });

  it('manages active status, prepaid credit, postpaid limits and plan conversion', async () => {
    const admin = await login(ADMIN_DOCUMENT_ID, 'CPF');

    const prepaid = await request(server)
      .get('/admin/clients')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200)
      .then((response) =>
        (response.body as AdminClientListItem[]).find(
          (client) => client.documentId === '11144477735',
        ),
      );
    const postpaid = await request(server)
      .get('/admin/clients')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200)
      .then((response) =>
        (response.body as AdminClientListItem[]).find(
          (client) => client.documentId === '11444777000161',
        ),
      );

    expect(prepaid).toBeDefined();
    expect(postpaid).toBeDefined();

    const disabled = await request(server)
      .patch(`/admin/clients/${prepaid?.id}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ active: false })
      .expect(200);
    expect(disabled.body).toMatchObject({ id: prepaid?.id, active: false, role: 'client' });

    const credited = await request(server)
      .post(`/admin/clients/${prepaid?.id}/credits`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amountCents: 1500 })
      .expect(201);
    expect(credited.body).toMatchObject({ id: prepaid?.id, balanceCents: 1500 });

    const limited = await request(server)
      .patch(`/admin/clients/${postpaid?.id}/limit`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ monthlyLimitCents: 20000 })
      .expect(200);
    expect(limited.body).toMatchObject({
      id: postpaid?.id,
      planType: 'postpaid',
      monthlyLimitCents: 20000,
    });

    const converted = await request(server)
      .post(`/admin/clients/${prepaid?.id}/plan`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ planType: 'postpaid', monthlyLimitCents: 30000 })
      .expect(201);
    expect(converted.body).toMatchObject({
      id: prepaid?.id,
      planType: 'postpaid',
      balanceCents: 0,
      monthlyLimitCents: 30000,
      monthlyUsedCents: 0,
    });

    const adjustments = await db
      .selectFrom('billing_transactions')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('client_id', '=', prepaid?.id ?? '')
      .where('type', '=', 'adjustment')
      .executeTakeFirstOrThrow();

    expect(Number(adjustments.count)).toBeGreaterThanOrEqual(2);
  });
});
