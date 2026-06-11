import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { BillingController } from './billing.controller.js';
import { BillingRepository } from './billing.repository.js';
import { BillingService } from './billing.service.js';
import { OnboardingGuard } from './onboarding.guard.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BillingController],
  providers: [BillingRepository, BillingService, OnboardingGuard],
  exports: [BillingService, OnboardingGuard],
})
export class BillingModule {}
