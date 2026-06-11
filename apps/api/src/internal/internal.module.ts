import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { InternalRealtimeController } from './internal-realtime.controller.js';
import { InternalTokenGuard } from './internal-token.guard.js';

@Module({
  imports: [RealtimeModule],
  controllers: [InternalRealtimeController],
  providers: [InternalTokenGuard],
})
export class InternalModule {}
