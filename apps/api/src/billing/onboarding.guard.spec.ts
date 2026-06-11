import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { OnboardingGuard } from './onboarding.guard.js';
import type { BillingService } from './billing.service.js';
import type { ExecutionContext } from '@nestjs/common';

function createContext(clientId?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        auth: clientId ? { clientId } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('OnboardingGuard', () => {
  it('allows clients with completed onboarding', async () => {
    const billingService = {
      isClientOnboarded: jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true),
    } as Pick<BillingService, 'isClientOnboarded'>;
    const guard = new OnboardingGuard(billingService as BillingService);

    await expect(guard.canActivate(createContext('client-1'))).resolves.toBe(true);
    expect(billingService.isClientOnboarded).toHaveBeenCalledWith('client-1');
  });

  it('rejects requests without authenticated client context', async () => {
    const guard = new OnboardingGuard({
      isClientOnboarded: jest.fn<Promise<boolean>, [string]>(),
    } as unknown as BillingService);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects clients that still require onboarding', async () => {
    const guard = new OnboardingGuard({
      isClientOnboarded: jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false),
    } as unknown as BillingService);

    await expect(guard.canActivate(createContext('client-2'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
