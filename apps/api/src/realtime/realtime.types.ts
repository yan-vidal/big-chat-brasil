import type { MessageResponse, MessageStatus, SenderType } from '@bcb/shared';

export const CHAT_NAMESPACE = '/chat';

export type MessageCreatedPayload = {
  readonly message: MessageResponse;
};

export type MessageStatusPayload = {
  readonly messageId: string;
  readonly conversationId: string;
  readonly status: MessageStatus;
  readonly occurredAt: string;
};

export type ConversationUpdatedPayload = {
  readonly conversationId: string;
  readonly lastMessageContent: string;
  readonly lastMessageAt: string;
  readonly unreadCount: number;
};

export type TypingPayload = {
  readonly conversationId: string;
  readonly senderType: SenderType;
};

export type RealtimeEventName =
  | 'message.created'
  | 'message.status'
  | 'conversation.updated'
  | 'typing.started'
  | 'typing.stopped';

export type RealtimeDomainEvent =
  | {
      readonly name: 'message.created';
      readonly clientId: string;
      readonly payload: MessageCreatedPayload;
    }
  | {
      readonly name: 'message.status';
      readonly clientId: string;
      readonly payload: MessageStatusPayload;
    }
  | {
      readonly name: 'conversation.updated';
      readonly clientId: string;
      readonly payload: ConversationUpdatedPayload;
    }
  | {
      readonly name: 'typing.started';
      readonly clientId: string;
      readonly payload: TypingPayload;
    }
  | {
      readonly name: 'typing.stopped';
      readonly clientId: string;
      readonly payload: TypingPayload;
    };

export function clientRoom(clientId: string): string {
  return `client:${clientId}`;
}

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}
