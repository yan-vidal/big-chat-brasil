import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { getDatabaseUrl } from './database.config.js';
import type { Database } from './database.types.js';

export function createDatabase(databaseUrl = getDatabaseUrl()): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
      }),
    }),
  });
}
