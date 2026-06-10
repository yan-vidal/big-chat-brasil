import { sql, type Kysely } from 'kysely';
import { getDatabaseUrl } from './database.config.js';
import { createDatabase } from './database.client.js';
import { migrateToLatest } from './migrate.js';
import { DEMO_ACCOUNTS, DEMO_RECIPIENTS } from './seed-data.js';
import { seedDatabase } from './seed.js';
import { resetDatabaseForTests } from './testing.js';
import type { Database } from './database.types.js';

const describeDatabase = process.env.BCB_RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeDatabase('database migrations and seed', () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    db = createDatabase(getDatabaseUrl());
    await resetDatabaseForTests(db);
    await migrateToLatest(db);
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it('creates the initial schema tables', async () => {
    const result = await sql<{ table_name: string }>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'accounts',
          'client_profiles',
          'recipients',
          'conversations',
          'messages',
          'billing_transactions',
          'payment_intents'
        )
      order by table_name
    `.execute(db);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      'accounts',
      'billing_transactions',
      'client_profiles',
      'conversations',
      'messages',
      'payment_intents',
      'recipients',
    ]);
  });

  it('seeds demo accounts, recipients and conversation history idempotently', async () => {
    await seedDatabase(db);
    await seedDatabase(db);

    const accountCount = await db
      .selectFrom('accounts')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow();
    const simulatedRecipientCount = await db
      .selectFrom('recipients')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('client_profile_id', 'is', null)
      .executeTakeFirstOrThrow();
    const accountRecipientCount = await db
      .selectFrom('recipients')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('client_profile_id', 'is not', null)
      .executeTakeFirstOrThrow();
    const empresaAbc = await db
      .selectFrom('accounts')
      .innerJoin('client_profiles', 'client_profiles.account_id', 'accounts.id')
      .select([
        'accounts.document_id as documentId',
        'accounts.role',
        'client_profiles.name',
        'client_profiles.plan_type as planType',
        'client_profiles.balance_cents as balanceCents',
      ])
      .where('accounts.document_id', '=', '11222333000181')
      .executeTakeFirstOrThrow();
    const empresaConversationCount = await db
      .selectFrom('conversations')
      .innerJoin('client_profiles', 'client_profiles.id', 'conversations.client_id')
      .innerJoin('accounts', 'accounts.id', 'client_profiles.account_id')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('accounts.document_id', '=', '11222333000181')
      .executeTakeFirstOrThrow();

    expect(Number(accountCount.count)).toBe(DEMO_ACCOUNTS.length);
    expect(Number(simulatedRecipientCount.count)).toBe(DEMO_RECIPIENTS.length);
    expect(Number(accountRecipientCount.count)).toBe(
      DEMO_ACCOUNTS.filter((account) => account.profile.onboardingCompleted).length,
    );
    expect(empresaAbc).toEqual({
      documentId: '11222333000181',
      role: 'client',
      name: 'Empresa ABC',
      planType: 'prepaid',
      balanceCents: 2500,
    });
    expect(Number(empresaConversationCount.count)).toBeGreaterThanOrEqual(2);
  });
});
