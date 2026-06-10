import { Injectable } from '@nestjs/common';
import { sql, type Kysely, type Transaction } from 'kysely';
import { getMessageCostCents } from '@bcb/shared';
import { DatabaseService } from '../database/database.service.js';
import {
  BillingProfileNotFoundException,
  InsufficientBalanceException,
  InsufficientLimitException,
  InvalidBillingStateException,
  PaymentIntentAlreadyConfirmedException,
  PaymentIntentNotFoundException,
} from './billing.errors.js';
import type {
  BillingProfile,
  BillingTransactionRecord,
  ChargeMessageCommand,
  ChargeMessageResult,
  PaymentIntentRecord,
} from './billing.types.js';
import type { Database } from '../database/database.types.js';

type DatabaseExecutor = Kysely<Database> | Transaction<Database>;

type ConfirmedPixResult = {
  readonly intent: PaymentIntentRecord;
  readonly transaction: BillingTransactionRecord;
  readonly profile: BillingProfile;
};

@Injectable()
export class BillingRepository {
  constructor(private readonly database: DatabaseService) {}

  async findProfile(clientId: string): Promise<BillingProfile | undefined> {
    return this.selectProfile().where('id', '=', clientId).executeTakeFirst();
  }

  async completePrepaidOnboarding(clientId: string, name: string): Promise<BillingProfile> {
    const now = new Date();

    await this.database.db
      .updateTable('client_profiles')
      .set({
        name,
        plan_type: 'prepaid',
        onboarding_completed: false,
        balance_cents: 0,
        monthly_limit_cents: null,
        monthly_used_cents: 0,
        usage_month: null,
        updated_at: now,
      })
      .where('id', '=', clientId)
      .executeTakeFirstOrThrow();

    return this.findProfileOrThrow(clientId);
  }

  async completePostpaidOnboarding(
    clientId: string,
    name: string,
    monthlyLimitCents: number,
    usageMonth: string,
  ): Promise<BillingProfile> {
    const now = new Date();

    await this.database.db
      .updateTable('client_profiles')
      .set({
        name,
        plan_type: 'postpaid',
        onboarding_completed: true,
        balance_cents: 0,
        monthly_limit_cents: monthlyLimitCents,
        monthly_used_cents: 0,
        usage_month: usageMonth,
        updated_at: now,
      })
      .where('id', '=', clientId)
      .executeTakeFirstOrThrow();

    return this.findProfileOrThrow(clientId);
  }

  async createPixIntent(clientId: string, amountCents: number): Promise<PaymentIntentRecord> {
    const profile = await this.findProfileOrThrow(clientId);

    if (profile.planType !== 'prepaid') {
      throw new InvalidBillingStateException('PIX simulado esta disponivel apenas para pre-pago');
    }

    return this.database.db
      .insertInto('payment_intents')
      .values({
        client_id: clientId,
        method: 'pix',
        amount_cents: amountCents,
        status: 'pending',
        confirmed_at: null,
      })
      .returning([
        'id',
        'client_id as clientId',
        'method',
        'amount_cents as amountCents',
        'status',
        'confirmed_at as confirmedAt',
        'created_at as createdAt',
      ])
      .executeTakeFirstOrThrow();
  }

