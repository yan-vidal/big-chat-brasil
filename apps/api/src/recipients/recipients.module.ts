import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { RecipientsController } from './recipients.controller.js';
import { RecipientsRepository } from './recipients.repository.js';
import { RecipientsService } from './recipients.service.js';

@Module({
  imports: [AuthModule, BillingModule, DatabaseModule],
  controllers: [RecipientsController],
  providers: [RecipientsRepository, RecipientsService],
  exports: [RecipientsService],
})
export class RecipientsModule {}
