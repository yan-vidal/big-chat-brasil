import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, BillingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
