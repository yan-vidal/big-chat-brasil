import { sql, type Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create extension if not exists "pgcrypto"`.execute(db);

  await sql`
    create table accounts (
      id uuid primary key default gen_random_uuid(),
      document_id varchar(14) not null unique,
      document_type varchar(4) not null check (document_type in ('CPF', 'CNPJ')),
      password_hash text not null,
      role varchar(16) not null default 'client' check (role in ('client', 'admin')),
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `.execute(db);

  await sql`
    create table client_profiles (
      id uuid primary key default gen_random_uuid(),
      account_id uuid not null unique references accounts(id) on delete cascade,
      name varchar(120) not null,
      plan_type varchar(16) not null check (plan_type in ('prepaid', 'postpaid')),
      onboarding_completed boolean not null default false,
      balance_cents integer not null default 0 check (balance_cents >= 0),
      monthly_limit_cents integer check (monthly_limit_cents is null or monthly_limit_cents >= 0),
      monthly_used_cents integer not null default 0 check (monthly_used_cents >= 0),
      usage_month char(7) check (usage_month is null or usage_month ~ '^\\d{4}-\\d{2}$'),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `.execute(db);

  await sql`
    create table recipients (
      id uuid primary key default gen_random_uuid(),
      name varchar(120) not null unique,
      created_at timestamptz not null default now()
    )
  `.execute(db);

  await sql`
    create table conversations (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references client_profiles(id) on delete cascade,
      recipient_id uuid not null references recipients(id) on delete restrict,
      last_message_content text,
      last_message_at timestamptz,
      unread_count integer not null default 0 check (unread_count >= 0),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (client_id, recipient_id)
    )
  `.execute(db);

  await sql`
    create table messages (
      id uuid primary key default gen_random_uuid(),
      conversation_id uuid not null references conversations(id) on delete cascade,
      sender_type varchar(16) not null check (sender_type in ('client', 'user')),
      content text not null,
      priority varchar(16) not null check (priority in ('normal', 'urgent')),
      status varchar(16) not null check (
        status in ('queued', 'processing', 'sent', 'delivered', 'read', 'failed')
      ),
      cost_cents integer not null default 0 check (cost_cents >= 0),
      created_at timestamptz not null default now(),
      processed_at timestamptz
    )
  `.execute(db);

  await sql`
    create table payment_intents (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references client_profiles(id) on delete cascade,
      method varchar(16) not null check (method in ('pix')),
      amount_cents integer not null check (amount_cents > 0),
      status varchar(16) not null check (status in ('pending', 'confirmed')),
      confirmed_at timestamptz,
      created_at timestamptz not null default now()
    )
  `.execute(db);

  await sql`
    create table billing_transactions (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references client_profiles(id) on delete cascade,
      type varchar(16) not null check (type in ('credit', 'debit', 'usage', 'refund')),
      amount_cents integer not null check (amount_cents > 0),
      message_id uuid references messages(id) on delete set null,
      payment_intent_id uuid references payment_intents(id) on delete set null,
      created_at timestamptz not null default now()
    )
  `.execute(db);

  await sql`create index conversations_client_id_idx on conversations(client_id)`.execute(db);
  await sql`create index messages_conversation_id_created_at_idx on messages(conversation_id, created_at)`.execute(
    db,
  );
  await sql`create index billing_transactions_client_id_created_at_idx on billing_transactions(client_id, created_at)`.execute(
    db,
  );
}

async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists billing_transactions`.execute(db);
  await sql`drop table if exists payment_intents`.execute(db);
  await sql`drop table if exists messages`.execute(db);
  await sql`drop table if exists conversations`.execute(db);
  await sql`drop table if exists recipients`.execute(db);
  await sql`drop table if exists client_profiles`.execute(db);
  await sql`drop table if exists accounts`.execute(db);
}

export const initialSchemaMigration: Migration = {
  up,
  down,
};
