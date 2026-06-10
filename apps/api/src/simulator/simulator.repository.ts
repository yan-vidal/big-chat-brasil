import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { MessagePriority, MessageStatus, SenderType } from '@bcb/shared';

export type SimulatorStatusRow = {
  readonly messageId: string;
  readonly conversationId: string;
  readonly status: MessageStatus;
  readonly occurredAt: Date | string;
};

export type SimulatorMessageRow = {
  readonly id: string;
  readonly conversationId: string;
  readonly content: string;
  readonly senderType: SenderType;
  readonly timestamp: Date | string;
  readonly priority: MessagePriority;
  readonly status: MessageStatus;
  readonly cost: number;
};

export type SimulatorConversationUpdateRow = {
  readonly clientId: string;
  readonly conversationId: string;
  readonly lastMessageContent: string | null;
  readonly lastMessageAt: Date | string | null;
  readonly unreadCount: number;
};

export type SimulatorResponseResult = {
  readonly clientId: string;
  readonly message: SimulatorMessageRow;
  readonly conversation: SimulatorConversationUpdateRow;
};

@Injectable()
export class SimulatorRepository {
  constructor(private readonly database: DatabaseService) {}

  async markDeliveredClientMessagesRead(
    conversationId: string,
  ): Promise<readonly SimulatorStatusRow[]> {
    const messages = await this.database.db
      .updateTable('messages')
      .set({
        status: 'read',
        processed_at: new Date(),
      })
      .where('conversation_id', '=', conversationId)
      .where('sender_type', '=', 'client')
      .where('status', '=', 'delivered')
      .returning([
        'id as messageId',
        'conversation_id as conversationId',
        'status',
        'processed_at as occurredAt',
      ])
      .execute();

    return messages.map((message) => ({
      ...message,
      occurredAt: message.occurredAt ?? new Date(),
    }));
  }

  async createRecipientResponse(
    conversationId: string,
    content: string,
  ): Promise<SimulatorResponseResult> {
    return this.database.db.transaction().execute(async (trx) => {
      const message = await trx
        .insertInto('messages')
        .values({
          conversation_id: conversationId,
          sender_type: 'user',
          content,
          priority: 'normal',
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
          last_message_content: content,
          last_message_at: message.timestamp,
          unread_count: eb('unread_count', '+', 1),
          updated_at: message.timestamp,
        }))
        .where('id', '=', conversationId)
        .returning([
          'client_id as clientId',
          'id as conversationId',
          'last_message_content as lastMessageContent',
          'last_message_at as lastMessageAt',
          'unread_count as unreadCount',
        ])
        .executeTakeFirstOrThrow();

      return {
        clientId: conversation.clientId,
        message,
        conversation,
      };
    });
  }
}
