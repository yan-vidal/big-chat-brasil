import { sql, type Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table billing_transactions
    drop constraint if exists billing_transactions_type_check
  `.execute(db);
  await sql`
    alter table billing_transactions
    add constraint billing_transactions_type_check
    check (type in ('credit', 'debit', 'usage', 'refund', 'adjustment'))
  `.execute(db);
}

async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from billing_transactions where type = 'adjustment'`.execute(db);
  await sql`
    alter table billing_transactions
    drop constraint if exists billing_transactions_type_check
  `.execute(db);
  await sql`
    alter table billing_transactions
    add constraint billing_transactions_type_check
    check (type in ('credit', 'debit', 'usage', 'refund'))
  `.execute(db);
}

export const billingAdjustmentsMigration: Migration = {
  up,
  down,
};
