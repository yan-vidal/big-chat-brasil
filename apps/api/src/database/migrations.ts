import { initialSchemaMigration } from '../../migrations/001_initial_schema.js';
import type { Migration, MigrationProvider } from 'kysely/migration';

const migrations: Record<string, Migration> = {
  '001_initial_schema': initialSchemaMigration,
};

export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations;
  }
}
