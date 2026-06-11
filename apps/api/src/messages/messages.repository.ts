import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { Database } from '../database/database.types.js';
import type { MessagePriority, MessageStatus } from '@bcb/shared';
import type { Kysely, Transaction } from 'kysely';

export type ConversationReference = {
  readonly id: string;
  readonly recipientId: string;
};

export type RecipientReference = {
  readonly id: string;
  readonly linkedClientId: string | null;
};

export type MessageRow = {
  readonly id: string;
  readonly conversationId: string;
  readonly content: string;
  readonly senderType: 'client' | 'user';
  readonly timestamp: Date | string;
  readonly priority: MessagePriority;
  readonly status: MessageStatus;
  readonly cost: number;
};

export type MessageStatusRow = {
  readonly messageId: string;
  readonly conversationId: string;
  readonly status: MessageStatus;
  readonly occurredAt: Date | string;
};

export type ConversationUpdateRow = {
  readonly conversationId: string;
  readonly lastMessageContent: string | null;
  readonly lastMessageAt: Date | string | null;
  readonly unreadCount: number;
};

export type MirroredConversationUpdateRow = ConversationUpdateRow & {
  readonly clientId: string;
};

export type MirroredMessageResult = {
  readonly clientId: string;
  readonly message: MessageRow;
  readonly conversation: MirroredConversationUpdateRow;
};

export type CreateClientMessageResult = {
  readonly message: MessageRow;
  readonly mirror?: MirroredMessageResult;
};

type DatabaseExecutor = Kysely<Database> | Transaction<Database>;

