import { Injectable } from '@nestjs/common';
import { RecipientResponseSchema, type RecipientResponse } from '@bcb/shared';
import { RecipientsRepository } from './recipients.repository.js';

@Injectable()
export class RecipientsService {
  constructor(private readonly recipientsRepository: RecipientsRepository) {}

  async listRecipients(): Promise<readonly RecipientResponse[]> {
    const recipients = await this.recipientsRepository.listRecipients();

    return recipients.map((recipient) => RecipientResponseSchema.parse(recipient));
  }
}
