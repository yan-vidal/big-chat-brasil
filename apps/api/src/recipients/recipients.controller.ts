import { Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { OnboardingGuard } from '../billing/onboarding.guard.js';
import { RecipientsService } from './recipients.service.js';
import type { RecipientResponse } from '@bcb/shared';

function getClientId(request: AuthenticatedRequest): string {
  const clientId = request.auth?.clientId;
  if (!clientId) {
    throw new UnauthorizedException('Sessao sem cliente autenticado');
  }

  return clientId;
}

@Controller('recipients')
@UseGuards(JwtAuthGuard, OnboardingGuard)
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  listRecipients(@Req() request: AuthenticatedRequest): Promise<readonly RecipientResponse[]> {
    return this.recipientsService.listRecipients(getClientId(request));
  }
}
