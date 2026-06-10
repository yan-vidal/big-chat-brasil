import type { MessagePriority, MessageStatus } from '@bcb/shared';

export type QueueJob = {
  readonly messageId: string;
  readonly priority: MessagePriority;
};

export type RecoverableMessage = QueueJob & {
  readonly createdAt: Date | string;
};

export type QueueStatus = {
  readonly normalQueued: number;
  readonly urgentQueued: number;
  readonly processing: boolean;
  readonly processedCount: number;
  readonly failedCount: number;
};

export type QueueMessageStatusUpdate = {
  readonly clientId: string;
  readonly messageId: string;
  readonly conversationId: string;
  readonly status: MessageStatus;
  readonly occurredAt: Date | string;
};
