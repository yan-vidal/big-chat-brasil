import { Injectable } from '@nestjs/common';
import {
  BillingSummaryResponseSchema,
  OnboardingResponseSchema,
  PaymentIntentResponseSchema,
  type BillingSummaryResponse,
  type OnboardingRequest,
  type OnboardingResponse,
  type PaymentIntentResponse,
} from '@bcb/shared';
import { AuthService } from '../auth/auth.service.js';
import { OnboardingRequiredException } from './billing.errors.js';
import { BillingRepository } from './billing.repository.js';
import type {
  BillingProfile,
  BillingTransactionRecord,
  ChargeMessageCommand,
  ChargeMessageResult,
  ClientJwtPayload,
  PaymentIntentRecord,
} from './billing.types.js';

export type ConfirmPixResponse = {
  readonly paymentIntent: PaymentIntentResponse;
  readonly balanceCents: number;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly authService: AuthService,
  ) {}

  async completeOnboarding(
    payload: ClientJwtPayload,
    request: OnboardingRequest,
  ): Promise<OnboardingResponse> {
    if (request.planType === 'prepaid') {
      await this.billingRepository.completePrepaidOnboarding(payload.clientId, request.name);
    } else {
      await this.billingRepository.completePostpaidOnboarding(
        payload.clientId,
        request.name,
        request.monthlyLimitCents,
        this.currentUsageMonth(),
      );
    }

    const client = await this.authService.getCurrentClient(payload);

    return OnboardingResponseSchema.parse({ client });
  }

  async createPixIntent(clientId: string, amountCents: number): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.billingRepository.createPixIntent(clientId, amountCents);

    return PaymentIntentResponseSchema.parse(this.toPaymentIntentResponse(paymentIntent));
  }

  async confirmPixIntent(clientId: string, intentId: string): Promise<ConfirmPixResponse> {
    const result = await this.billingRepository.confirmPixIntent(clientId, intentId);

    return {
      paymentIntent: PaymentIntentResponseSchema.parse(this.toPaymentIntentResponse(result.intent)),
      balanceCents: result.profile.balanceCents,
    };
  }

  async getSummary(clientId: string): Promise<BillingSummaryResponse> {
    const profile = await this.billingRepository.findProfile(clientId);
    if (!profile?.onboardingCompleted) {
      throw new OnboardingRequiredException();
    }

    const transactions = await this.billingRepository.listTransactions(clientId);
    const mappedTransactions = transactions.map((transaction) =>
      this.toTransactionResponse(transaction),
    );

    if (profile.planType === 'prepaid') {
      return BillingSummaryResponseSchema.parse({
        planType: 'prepaid',
        balanceCents: profile.balanceCents,
        transactions: mappedTransactions,
      });
    }

    const monthlyLimitCents = profile.monthlyLimitCents ?? 0;
    const monthlyUsedCents = profile.monthlyUsedCents;

    return BillingSummaryResponseSchema.parse({
      planType: 'postpaid',
      monthlyLimitCents,
      monthlyUsedCents,
      remainingCents: Math.max(0, monthlyLimitCents - monthlyUsedCents),
      usageMonth: profile.usageMonth ?? this.currentUsageMonth(),
      transactions: mappedTransactions,
    });
  }

  async isClientOnboarded(clientId: string): Promise<boolean> {
    const profile = await this.billingRepository.findProfile(clientId);

    return Boolean(profile?.onboardingCompleted);
  }

  async chargeMessage(command: ChargeMessageCommand): Promise<ChargeMessageResult> {
    return this.billingRepository.chargeMessage(command, this.currentUsageMonth());
  }

  async refundPrepaid(
    clientId: string,
    amountCents: number,
    messageId: string | null,
  ): Promise<BillingProfile> {
    return this.billingRepository.refundPrepaid(clientId, amountCents, messageId);
  }

  private currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private toPaymentIntentResponse(intent: PaymentIntentRecord): PaymentIntentResponse {
    return {
      id: intent.id,
      method: intent.method,
      amountCents: intent.amountCents,
      status: intent.status,
      confirmedAt: this.toIsoOrNull(intent.confirmedAt),
      createdAt: this.toIso(intent.createdAt),
    };
  }

  private toTransactionResponse(transaction: BillingTransactionRecord) {
    return {
      id: transaction.id,
      type: transaction.type,
      amountCents: transaction.amountCents,
      messageId: transaction.messageId,
      paymentIntentId: transaction.paymentIntentId,
      createdAt: this.toIso(transaction.createdAt),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private toIsoOrNull(value: Date | string | null): string | null {
    return value === null ? null : this.toIso(value);
  }
}
