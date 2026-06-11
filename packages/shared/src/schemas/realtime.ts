import { z } from 'zod';
import { MessageStatusSchema, SenderTypeSchema } from '../enums.js';
import { IdSchema, IsoDateTimeSchema } from './common.js';
import { MessageResponseSchema } from './message.js';

export const MessageCreatedEventSchema = z.object({
  message: MessageResponseSchema,
});

export const MessageStatusEventSchema = z.object({
  messageId: IdSchema,
  conversationId: IdSchema,
  status: MessageStatusSchema,
  occurredAt: IsoDateTimeSchema,
});

export const ConversationUpdatedEventSchema = z.object({
  conversationId: IdSchema,
  lastMessageContent: z.string(),
  lastMessageAt: IsoDateTimeSchema,
  unreadCount: z.number().int().nonnegative(),
});

export const TypingEventSchema = z.object({
  conversationId: IdSchema,
  senderType: SenderTypeSchema,
});

export type MessageCreatedEvent = z.infer<typeof MessageCreatedEventSchema>;
export type MessageStatusEvent = z.infer<typeof MessageStatusEventSchema>;
export type ConversationUpdatedEvent = z.infer<typeof ConversationUpdatedEventSchema>;
export type TypingEvent = z.infer<typeof TypingEventSchema>;
