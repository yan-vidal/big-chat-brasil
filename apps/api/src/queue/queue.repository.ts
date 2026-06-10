import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { MessageStatus } from '@bcb/shared';
import type { QueueMessageStatusUpdate, RecoverableMessage } from './queue.types.js';

@Injectable()
export class QueueRepository {
  constructor(private readonly database: DatabaseService) {}

  async listRecoverableMessages(): Promise<readonly RecoverableMessage[]> {
    return this.database.db
      .selectFrom('messages')
      .select(['id as messageId', 'priority', 'created_at as createdAt'])
      .where('status', 'in', ['queued', 'processing'])
      .orderBy('created_at', 'asc')
      .execute();
  }

  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
  ): Promise<QueueMessageStatusUpdate | undefined> {
    const updated = await this.database.db
      .updateTable('messages')
      .set({
        status,
        processed_at: new Date(),
      })
      .where('id', '=', messageId)
      .returning([
        'id as messageId',
        'conversation_id as conversationId',
        'status',
        'processed_at as occurredAt',
      ])
      .executeTakeFirst();

    if (!updated) {
      return undefined;
    }

    const conversation = await this.database.db
      .selectFrom('conversations')
      .select(['client_id as clientId'])
      .where('id', '=', updated.conversationId)
      .executeTakeFirst();

    return conversation
      ? {
          clientId: conversation.clientId,
          messageId: updated.messageId,
          conversationId: updated.conversationId,
          status: updated.status,
          occurredAt: updated.occurredAt ?? new Date(),
        }
      : undefined;
  }
}
