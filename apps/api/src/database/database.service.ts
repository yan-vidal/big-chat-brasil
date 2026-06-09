import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createDatabase } from './database.client.js';
import type { Database } from './database.types.js';
import type { Kysely } from 'kysely';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Kysely<Database> = createDatabase();

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }
}
