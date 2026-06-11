import { z } from 'zod';
import { LoginDocumentIdSchema, inferDocumentType } from '../documents.js';
import { DocumentTypeSchema, PlanTypeSchema, RoleSchema } from '../enums.js';
import { IdSchema, MoneyCentsSchema } from './common.js';

export const JwtPayloadSchema = z.object({
  sub: IdSchema,
  documentId: LoginDocumentIdSchema,
  documentType: DocumentTypeSchema,
  role: RoleSchema,
  clientId: IdSchema.optional(),
  requiresOnboarding: z.boolean(),
});

export const AuthSessionRequestSchema = z
  .object({
    documentId: LoginDocumentIdSchema,
    documentType: DocumentTypeSchema,
    password: z.string().min(1).max(72),
  })
  .superRefine((value, context) => {
    try {
      if (inferDocumentType(value.documentId) === value.documentType) {
        return;
      }

      context.addIssue({
        code: 'custom',
        path: ['documentType'],
        message: 'Tipo de documento não corresponde ao documento informado',
      });
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['documentId'],
        message: 'Documento deve ter 11 ou 14 dígitos',
      });
    }
  });

export const AuthenticatedClientSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).nullable(),
  documentId: LoginDocumentIdSchema,
  documentType: DocumentTypeSchema,
  role: RoleSchema,
  planType: PlanTypeSchema.nullable(),
  active: z.boolean(),
  onboardingCompleted: z.boolean(),
  balanceCents: MoneyCentsSchema.optional(),
  monthlyLimitCents: MoneyCentsSchema.optional(),
  monthlyUsedCents: MoneyCentsSchema.optional(),
});

export const AuthSessionResponseSchema = z.object({
  token: z.string().min(1),
  requiresOnboarding: z.boolean(),
  client: AuthenticatedClientSchema,
});

export const AuthMeResponseSchema = AuthenticatedClientSchema;

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export type AuthSessionRequest = z.infer<typeof AuthSessionRequestSchema>;
export type AuthenticatedClient = z.infer<typeof AuthenticatedClientSchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
