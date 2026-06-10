import { sql, type Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table recipients
    add column client_profile_id uuid references client_profiles(id) on delete cascade
  `.execute(db);
  await sql`alter table recipients drop constraint if exists recipients_name_key`.execute(db);
  await sql`
    create unique index recipients_client_profile_id_idx
    on recipients(client_profile_id)
  `.execute(db);
}

async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from recipients where client_profile_id is not null`.execute(db);
  await sql`drop index if exists recipients_client_profile_id_idx`.execute(db);
  await sql`alter table recipients drop column if exists client_profile_id`.execute(db);
  await sql`alter table recipients add constraint recipients_name_key unique (name)`.execute(db);
}

export const accountRecipientsMigration: Migration = {
  up,
  down,
};
