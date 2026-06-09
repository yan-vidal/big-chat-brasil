import { z } from 'zod';
import {
  BillingTransactionTypeSchema,
  PaymentIntentStatusSchema,
  PaymentMethodSchema,
} from '../enums.js';
import {
  IdSchema,
  IsoDateTimeSchema,
  MoneyCentsSchema,
  PositiveMoneyCentsSchema,
  UsageMonthSchema,
} from './common.js';

export const BillingTransactionResponseSchema = z.object({
  id: IdSchema,
  type: BillingTransactionTypeSchema,
  amountCents: z.number().int(),
  messageId: IdSchema.nullable(),
  paymentIntentId: IdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const CreatePixIntentRequestSchema = z.object({
  amountCents: PositiveMoneyCentsSchema,
});

export const PaymentIntentResponseSchema = z.object({
  id: IdSchema,
  method: PaymentMethodSchema,
  amountCents: PositiveMoneyCentsSchema,
  status: PaymentIntentStatusSchema,
  confirmedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

const BillingTransactionsSchema = z.array(BillingTransactionResponseSchema);

export const PrepaidBillingSummaryResponseSchema = z.object({
  planType: z.literal('prepaid'),
  balanceCents: MoneyCentsSchema,
  transactions: BillingTransactionsSchema,
});

export const PostpaidBillingSummaryResponseSchema = z.object({
  planType: z.literal('postpaid'),
  monthlyLimitCents: MoneyCentsSchema,
  monthlyUsedCents: MoneyCentsSchema,
  remainingCents: MoneyCentsSchema,
  usageMonth: UsageMonthSchema,
  transactions: BillingTransactionsSchema,
});

export const BillingSummaryResponseSchema = z.discriminatedUnion('planType', [
  PrepaidBillingSummaryResponseSchema,
  PostpaidBillingSummaryResponseSchema,
]);

export type BillingTransactionResponse = z.infer<typeof BillingTransactionResponseSchema>;
export type CreatePixIntentRequest = z.infer<typeof CreatePixIntentRequestSchema>;
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;
export type PrepaidBillingSummaryResponse = z.infer<typeof PrepaidBillingSummaryResponseSchema>;
export type PostpaidBillingSummaryResponse = z.infer<typeof PostpaidBillingSummaryResponseSchema>;
export type BillingSummaryResponse = z.infer<typeof BillingSummaryResponseSchema>;
