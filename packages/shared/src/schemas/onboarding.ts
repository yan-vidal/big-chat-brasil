import { z } from 'zod';
import { AuthenticatedClientSchema } from './auth.js';
import { PositiveMoneyCentsSchema } from './common.js';

const ClientNameSchema = z.string().trim().min(1).max(120);

export const PrepaidOnboardingRequestSchema = z.object({
  name: ClientNameSchema,
  planType: z.literal('prepaid'),
});

export const PostpaidOnboardingRequestSchema = z.object({
  name: ClientNameSchema,
  planType: z.literal('postpaid'),
  monthlyLimitCents: PositiveMoneyCentsSchema,
});

export const OnboardingRequestSchema = z.discriminatedUnion('planType', [
  PrepaidOnboardingRequestSchema,
  PostpaidOnboardingRequestSchema,
]);

export const OnboardingResponseSchema = z.object({
  client: AuthenticatedClientSchema,
});

export type PrepaidOnboardingRequest = z.infer<typeof PrepaidOnboardingRequestSchema>;
export type PostpaidOnboardingRequest = z.infer<typeof PostpaidOnboardingRequestSchema>;
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>;
export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;
