import { z } from 'zod';

export const ROLE_VALUES = ['client', 'admin'] as const;
export const PLAN_TYPE_VALUES = ['prepaid', 'postpaid'] as const;
export const DOCUMENT_TYPE_VALUES = ['CPF', 'CNPJ'] as const;
export const MESSAGE_PRIORITY_VALUES = ['normal', 'urgent'] as const;
export const MESSAGE_STATUS_VALUES = [
  'queued',
  'processing',
  'sent',
  'delivered',
  'read',
  'failed',
] as const;
export const SENDER_TYPE_VALUES = ['client', 'user'] as const;
export const PAYMENT_INTENT_STATUS_VALUES = ['pending', 'confirmed'] as const;
export const PAYMENT_METHOD_VALUES = ['pix'] as const;
export const BILLING_TRANSACTION_TYPE_VALUES = ['credit', 'debit', 'usage', 'refund'] as const;

export const RoleSchema = z.enum(ROLE_VALUES);
export const PlanTypeSchema = z.enum(PLAN_TYPE_VALUES);
export const DocumentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES);
export const MessagePrioritySchema = z.enum(MESSAGE_PRIORITY_VALUES);
export const MessageStatusSchema = z.enum(MESSAGE_STATUS_VALUES);
export const SenderTypeSchema = z.enum(SENDER_TYPE_VALUES);
export const PaymentIntentStatusSchema = z.enum(PAYMENT_INTENT_STATUS_VALUES);
export const PaymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES);
export const BillingTransactionTypeSchema = z.enum(BILLING_TRANSACTION_TYPE_VALUES);

export type Role = z.infer<typeof RoleSchema>;
export type PlanType = z.infer<typeof PlanTypeSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type MessagePriority = z.infer<typeof MessagePrioritySchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type SenderType = z.infer<typeof SenderTypeSchema>;
export type PaymentIntentStatus = z.infer<typeof PaymentIntentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type BillingTransactionType = z.infer<typeof BillingTransactionTypeSchema>;
