import type { MessagePriority } from '@bcb/shared';

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
