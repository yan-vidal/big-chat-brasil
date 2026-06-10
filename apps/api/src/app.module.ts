import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { DatabaseModule } from './database/database.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RecipientsModule } from './recipients/recipients.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BillingModule,
    RecipientsModule,
    ConversationsModule,
    QueueModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
