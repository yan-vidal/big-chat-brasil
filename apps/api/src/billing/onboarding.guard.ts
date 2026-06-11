import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { OnboardingRequiredException } from './billing.errors.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const clientId = request.auth?.clientId;

    if (!clientId) {
      throw new UnauthorizedException('Sessao sem cliente autenticado');
    }

    if (await this.billingService.isClientOnboarded(clientId)) {
      return true;
    }

    throw new OnboardingRequiredException();
  }
}
