import { pathToFileURL } from 'node:url';
import type { Kysely } from 'kysely';
import { Migrator, NO_MIGRATIONS, type MigrationResultSet } from 'kysely/migration';
import { createDatabase } from './database.client.js';
import { StaticMigrationProvider } from './migrations.js';
import type { Database } from './database.types.js';

function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new StaticMigrationProvider(),
  });
}

function assertMigrationResult(result: MigrationResultSet): void {
  if (result.error) {
    throw result.error;
  }
}

export async function migrateToLatest(db: Kysely<Database>): Promise<MigrationResultSet> {
  const result = await createMigrator(db).migrateToLatest();
  assertMigrationResult(result);
  return result;
}

export async function rollbackLatest(db: Kysely<Database>): Promise<MigrationResultSet> {
  const result = await createMigrator(db).migrateDown();
  assertMigrationResult(result);
  return result;
}

export async function rollbackAll(db: Kysely<Database>): Promise<MigrationResultSet> {
  const result = await createMigrator(db).migrateTo(NO_MIGRATIONS);
  assertMigrationResult(result);
  return result;
}

async function runCli(): Promise<void> {
  const command = process.argv[2] ?? 'up';
  const db = createDatabase();

  try {
    if (command === 'up' || command === 'latest') {
      await migrateToLatest(db);
      return;
    }
    if (command === 'down') {
      await rollbackLatest(db);
      return;
    }
    if (command === 'reset') {
      await rollbackAll(db);
      await migrateToLatest(db);
      return;
    }

    throw new Error(`Unknown migration command: ${command}`);
  } finally {
    await db.destroy();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCli();
}
