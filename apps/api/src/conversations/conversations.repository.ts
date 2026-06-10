import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type {
  ConversationResponse,
  MarkConversationReadResponse,
  MessageResponse,
} from '@bcb/shared';

type ConversationRow = Omit<ConversationResponse, 'lastMessageAt'> & {
  readonly lastMessageAt: Date | string | null;
};

type MessageRow = Omit<MessageResponse, 'timestamp'> & {
  readonly timestamp: Date | string;
};

@Injectable()
export class ConversationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async listConversations(clientId: string): Promise<readonly ConversationRow[]> {
    return this.database.db
      .selectFrom('conversations')
      .innerJoin('recipients', 'recipients.id', 'conversations.recipient_id')
      .select([
        'conversations.id',
        'recipients.id as recipientId',
        'recipients.name as recipientName',
        'conversations.last_message_content as lastMessageContent',
        'conversations.last_message_at as lastMessageAt',
        'conversations.unread_count as unreadCount',
      ])
      .where('conversations.client_id', '=', clientId)
      .orderBy('conversations.last_message_at', 'desc')
      .orderBy('recipients.name', 'asc')
      .execute();
  }

  async findConversation(
    clientId: string,
    conversationId: string,
  ): Promise<ConversationRow | undefined> {
    return this.database.db
      .selectFrom('conversations')
      .innerJoin('recipients', 'recipients.id', 'conversations.recipient_id')
      .select([
        'conversations.id',
        'recipients.id as recipientId',
        'recipients.name as recipientName',
        'conversations.last_message_content as lastMessageContent',
        'conversations.last_message_at as lastMessageAt',
        'conversations.unread_count as unreadCount',
      ])
      .where('conversations.id', '=', conversationId)
      .where('conversations.client_id', '=', clientId)
      .executeTakeFirst();
  }

  async listMessages(clientId: string, conversationId: string): Promise<readonly MessageRow[]> {
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
      .where('conversations.id', '=', conversationId)
      .where('conversations.client_id', '=', clientId)
      .orderBy('messages.created_at', 'asc')
      .limit(200)
      .execute();
  }

  async markConversationRead(
    clientId: string,
    conversationId: string,
  ): Promise<MarkConversationReadResponse | undefined> {
    const updated = await this.database.db
      .updateTable('conversations')
      .set({ unread_count: 0, updated_at: new Date() })
      .where('id', '=', conversationId)
      .where('client_id', '=', clientId)
      .returning(['id as conversationId', 'unread_count as unreadCount'])
      .executeTakeFirst();

    return updated ? { conversationId: updated.conversationId, unreadCount: 0 } : undefined;
  }
}
