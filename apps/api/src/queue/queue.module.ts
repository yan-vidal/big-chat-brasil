import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { QueueController } from './queue.controller.js';
import { QueueRepository } from './queue.repository.js';
import { QueueService } from './queue.service.js';
import { createQueueStatusPublisher, QUEUE_STATUS_PUBLISHER } from './queue-status.publisher.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';

@Module({
  imports: [AuthModule, DatabaseModule, RealtimeModule],
  controllers: [QueueController],
  providers: [
    QueueRepository,
    {
      provide: QUEUE_STATUS_PUBLISHER,
      useFactory: createQueueStatusPublisher,
      inject: [RealtimePublisher],
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
