import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ChatGateway } from './chat.gateway.js';
import { RealtimePublisher } from './realtime.publisher.js';
import { RealtimeRepository } from './realtime.repository.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  providers: [ChatGateway, RealtimePublisher, RealtimeRepository],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
