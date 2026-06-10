import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OnboardingGuard } from '../billing/onboarding.guard.js';
import { RecipientsService } from './recipients.service.js';
import type { RecipientResponse } from '@bcb/shared';

@Controller('recipients')
@UseGuards(JwtAuthGuard, OnboardingGuard)
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  listRecipients(): Promise<readonly RecipientResponse[]> {
    return this.recipientsService.listRecipients();
  }
}
