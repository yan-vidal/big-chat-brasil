import { z } from 'zod';
import { DocumentIdSchema } from '../documents.js';
import { DocumentTypeSchema, PlanTypeSchema, RoleSchema } from '../enums.js';
import { IdSchema, MoneyCentsSchema, PositiveMoneyCentsSchema } from './common.js';

const NameSchema = z.string().trim().min(1).max(120);
const PasswordSchema = z.string().min(1).max(72);

export const AdminClientResponseSchema = z.object({
  id: IdSchema,
  accountId: IdSchema,
  name: z.string().min(1),
  documentId: z.string().min(1),
  documentType: DocumentTypeSchema,
  role: RoleSchema,
  active: z.boolean(),
  planType: PlanTypeSchema,
  onboardingCompleted: z.boolean(),
  balanceCents: MoneyCentsSchema,
  monthlyLimitCents: MoneyCentsSchema.optional(),
  monthlyUsedCents: MoneyCentsSchema,
  usageMonth: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const AdminClientListResponseSchema = z.array(AdminClientResponseSchema);

const StrictBaseCreateClientSchema = z
  .object({
    documentId: DocumentIdSchema,
    documentType: DocumentTypeSchema,
    password: PasswordSchema,
    name: NameSchema,
    active: z.boolean().optional(),
  })
  .strict();

export const AdminCreatePrepaidClientRequestSchema = StrictBaseCreateClientSchema.extend({
  planType: z.literal('prepaid'),
  initialBalanceCents: MoneyCentsSchema.optional(),
}).strict();

export const AdminCreatePostpaidClientRequestSchema = StrictBaseCreateClientSchema.extend({
  planType: z.literal('postpaid'),
  monthlyLimitCents: PositiveMoneyCentsSchema,
}).strict();

export const AdminCreateClientRequestSchema = z.discriminatedUnion('planType', [
  AdminCreatePrepaidClientRequestSchema,
  AdminCreatePostpaidClientRequestSchema,
]);

export const AdminUpdateClientStatusRequestSchema = z
  .object({
    active: z.boolean(),
  })
  .strict();

export const AdminAddCreditRequestSchema = z
  .object({
    amountCents: PositiveMoneyCentsSchema,
  })
  .strict();

export const AdminUpdateLimitRequestSchema = z
  .object({
    monthlyLimitCents: PositiveMoneyCentsSchema,
  })
  .strict();

export const AdminConvertToPrepaidRequestSchema = z
  .object({
    planType: z.literal('prepaid'),
    balanceCents: MoneyCentsSchema.optional(),
  })
  .strict();

export const AdminConvertToPostpaidRequestSchema = z
  .object({
    planType: z.literal('postpaid'),
    monthlyLimitCents: PositiveMoneyCentsSchema,
  })
  .strict();

export const AdminConvertPlanRequestSchema = z.discriminatedUnion('planType', [
  AdminConvertToPrepaidRequestSchema,
  AdminConvertToPostpaidRequestSchema,
]);

export type AdminClientResponse = z.infer<typeof AdminClientResponseSchema>;
export type AdminCreateClientRequest = z.infer<typeof AdminCreateClientRequestSchema>;
export type AdminUpdateClientStatusRequest = z.infer<typeof AdminUpdateClientStatusRequestSchema>;
export type AdminAddCreditRequest = z.infer<typeof AdminAddCreditRequestSchema>;
export type AdminUpdateLimitRequest = z.infer<typeof AdminUpdateLimitRequestSchema>;
export type AdminConvertPlanRequest = z.infer<typeof AdminConvertPlanRequestSchema>;
