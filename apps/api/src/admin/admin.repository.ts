import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import type {
  AdminAddCreditRequest,
  AdminClientResponse,
  AdminConvertPlanRequest,
  AdminCreateClientRequest,
  AdminUpdateClientStatusRequest,
  AdminUpdateLimitRequest,
} from '@bcb/shared';
import { ADMIN_DOCUMENT_ID } from '@bcb/shared';
import { AUTH_PASSWORD_SALT_ROUNDS } from '../auth/auth.config.js';
import { DatabaseService } from '../database/database.service.js';
import type { Database } from '../database/database.types.js';
import type { Kysely, Transaction } from 'kysely';

type DatabaseExecutor = Kysely<Database> | Transaction<Database>;

type AdminClientRow = Omit<AdminClientResponse, 'createdAt' | 'updatedAt' | 'monthlyLimitCents'> & {
  readonly monthlyLimitCents: number | null;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
};

@Injectable()
export class AdminRepository {
  constructor(private readonly database: DatabaseService) {}

  async listClients(): Promise<readonly AdminClientRow[]> {
    return this.selectAdminClient().orderBy('client_profiles.created_at', 'asc').execute();
  }

  async findClient(clientId: string): Promise<AdminClientRow | undefined> {
    return this.selectAdminClient().where('client_profiles.id', '=', clientId).executeTakeFirst();
  }

