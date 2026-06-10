import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { SimulatorRepository } from './simulator.repository.js';
import { SimulatorService } from './simulator.service.js';

@Module({
  imports: [DatabaseModule, RealtimeModule],
  providers: [SimulatorRepository, SimulatorService],
})
export class SimulatorModule {}
