import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { RecipientResponse } from '@bcb/shared';

@Injectable()
export class RecipientsRepository {
  constructor(private readonly database: DatabaseService) {}

  async listRecipients(): Promise<readonly RecipientResponse[]> {
    return this.database.db
      .selectFrom('recipients')
      .select(['id', 'name'])
      .orderBy('name', 'asc')
      .execute();
  }
}