  async confirmPixIntent(clientId: string, intentId: string): Promise<ConfirmedPixResult> {
    return this.database.db.transaction().execute(async (transaction) => {
      const profile = await this.selectProfile(transaction)
        .where('id', '=', clientId)
        .executeTakeFirst();
      if (!profile) {
        throw new BillingProfileNotFoundException();
      }
      if (profile.planType !== 'prepaid') {
        throw new InvalidBillingStateException('PIX simulado esta disponivel apenas para pre-pago');
      }

      const intent = await this.selectPaymentIntent(transaction)
        .where('id', '=', intentId)
        .where('client_id', '=', clientId)
        .executeTakeFirst();
      if (!intent) {
        throw new PaymentIntentNotFoundException();
      }
      if (intent.status === 'confirmed') {
        throw new PaymentIntentAlreadyConfirmedException();
      }

      const confirmedAt = new Date();
      const confirmedIntent = await transaction
        .updateTable('payment_intents')
        .set({
          status: 'confirmed',
          confirmed_at: confirmedAt,
        })
        .where('id', '=', intentId)
        .where('client_id', '=', clientId)
        .where('status', '=', 'pending')
        .returning([
          'id',
          'client_id as clientId',
          'method',
          'amount_cents as amountCents',
          'status',
          'confirmed_at as confirmedAt',
          'created_at as createdAt',
        ])
        .executeTakeFirst();

      if (!confirmedIntent) {
        throw new PaymentIntentAlreadyConfirmedException();
      }

      await transaction
        .updateTable('client_profiles')
        .set((eb) => ({
          balance_cents: eb('balance_cents', '+', intent.amountCents),
          onboarding_completed: true,
          updated_at: confirmedAt,
        }))
        .where('id', '=', clientId)
        .executeTakeFirstOrThrow();

      const billingTransaction = await transaction
        .insertInto('billing_transactions')
        .values({
          client_id: clientId,
          type: 'credit',
          amount_cents: intent.amountCents,
          payment_intent_id: intentId,
          message_id: null,
        })
        .returning([
          'id',
          'type',
          'amount_cents as amountCents',
          'message_id as messageId',
          'payment_intent_id as paymentIntentId',
          'created_at as createdAt',
        ])
        .executeTakeFirstOrThrow();

      return {
        intent: confirmedIntent,
        transaction: billingTransaction,
        profile: await this.selectProfile(transaction)
          .where('id', '=', clientId)
          .executeTakeFirstOrThrow(),
      };
    });
  }

