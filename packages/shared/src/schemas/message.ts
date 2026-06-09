import { z } from 'zod';
import { MessagePrioritySchema, MessageStatusSchema, SenderTypeSchema } from '../enums.js';
import { IdSchema, IsoDateTimeSchema, MoneyCentsSchema } from './common.js';

export const SendMessageRequestSchema = z
  .object({
    conversationId: IdSchema.optional(),
    recipientId: IdSchema.optional(),
    content: z.string().trim().min(1).max(2000),
    priority: MessagePrioritySchema,
  })
  .refine((value) => value.conversationId || value.recipientId, {
    message: 'conversationId ou recipientId é obrigatório',
  });

export const SendMessageResponseSchema = z.object({
  id: IdSchema,
  status: z.literal('queued'),
  timestamp: IsoDateTimeSchema,
  estimatedDelivery: IsoDateTimeSchema,
  cost: MoneyCentsSchema,
  currentBalance: MoneyCentsSchema.optional(),
});

export const MessageResponseSchema = z.object({
  id: IdSchema,
  conversationId: IdSchema,
  content: z.string(),
  senderType: SenderTypeSchema,
  timestamp: IsoDateTimeSchema,
  priority: MessagePrioritySchema,
  status: MessageStatusSchema,
  cost: MoneyCentsSchema,
});

export const MessageStatusResponseSchema = z.object({
  messageId: IdSchema,
  conversationId: IdSchema,
  status: MessageStatusSchema,
  occurredAt: IsoDateTimeSchema,
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type MessageStatusResponse = z.infer<typeof MessageStatusResponseSchema>;
