import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class RealtimeRepository {
  constructor(private readonly database: DatabaseService) {}

  async clientCanAccessConversation(clientId: string, conversationId: string): Promise<boolean> {
    const row = await this.database.db
      .selectFrom('conversations')
      .select(['id'])
      .where('id', '=', conversationId)
      .where('client_id', '=', clientId)
      .executeTakeFirst();

    return row !== undefined;
  }
}
