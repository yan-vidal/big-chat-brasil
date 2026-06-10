import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { RecipientResponse } from '@bcb/shared';

@Injectable()
export class RecipientsRepository {
  constructor(private readonly database: DatabaseService) {}

  async listRecipients(clientId: string): Promise<readonly RecipientResponse[]> {
    return this.database.db
      .selectFrom('recipients')
      .leftJoin('client_profiles', 'client_profiles.id', 'recipients.client_profile_id')
      .leftJoin('accounts', 'accounts.id', 'client_profiles.account_id')
      .select(['recipients.id', 'recipients.name'])
      .where((eb) =>
        eb.or([
          eb('recipients.client_profile_id', 'is', null),
          eb.and([
            eb('recipients.client_profile_id', '<>', clientId),
            eb('client_profiles.onboarding_completed', '=', true),
            eb('accounts.active', '=', true),
          ]),
        ]),
      )
      .orderBy('name', 'asc')
      .execute();
  }
}
