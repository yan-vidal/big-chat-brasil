import type {
  BillingTransactionType,
  JwtPayload,
  MessagePriority,
  PaymentIntentStatus,
  PlanType,
} from '@bcb/shared';

export type ClientJwtPayload = JwtPayload & { readonly clientId: string };

export type BillingProfile = {
  readonly id: string;
  readonly name: string;
  readonly planType: PlanType;
  readonly onboardingCompleted: boolean;
  readonly balanceCents: number;
  readonly monthlyLimitCents: number | null;
  readonly monthlyUsedCents: number;
  readonly usageMonth: string | null;
};

export type PaymentIntentRecord = {
  readonly id: string;
  readonly clientId: string;
  readonly method: 'pix';
  readonly amountCents: number;
  readonly status: PaymentIntentStatus;
  readonly confirmedAt: Date | string | null;
  readonly createdAt: Date | string;
};

export type BillingTransactionRecord = {
  readonly id: string;
  readonly type: BillingTransactionType;
  readonly amountCents: number;
  readonly messageId: string | null;
  readonly paymentIntentId: string | null;
  readonly createdAt: Date | string;
};

export type ChargeMessageCommand = {
  readonly clientId: string;
  readonly priority: MessagePriority;
  readonly messageId: string | null;
};

export type PrepaidChargeResult = {
  readonly planType: 'prepaid';
  readonly chargedCents: number;
  readonly balanceCents: number;
};

export type PostpaidChargeResult = {
  readonly planType: 'postpaid';
  readonly chargedCents: number;
  readonly monthlyLimitCents: number;
  readonly monthlyUsedCents: number;
  readonly remainingCents: number;
  readonly usageMonth: string;
};

export type ChargeMessageResult = PrepaidChargeResult | PostpaidChargeResult;
