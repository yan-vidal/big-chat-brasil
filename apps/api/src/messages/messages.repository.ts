import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { MessagePriority, MessageStatus } from '@bcb/shared';

export type ConversationReference = {
  readonly id: string;
  readonly recipientId: string;
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

  async findRecipient(recipientId: string): Promise<{ readonly id: string } | undefined> {
    return this.database.db
      .selectFrom('recipients')
      .select(['id'])
      .where('id', '=', recipientId)
      .executeTakeFirst();
  }

  async findOrCreateConversation(
    clientId: string,
    recipientId: string,
  ): Promise<ConversationReference> {
    const existing = await this.database.db
      .selectFrom('conversations')
      .select(['id', 'recipient_id as recipientId'])
      .where('client_id', '=', clientId)
      .where('recipient_id', '=', recipientId)
      .executeTakeFirst();
    if (existing) {
      return existing;
    }

    const inserted = await this.database.db
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

  async createClientMessage(input: {
    readonly conversationId: string;
    readonly content: string;
    readonly priority: MessagePriority;
    readonly costCents: number;
  }): Promise<MessageRow> {
    const inserted = await this.database.db
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

    await this.database.db
      .updateTable('conversations')
      .set({
        last_message_content: input.content,
        last_message_at: inserted.timestamp,
        updated_at: inserted.timestamp,
      })
      .where('id', '=', input.conversationId)
      .execute();

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
}
