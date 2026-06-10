import { Injectable } from '@nestjs/common';
import { RecipientResponseSchema, type RecipientResponse } from '@bcb/shared';
import { RecipientsRepository } from './recipients.repository.js';

@Injectable()
export class RecipientsService {
  constructor(private readonly recipientsRepository: RecipientsRepository) {}

  async listRecipients(clientId: string): Promise<readonly RecipientResponse[]> {
    const recipients = await this.recipientsRepository.listRecipients(clientId);

    return recipients.map((recipient) => RecipientResponseSchema.parse(recipient));
  }
}
