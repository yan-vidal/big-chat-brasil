import { pathToFileURL } from 'node:url';
import { hash } from 'bcryptjs';
import type { Kysely } from 'kysely';
import { createDatabase } from './database.client.js';
import {
  DEMO_ACCOUNTS,
  DEMO_CONVERSATIONS,
  DEMO_RECIPIENTS,
  type DemoAccount,
} from './seed-data.js';
import type { Database } from './database.types.js';

const SEED_PASSWORD_SALT_ROUNDS = 8;

export async function clearSeedData(db: Kysely<Database>): Promise<void> {
  await db.deleteFrom('billing_transactions').execute();
  await db.deleteFrom('payment_intents').execute();
  await db.deleteFrom('messages').execute();
  await db.deleteFrom('conversations').execute();
  await db.deleteFrom('recipients').execute();
  await db.deleteFrom('client_profiles').execute();
  await db.deleteFrom('accounts').execute();
}

async function seedAccount(db: Kysely<Database>, account: DemoAccount): Promise<string> {
  const insertedAccount = await db
    .insertInto('accounts')
    .values({
      document_id: account.documentId,
      document_type: account.documentType,
      password_hash: await hash(account.password, SEED_PASSWORD_SALT_ROUNDS),
      role: account.role,
      active: account.active,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  const insertedProfile = await db
    .insertInto('client_profiles')
    .values({
      account_id: insertedAccount.id,
      name: account.profile.name,
      plan_type: account.profile.planType,
      onboarding_completed: account.profile.onboardingCompleted,
      balance_cents: account.profile.balanceCents,
      monthly_limit_cents: account.profile.monthlyLimitCents,
      monthly_used_cents: account.profile.monthlyUsedCents,
      usage_month: account.profile.usageMonth,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  if (account.role === 'client' && account.profile.onboardingCompleted) {
    await db
      .insertInto('recipients')
      .values({
        name: account.profile.name,
        client_profile_id: insertedProfile.id,
      })
      .execute();
  }

  if (account.documentId === '11222333000181') {
    const paymentIntent = await db
      .insertInto('payment_intents')
      .values({
        client_id: insertedProfile.id,
        method: 'pix',
        amount_cents: account.profile.balanceCents,
        status: 'confirmed',
        confirmed_at: new Date('2026-06-09T12:00:00.000Z'),
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await db
      .insertInto('billing_transactions')
      .values({
        client_id: insertedProfile.id,
        type: 'credit',
        amount_cents: account.profile.balanceCents,
        payment_intent_id: paymentIntent.id,
        message_id: null,
      })
      .execute();
  }

  return insertedProfile.id;
}

export async function seedDatabase(db: Kysely<Database>): Promise<void> {
  await clearSeedData(db);

  const clientIds = new Map<string, string>();
  const recipientIds = new Map<string, string>();

  for (const account of DEMO_ACCOUNTS) {
    clientIds.set(account.documentId, await seedAccount(db, account));
  }

  for (const recipient of DEMO_RECIPIENTS) {
    const insertedRecipient = await db
      .insertInto('recipients')
      .values({ name: recipient.name, client_profile_id: null })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    recipientIds.set(recipient.key, insertedRecipient.id);
  }

  for (const conversation of DEMO_CONVERSATIONS) {
    const clientId = clientIds.get(conversation.clientDocumentId);
    const recipientId = recipientIds.get(conversation.recipientKey);

    if (!clientId || !recipientId) {
      throw new Error(`Invalid seed conversation reference: ${conversation.recipientKey}`);
    }

    const lastMessage = conversation.messages.at(-1);
    const insertedConversation = await db
      .insertInto('conversations')
      .values({
        client_id: clientId,
        recipient_id: recipientId,
        last_message_content: lastMessage?.content ?? null,
        last_message_at: lastMessage?.createdAt ?? null,
        unread_count: conversation.unreadCount,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    if (conversation.messages.length > 0) {
      await db
        .insertInto('messages')
        .values(
          conversation.messages.map((message) => ({
            conversation_id: insertedConversation.id,
            sender_type: message.senderType,
            content: message.content,
            priority: message.priority,
            status: message.status,
            cost_cents: message.costCents,
            created_at: message.createdAt,
            processed_at: message.processedAt,
          })),
        )
        .execute();
    }
  }
}

async function runCli(): Promise<void> {
  const db = createDatabase();

  try {
    await seedDatabase(db);
  } finally {
    await db.destroy();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCli();
}