  async createClient(input: AdminCreateClientRequest): Promise<AdminClientRow> {
    const existing = await this.database.db
      .selectFrom('accounts')
      .select(['id'])
      .where('document_id', '=', input.documentId)
      .executeTakeFirst();

    if (existing || input.documentId === ADMIN_DOCUMENT_ID) {
      throw new ConflictException({
        code: 'CLIENT_ALREADY_EXISTS',
        message: 'Cliente ja cadastrado',
      });
    }

    return this.database.db.transaction().execute(async (transaction) => {
      const account = await transaction
        .insertInto('accounts')
        .values({
          document_id: input.documentId,
          document_type: input.documentType,
          password_hash: await hash(input.password, AUTH_PASSWORD_SALT_ROUNDS),
          role: 'client',
          active: input.active ?? true,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      const profile = await transaction
        .insertInto('client_profiles')
        .values({
          account_id: account.id,
          name: input.name,
          plan_type: input.planType,
          onboarding_completed: true,
          balance_cents: input.planType === 'prepaid' ? (input.initialBalanceCents ?? 0) : 0,
          monthly_limit_cents: input.planType === 'postpaid' ? input.monthlyLimitCents : null,
          monthly_used_cents: 0,
          usage_month: input.planType === 'postpaid' ? this.currentUsageMonth() : null,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      await this.upsertAccountRecipient(transaction, profile.id, input.name);

      if (input.planType === 'prepaid' && (input.initialBalanceCents ?? 0) > 0) {
        await this.insertAdjustment(transaction, profile.id, input.initialBalanceCents ?? 0);
      }

      return this.findClientIn(transaction, profile.id);
    });
  }

  async updateStatus(
    clientId: string,
    input: AdminUpdateClientStatusRequest,
  ): Promise<AdminClientRow> {
    return this.database.db.transaction().execute(async (transaction) => {
      const client = await this.findManagedClientIn(transaction, clientId);

      await transaction
        .updateTable('accounts')
        .set({ active: input.active, updated_at: new Date() })
        .where('id', '=', client.accountId)
        .executeTakeFirstOrThrow();

      return this.findClientIn(transaction, clientId);
    });
  }

  async addPrepaidCredit(clientId: string, input: AdminAddCreditRequest): Promise<AdminClientRow> {
    return this.database.db.transaction().execute(async (transaction) => {
      const client = await this.findManagedClientIn(transaction, clientId);
      if (client.planType !== 'prepaid') {
        throw new ConflictException({
          code: 'INVALID_PLAN',
          message: 'Credito manual esta disponivel apenas para pre-pago',
        });
      }

      await transaction
        .updateTable('client_profiles')
        .set((eb) => ({
          balance_cents: eb('balance_cents', '+', input.amountCents),
          updated_at: new Date(),
        }))
        .where('id', '=', clientId)
        .executeTakeFirstOrThrow();
      await this.insertAdjustment(transaction, clientId, input.amountCents);

      return this.findClientIn(transaction, clientId);
    });
  }

  async updatePostpaidLimit(
    clientId: string,
    input: AdminUpdateLimitRequest,
  ): Promise<AdminClientRow> {
    return this.database.db.transaction().execute(async (transaction) => {
      const client = await this.findManagedClientIn(transaction, clientId);
      if (client.planType !== 'postpaid') {
        throw new ConflictException({
          code: 'INVALID_PLAN',
          message: 'Limite mensal esta disponivel apenas para pos-pago',
        });
      }

      await transaction
        .updateTable('client_profiles')
        .set({
          monthly_limit_cents: input.monthlyLimitCents,
          updated_at: new Date(),
        })
        .where('id', '=', clientId)
        .executeTakeFirstOrThrow();
      await this.insertAdjustment(transaction, clientId, input.monthlyLimitCents);

      return this.findClientIn(transaction, clientId);
    });
  }

  async convertPlan(clientId: string, input: AdminConvertPlanRequest): Promise<AdminClientRow> {
    return this.database.db.transaction().execute(async (transaction) => {
      const client = await this.findManagedClientIn(transaction, clientId);

      if (input.planType === 'prepaid') {
        await transaction
          .updateTable('client_profiles')
          .set({
            plan_type: 'prepaid',
            onboarding_completed: true,
            balance_cents: input.balanceCents ?? 0,
            monthly_limit_cents: null,
            monthly_used_cents: 0,
            usage_month: null,
            updated_at: new Date(),
          })
          .where('id', '=', clientId)
          .executeTakeFirstOrThrow();

        if ((input.balanceCents ?? 0) > 0) {
          await this.insertAdjustment(transaction, clientId, input.balanceCents ?? 0);
        }
      } else {
        await transaction
          .updateTable('client_profiles')
          .set({
            plan_type: 'postpaid',
            onboarding_completed: true,
            balance_cents: 0,
            monthly_limit_cents: input.monthlyLimitCents,
            monthly_used_cents: 0,
            usage_month: this.currentUsageMonth(),
            updated_at: new Date(),
          })
          .where('id', '=', clientId)
          .executeTakeFirstOrThrow();

        if (client.balanceCents > 0) {
          await this.insertAdjustment(transaction, clientId, client.balanceCents);
        }
      }

      return this.findClientIn(transaction, clientId);
    });
  }

  private selectAdminClient(db: DatabaseExecutor = this.database.db) {
    return db
      .selectFrom('client_profiles')
      .innerJoin('accounts', 'accounts.id', 'client_profiles.account_id')
      .select([
        'client_profiles.id',
        'accounts.id as accountId',
        'client_profiles.name',
        'accounts.document_id as documentId',
        'accounts.document_type as documentType',
        'accounts.role',
        'accounts.active',
        'client_profiles.plan_type as planType',
        'client_profiles.onboarding_completed as onboardingCompleted',
        'client_profiles.balance_cents as balanceCents',
        'client_profiles.monthly_limit_cents as monthlyLimitCents',
        'client_profiles.monthly_used_cents as monthlyUsedCents',
        'client_profiles.usage_month as usageMonth',
        'client_profiles.created_at as createdAt',
        'client_profiles.updated_at as updatedAt',
      ]);
  }

  private async findClientIn(db: DatabaseExecutor, clientId: string): Promise<AdminClientRow> {
    const client = await this.selectAdminClient(db)
      .where('client_profiles.id', '=', clientId)
      .executeTakeFirst();

    if (!client) {
      throw new NotFoundException({
        code: 'CLIENT_NOT_FOUND',
        message: 'Cliente nao encontrado',
      });
    }

    return client;
  }

  private async findManagedClientIn(
    db: DatabaseExecutor,
    clientId: string,
  ): Promise<AdminClientRow> {
    const client = await this.findClientIn(db, clientId);

    if (client.role !== 'client') {
      throw new ConflictException({
        code: 'ADMIN_ACCOUNT_IMMUTABLE',
        message: 'A conta administradora padrao nao pode ser gerenciada por este endpoint',
      });
    }

    return client;
  }

  private async upsertAccountRecipient(
    db: DatabaseExecutor,
    clientId: string,
    name: string,
  ): Promise<void> {
    await db
      .insertInto('recipients')
      .values({ name, client_profile_id: clientId })
      .onConflict((oc) => oc.column('client_profile_id').doUpdateSet({ name }))
      .execute();
  }

  private async insertAdjustment(
    db: DatabaseExecutor,
    clientId: string,
    amountCents: number,
  ): Promise<void> {
    await db
      .insertInto('billing_transactions')
      .values({
        client_id: clientId,
        type: 'adjustment',
        amount_cents: amountCents,
        message_id: null,
        payment_intent_id: null,
      })
      .execute();
  }

  private currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }
}