@Injectable()
export class MessagesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findConversationForClient(
    clientId: string,
    conversationId: string,
  ): Promise<ConversationReference | undefined> {
    return this.database.db
      .selectFrom('conversations')
      .select(['id', 'recipient_id as recipientId'])
      .where('id', '=', conversationId)
      .where('client_id', '=', clientId)
      .executeTakeFirst();
  }

  async findRecipient(recipientId: string): Promise<RecipientReference | undefined> {
    return this.database.db
      .selectFrom('recipients')
      .select(['id', 'client_profile_id as linkedClientId'])
      .where('id', '=', recipientId)
      .executeTakeFirst();
  }

  async findOrCreateConversation(
    clientId: string,
    recipientId: string,
  ): Promise<ConversationReference> {
    return this.findOrCreateConversationIn(this.database.db, clientId, recipientId);
  }

  async createClientMessage(input: {
    readonly clientId: string;
    readonly conversationId: string;
    readonly content: string;
    readonly priority: MessagePriority;
    readonly costCents: number;
  }): Promise<CreateClientMessageResult> {
    return this.database.db.transaction().execute(async (trx) => {
      const message = await trx
        .insertInto('messages')
        .values({
          conversation_id: input.conversationId,
          sender_type: 'client',
          content: input.content,
          priority: input.priority,
          status: 'queued',
          cost_cents: input.costCents,
        })
        .returning([
          'id',
          'conversation_id as conversationId',
          'content',
          'sender_type as senderType',
          'created_at as timestamp',
          'priority',
          'status',
          'cost_cents as cost',
        ])
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('conversations')
        .set({
          last_message_content: input.content,
          last_message_at: message.timestamp,
          updated_at: message.timestamp,
        })
        .where('id', '=', input.conversationId)
        .execute();

      const mirror = await this.createMirrorMessageIfNeeded(trx, input);

      return {
        message,
        ...(mirror ? { mirror } : {}),
      };
    });
  }

  private async findOrCreateConversationIn(
    db: DatabaseExecutor,
    clientId: string,
    recipientId: string,
  ): Promise<ConversationReference> {
    const existing = await db
      .selectFrom('conversations')
      .select(['id', 'recipient_id as recipientId'])
      .where('client_id', '=', clientId)
      .where('recipient_id', '=', recipientId)
      .executeTakeFirst();
    if (existing) {
      return existing;
    }

    const inserted = await db
      .insertInto('conversations')
      .values({
        client_id: clientId,
        recipient_id: recipientId,
        last_message_content: null,
        last_message_at: null,
        unread_count: 0,
      })
      .returning(['id', 'recipient_id as recipientId'])
      .executeTakeFirstOrThrow();

    return inserted;
  }

  async findMessageForClient(clientId: string, messageId: string): Promise<MessageRow | undefined> {
    return this.database.db
      .selectFrom('messages')
      .innerJoin('conversations', 'conversations.id', 'messages.conversation_id')
      .select([
        'messages.id',
        'messages.conversation_id as conversationId',
        'messages.content',
        'messages.sender_type as senderType',
        'messages.created_at as timestamp',
        'messages.priority',
        'messages.status',
        'messages.cost_cents as cost',
      ])
      .where('messages.id', '=', messageId)
      .where('conversations.client_id', '=', clientId)
      .executeTakeFirst();
  }

  async findMessageStatusForClient(
    clientId: string,
    messageId: string,
  ): Promise<MessageStatusRow | undefined> {
    return this.database.db
      .selectFrom('messages')
      .innerJoin('conversations', 'conversations.id', 'messages.conversation_id')
      .select([
        'messages.id as messageId',
        'messages.conversation_id as conversationId',
        'messages.status',
        'messages.processed_at as occurredAt',
        'messages.created_at as createdAt',
      ])
      .where('messages.id', '=', messageId)
      .where('conversations.client_id', '=', clientId)
      .executeTakeFirst()
      .then((row) =>
        row
          ? {
              messageId: row.messageId,
              conversationId: row.conversationId,
              status: row.status,
              occurredAt: row.occurredAt ?? row.createdAt,
            }
          : undefined,
      );
  }

  async findConversationUpdate(
    clientId: string,
    conversationId: string,
  ): Promise<ConversationUpdateRow | undefined> {
    return this.database.db
      .selectFrom('conversations')
      .select([
        'id as conversationId',
        'last_message_content as lastMessageContent',
        'last_message_at as lastMessageAt',
        'unread_count as unreadCount',
      ])
      .where('id', '=', conversationId)
      .where('client_id', '=', clientId)
      .executeTakeFirst();
  }

  private async createMirrorMessageIfNeeded(
    trx: Transaction<Database>,
    input: {
      readonly clientId: string;
      readonly conversationId: string;
      readonly content: string;
      readonly priority: MessagePriority;
    },
  ): Promise<MirroredMessageResult | undefined> {
    const sourceConversation = await trx
      .selectFrom('conversations')
      .innerJoin('recipients', 'recipients.id', 'conversations.recipient_id')
      .select(['recipients.client_profile_id as recipientClientId'])
      .where('conversations.id', '=', input.conversationId)
      .where('conversations.client_id', '=', input.clientId)
      .executeTakeFirst();

    if (!sourceConversation?.recipientClientId) {
      return undefined;
    }

    if (sourceConversation.recipientClientId === input.clientId) {
      return undefined;
    }

    const senderRecipient = await this.findOrCreateAccountRecipient(trx, input.clientId);
    const targetConversation = await this.findOrCreateConversationIn(
      trx,
      sourceConversation.recipientClientId,
      senderRecipient.id,
    );
    const message = await trx
      .insertInto('messages')
      .values({
        conversation_id: targetConversation.id,
        sender_type: 'user',
        content: input.content,
        priority: input.priority,
        status: 'delivered',
        cost_cents: 0,
        processed_at: new Date(),
      })
      .returning([
        'id',
        'conversation_id as conversationId',
        'content',
        'sender_type as senderType',
        'created_at as timestamp',
        'priority',
        'status',
        'cost_cents as cost',
      ])
      .executeTakeFirstOrThrow();

    const conversation = await trx
      .updateTable('conversations')
      .set((eb) => ({
        last_message_content: input.content,
        last_message_at: message.timestamp,
        unread_count: eb('unread_count', '+', 1),
        updated_at: message.timestamp,
      }))
      .where('id', '=', targetConversation.id)
      .returning([
        'client_id as clientId',
        'id as conversationId',
        'last_message_content as lastMessageContent',
        'last_message_at as lastMessageAt',
        'unread_count as unreadCount',
      ])
      .executeTakeFirstOrThrow();

    return {
      clientId: sourceConversation.recipientClientId,
      message,
      conversation,
    };
  }

  private async findOrCreateAccountRecipient(
    trx: Transaction<Database>,
    clientId: string,
  ): Promise<{ readonly id: string }> {
    const existing = await trx
      .selectFrom('recipients')
      .select(['id'])
      .where('client_profile_id', '=', clientId)
      .executeTakeFirst();

    if (existing) {
      return existing;
    }

    const profile = await trx
      .selectFrom('client_profiles')
      .select(['name'])
      .where('id', '=', clientId)
      .where('onboarding_completed', '=', true)
      .executeTakeFirstOrThrow();

    return trx
      .insertInto('recipients')
      .values({
        name: profile.name,
        client_profile_id: clientId,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  }
}
