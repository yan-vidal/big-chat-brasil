import { sql, type Kysely } from 'kysely';
import type { Database } from './database.types.js';

export async function resetDatabaseForTests(db: Kysely<Database>): Promise<void> {
  await sql`drop schema if exists public cascade`.execute(db);
  await sql`create schema public`.execute(db);
}
