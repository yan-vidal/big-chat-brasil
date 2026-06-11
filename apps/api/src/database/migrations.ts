import { initialSchemaMigration } from '../../migrations/001_initial_schema.js';
import { accountRecipientsMigration } from '../../migrations/002_account_recipients.js';
import { billingAdjustmentsMigration } from '../../migrations/003_billing_adjustments.js';
import type { Migration, MigrationProvider } from 'kysely/migration';

const migrations: Record<string, Migration> = {
  '001_initial_schema': initialSchemaMigration,
  '002_account_recipients': accountRecipientsMigration,
  '003_billing_adjustments': billingAdjustmentsMigration,
};

export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations;
  }
}
