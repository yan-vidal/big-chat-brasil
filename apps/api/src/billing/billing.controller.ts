import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  CreatePixIntentRequestSchema,
  IdSchema,
  OnboardingRequestSchema,
  type BillingSummaryResponse,
  type CreatePixIntentRequest,
  type OnboardingRequest,
  type OnboardingResponse,
  type PaymentIntentResponse,
} from '@bcb/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BillingService, type ConfirmPixResponse } from './billing.service.js';
import { OnboardingGuard } from './onboarding.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import type { ClientJwtPayload } from './billing.types.js';

function badRequest(
  message: string,
  error: { issues: readonly { path: PropertyKey[]; message: string }[] },
) {
  return new BadRequestException({
    message,
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

function parseOnboardingRequest(body: unknown): OnboardingRequest {
  const result = OnboardingRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de onboarding invalido', result.error);
  }

  return result.data;
}

function parsePixIntentRequest(body: unknown): CreatePixIntentRequest {
  const result = CreatePixIntentRequestSchema.safeParse(body);
  if (!result.success) {
    throw badRequest('Payload de PIX invalido', result.error);
  }

  return result.data;
}

function parseId(value: string): string {
  const result = IdSchema.safeParse(value);
  if (!result.success) {
    throw badRequest('Identificador invalido', result.error);
  }

  return result.data;
}

function getClientPayload(request: AuthenticatedRequest): ClientJwtPayload {
  if (!request.auth?.clientId) {
    throw new UnauthorizedException('Sessao sem cliente autenticado');
  }

  return request.auth as ClientJwtPayload;
}

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('onboarding')
  completeOnboarding(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<OnboardingResponse> {
    return this.billingService.completeOnboarding(
      getClientPayload(request),
      parseOnboardingRequest(body),
    );
  }

  @Post('pix-intents')
  createPixIntent(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<PaymentIntentResponse> {
    return this.billingService.createPixIntent(
      getClientPayload(request).clientId,
      parsePixIntentRequest(body).amountCents,
    );
  }

  @Post('pix-intents/:id/confirm')
  confirmPixIntent(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ConfirmPixResponse> {
    return this.billingService.confirmPixIntent(getClientPayload(request).clientId, parseId(id));
  }

  @Get('me')
  @UseGuards(OnboardingGuard)
  getSummary(@Req() request: AuthenticatedRequest): Promise<BillingSummaryResponse> {
    return this.billingService.getSummary(getClientPayload(request).clientId);
  }
}
