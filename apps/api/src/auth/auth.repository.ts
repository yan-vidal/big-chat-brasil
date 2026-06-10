import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { AuthSessionRequest } from '@bcb/shared';
import type { AuthIdentity } from './auth.types.js';
import type { Kysely, Transaction } from 'kysely';
import type { Database } from '../database/database.types.js';

const NEW_CLIENT_NAME = 'Cliente BCB';

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findIdentityByDocument(documentId: string): Promise<AuthIdentity | undefined> {
    return this.selectIdentity().where('accounts.document_id', '=', documentId).executeTakeFirst();
  }

  async findIdentityByAccountId(accountId: string): Promise<AuthIdentity | undefined> {
    return this.selectIdentity().where('accounts.id', '=', accountId).executeTakeFirst();
  }

  async createClientIdentity(
    request: AuthSessionRequest,
    passwordHash: string,
  ): Promise<AuthIdentity> {
    return this.database.db.transaction().execute(async (transaction) => {
      const account = await transaction
        .insertInto('accounts')
        .values({
          document_id: request.documentId,
          document_type: request.documentType,
          password_hash: passwordHash,
          role: 'client',
          active: true,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      await transaction
        .insertInto('client_profiles')
        .values({
          account_id: account.id,
          name: NEW_CLIENT_NAME,
          plan_type: 'prepaid',
          onboarding_completed: false,
          balance_cents: 0,
          monthly_limit_cents: null,
          monthly_used_cents: 0,
          usage_month: null,
        })
        .execute();

      const identity = await this.selectIdentity(transaction)
        .where('accounts.id', '=', account.id)
        .executeTakeFirst();

      if (!identity) {
        throw new Error('Created auth identity could not be loaded');
      }

      return identity;
    });
  }

  private selectIdentity(db: Kysely<Database> | Transaction<Database> = this.database.db) {
    return db
      .selectFrom('accounts')
      .innerJoin('client_profiles', 'client_profiles.account_id', 'accounts.id')
      .select([
        'accounts.id as accountId',
        'accounts.document_id as documentId',
        'accounts.document_type as documentType',
        'accounts.password_hash as passwordHash',
        'accounts.role',
        'accounts.active',
        'client_profiles.id as clientId',
        'client_profiles.name',
        'client_profiles.plan_type as planType',
        'client_profiles.onboarding_completed as onboardingCompleted',
        'client_profiles.balance_cents as balanceCents',
        'client_profiles.monthly_limit_cents as monthlyLimitCents',
        'client_profiles.monthly_used_cents as monthlyUsedCents',
      ]);
  }
}
