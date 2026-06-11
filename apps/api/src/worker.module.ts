import { Module } from '@nestjs/common';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [QueueModule],
})
export class WorkerModule {}
