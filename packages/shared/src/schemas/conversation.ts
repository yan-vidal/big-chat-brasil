import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common';

export const RecipientResponseSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});

export const ConversationResponseSchema = z.object({
  id: IdSchema,
  recipientId: IdSchema,
  recipientName: z.string().min(1),
  lastMessageContent: z.string().nullable(),
  lastMessageAt: IsoDateTimeSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
});

export const MarkConversationReadResponseSchema = z.object({
  conversationId: IdSchema,
  unreadCount: z.literal(0),
});

export type RecipientResponse = z.infer<typeof RecipientResponseSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
export type MarkConversationReadResponse = z.infer<typeof MarkConversationReadResponseSchema>;
