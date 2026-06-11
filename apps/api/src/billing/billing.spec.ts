import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { generateCpf } from '@bcb/shared/testing';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { BillingService } from './billing.service.js';
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
  };
};

describeDatabase('billing HTTP API and financial rules', () => {
  let app: INestApplication;
  let db: Kysely<Database>;
  let server: Server;
  let billingService: BillingService;

  beforeEach(async () => {
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
    billingService = app.get(BillingService);
  });

  afterEach(async () => {
    await app?.close();
    await db?.destroy();
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

  async function createNewSession(seed: number): Promise<SessionResponse> {
    return createSession(generateCpf(seed), 'CPF', 'NewUser@123');
  }

  it('onboards a new client as prepaid and confirms simulated PIX credit', async () => {
    const session = await createNewSession(4101);

    await request(server)
      .post('/billing/onboarding')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ name: 'Cliente Pre Pago', planType: 'prepaid' })
      .expect(201);

    await request(server)
      .get('/billing/me')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(403);

    const intent = await request(server)
      .post('/billing/pix-intents')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ amountCents: 2500 })
      .expect(201);

    await request(server)
      .post(`/billing/pix-intents/${intent.body.id}/confirm`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(201);

    const summary = await request(server)
      .get('/billing/me')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    expect(summary.body).toMatchObject({
      planType: 'prepaid',
      balanceCents: 2500,
      transactions: [
        expect.objectContaining({
          type: 'credit',
          amountCents: 2500,
          paymentIntentId: intent.body.id,
        }),
      ],
    });
  });

  it('onboards a new client as postpaid with a monthly limit', async () => {
    const session = await createNewSession(4102);
    const currentMonth = new Date().toISOString().slice(0, 7);

    await request(server)
      .post('/billing/onboarding')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ name: 'Cliente Pos Pago', planType: 'postpaid', monthlyLimitCents: 10_000 })
      .expect(201);

    const summary = await request(server)
      .get('/billing/me')
      .set('Authorization', `Bearer ${session.token}`)
      .expect(200);

    expect(summary.body).toMatchObject({
      planType: 'postpaid',
      monthlyLimitCents: 10_000,
      monthlyUsedCents: 0,
      remainingCents: 10_000,
      usageMonth: currentMonth,
      transactions: [],
    });
  });

  it('rejects unauthenticated and invalid billing requests', async () => {
    await request(server).get('/billing/me').expect(401);

    const session = await createNewSession(4103);

    await request(server)
      .post('/billing/onboarding')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ name: '', planType: 'postpaid' })
      .expect(400);
  });

  it('rejects duplicate PIX confirmation', async () => {
    const session = await createNewSession(4104);

    await request(server)
      .post('/billing/onboarding')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ name: 'Cliente Pix Duplicado', planType: 'prepaid' })
      .expect(201);

    const intent = await request(server)
      .post('/billing/pix-intents')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ amountCents: 1000 })
      .expect(201);

    await request(server)
      .post(`/billing/pix-intents/${intent.body.id}/confirm`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(201);

    await request(server)
      .post(`/billing/pix-intents/${intent.body.id}/confirm`)
      .set('Authorization', `Bearer ${session.token}`)
      .expect(409);
  });

  it('debits prepaid balance and rejects insufficient prepaid balance', async () => {
    const funded = await createSession('11222333000181', 'CNPJ');
    const empty = await createSession('11144477735', 'CPF');

    await expect(
      billingService.chargeMessage({
        clientId: empty.client.id,
        priority: 'normal',
        messageId: null,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }),
    });

    await expect(
      billingService.chargeMessage({
        clientId: funded.client.id,
        priority: 'normal',
        messageId: null,
      }),
    ).resolves.toMatchObject({
      planType: 'prepaid',
      balanceCents: 2475,
      chargedCents: 25,
    });

    await expect(billingService.refundPrepaid(funded.client.id, 25, null)).resolves.toMatchObject({
      balanceCents: 2500,
    });

    await expect(billingService.getSummary(funded.client.id)).resolves.toMatchObject({
      planType: 'prepaid',
      balanceCents: 2500,
      transactions: expect.arrayContaining([
        expect.objectContaining({ type: 'debit', amountCents: 25 }),
        expect.objectContaining({ type: 'refund', amountCents: 25 }),
      ]),
    });
  });

  it('tracks postpaid usage, lazy-resets old usage month, and rejects insufficient limit', async () => {
    const withinLimit = await createSession('11444777000161', 'CNPJ');
    const atLimit = await createSession('12345678909', 'CPF');
    const currentMonth = new Date().toISOString().slice(0, 7);

    await db
      .updateTable('client_profiles')
      .set({ monthly_used_cents: 1000, usage_month: '2026-01' })
      .where('id', '=', withinLimit.client.id)
      .execute();

    await expect(
      billingService.chargeMessage({
        clientId: withinLimit.client.id,
        priority: 'urgent',
        messageId: null,
      }),
    ).resolves.toMatchObject({
      planType: 'postpaid',
      chargedCents: 50,
      monthlyLimitCents: 10_000,
      monthlyUsedCents: 50,
      remainingCents: 9950,
      usageMonth: currentMonth,
    });

    await expect(
      billingService.chargeMessage({
        clientId: atLimit.client.id,
        priority: 'normal',
        messageId: null,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INSUFFICIENT_LIMIT' }),
    });
  });
});
