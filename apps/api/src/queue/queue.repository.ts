import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { MessageStatus } from '@bcb/shared';
import type { RecoverableMessage } from './queue.types.js';

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

  async updateMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
    await this.database.db
      .updateTable('messages')
      .set({
        status,
        processed_at: new Date(),
      })
      .where('id', '=', messageId)
      .execute();
  }
}
