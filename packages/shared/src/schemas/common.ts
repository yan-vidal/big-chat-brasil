import { z } from 'zod';

export const IdSchema = z.uuid();
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const MoneyCentsSchema = z.number().int().nonnegative();
export const PositiveMoneyCentsSchema = z.number().int().positive();
export const UsageMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