  async listTransactions(
    clientId: string,
    limit = 20,
  ): Promise<readonly BillingTransactionRecord[]> {
    return this.database.db
      .selectFrom('billing_transactions')
      .select([
        'id',
        'type',
        'amount_cents as amountCents',
        'message_id as messageId',
        'payment_intent_id as paymentIntentId',
        'created_at as createdAt',
      ])
      .where('client_id', '=', clientId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
  }

  async chargeMessage(
    command: ChargeMessageCommand,
    usageMonth: string,
  ): Promise<ChargeMessageResult> {
    return this.database.db.transaction().execute(async (transaction) => {
      const profile = await this.selectProfile(transaction)
        .where('id', '=', command.clientId)
        .executeTakeFirst();
      if (!profile) {
        throw new BillingProfileNotFoundException();
      }
      if (!profile.onboardingCompleted) {
        throw new InvalidBillingStateException('Cliente ainda nao concluiu onboarding');
      }

      const chargedCents = getMessageCostCents(command.priority);

      if (profile.planType === 'prepaid') {
        return this.debitPrepaid(transaction, command.clientId, chargedCents, command.messageId);
      }

      return this.consumePostpaid(
        transaction,
        command.clientId,
        chargedCents,
        command.messageId,
        usageMonth,
      );
    });
  }

  async refundPrepaid(
    clientId: string,
    amountCents: number,
    messageId: string | null,
  ): Promise<BillingProfile> {
    return this.database.db.transaction().execute(async (transaction) => {
      const profile = await this.selectProfile(transaction)
        .where('id', '=', clientId)
        .executeTakeFirst();
      if (!profile) {
        throw new BillingProfileNotFoundException();
      }
      if (profile.planType !== 'prepaid') {
        throw new InvalidBillingStateException('Estorno automatico so se aplica ao pre-pago');
      }

      await transaction
        .updateTable('client_profiles')
        .set((eb) => ({
          balance_cents: eb('balance_cents', '+', amountCents),
          updated_at: new Date(),
        }))
        .where('id', '=', clientId)
        .executeTakeFirstOrThrow();

      await transaction
        .insertInto('billing_transactions')
        .values({
          client_id: clientId,
          type: 'refund',
          amount_cents: amountCents,
          message_id: messageId,
          payment_intent_id: null,
        })
        .execute();

      return this.selectProfile(transaction).where('id', '=', clientId).executeTakeFirstOrThrow();
    });
  }

  private async debitPrepaid(
    transaction: Transaction<Database>,
    clientId: string,
    chargedCents: number,
    messageId: string | null,
  ): Promise<ChargeMessageResult> {
    const debited = await transaction
      .updateTable('client_profiles')
      .set((eb) => ({
        balance_cents: eb('balance_cents', '-', chargedCents),
        updated_at: new Date(),
      }))
      .where('id', '=', clientId)
      .where('plan_type', '=', 'prepaid')
      .where('balance_cents', '>=', chargedCents)
      .returning(['balance_cents as balanceCents'])
      .executeTakeFirst();

    if (!debited) {
      throw new InsufficientBalanceException();
    }

    await transaction
      .insertInto('billing_transactions')
      .values({
        client_id: clientId,
        type: 'debit',
        amount_cents: chargedCents,
        message_id: messageId,
        payment_intent_id: null,
      })
      .execute();

    return {
      planType: 'prepaid',
      chargedCents,
      balanceCents: debited.balanceCents,
    };
  }

  private async consumePostpaid(
    transaction: Transaction<Database>,
    clientId: string,
    chargedCents: number,
    messageId: string | null,
    usageMonth: string,
  ): Promise<ChargeMessageResult> {
    await transaction
      .updateTable('client_profiles')
      .set({
        monthly_used_cents: 0,
        usage_month: usageMonth,
        updated_at: new Date(),
      })
      .where('id', '=', clientId)
      .where('plan_type', '=', 'postpaid')
      .where((eb) => eb.or([eb('usage_month', 'is', null), eb('usage_month', '<>', usageMonth)]))
      .execute();

    const consumed = await transaction
      .updateTable('client_profiles')
      .set((eb) => ({
        monthly_used_cents: eb('monthly_used_cents', '+', chargedCents),
        updated_at: new Date(),
      }))
      .where('id', '=', clientId)
      .where('plan_type', '=', 'postpaid')
      .where(sql<boolean>`monthly_used_cents + ${chargedCents} <= monthly_limit_cents`)
      .returning([
        'monthly_limit_cents as monthlyLimitCents',
        'monthly_used_cents as monthlyUsedCents',
        'usage_month as usageMonth',
      ])
      .executeTakeFirst();

    if (!consumed || consumed.monthlyLimitCents === null || consumed.usageMonth === null) {
      throw new InsufficientLimitException();
    }

    await transaction
      .insertInto('billing_transactions')
      .values({
        client_id: clientId,
        type: 'usage',
        amount_cents: chargedCents,
        message_id: messageId,
        payment_intent_id: null,
      })
      .execute();

    return {
      planType: 'postpaid',
      chargedCents,
      monthlyLimitCents: consumed.monthlyLimitCents,
      monthlyUsedCents: consumed.monthlyUsedCents,
      remainingCents: consumed.monthlyLimitCents - consumed.monthlyUsedCents,
      usageMonth: consumed.usageMonth,
    };
  }

  private async findProfileOrThrow(clientId: string): Promise<BillingProfile> {
    const profile = await this.findProfile(clientId);
    if (!profile) {
      throw new BillingProfileNotFoundException();
    }

    return profile;
  }

  private selectProfile(db: DatabaseExecutor = this.database.db) {
    return db
      .selectFrom('client_profiles')
      .select([
        'id',
        'name',
        'plan_type as planType',
        'onboarding_completed as onboardingCompleted',
        'balance_cents as balanceCents',
        'monthly_limit_cents as monthlyLimitCents',
        'monthly_used_cents as monthlyUsedCents',
        'usage_month as usageMonth',
      ]);
  }

  private selectPaymentIntent(db: DatabaseExecutor = this.database.db) {
    return db
      .selectFrom('payment_intents')
      .select([
        'id',
        'client_id as clientId',
        'method',
        'amount_cents as amountCents',
        'status',
        'confirmed_at as confirmedAt',
        'created_at as createdAt',
      ]);
  }
}
