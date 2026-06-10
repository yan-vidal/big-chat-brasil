import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { QueueController } from './queue.controller.js';
import { QueueRepository } from './queue.repository.js';
import { QueueService } from './queue.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, RealtimeModule],
  controllers: [QueueController],
  providers: [QueueRepository, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
