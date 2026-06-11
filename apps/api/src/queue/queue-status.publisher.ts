import { Logger } from '@nestjs/common';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { getQueueConfig, type QueueConfig } from './queue.config.js';
import type { QueueMessageStatusUpdate } from './queue.types.js';

export const QUEUE_STATUS_PUBLISHER = Symbol('QUEUE_STATUS_PUBLISHER');

export type QueueStatusPublisher = {
  publishMessageStatus(update: QueueMessageStatusUpdate): Promise<void>;
};

export class RealtimeQueueStatusPublisher implements QueueStatusPublisher {
  constructor(private readonly realtimePublisher: RealtimePublisher) {}

  async publishMessageStatus(update: QueueMessageStatusUpdate): Promise<void> {
    this.realtimePublisher.publishMessageStatus(update.clientId, {
      messageId: update.messageId,
      conversationId: update.conversationId,
      status: update.status,
      occurredAt: this.toIso(update.occurredAt),
    });
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}

export class HttpQueueStatusPublisher implements QueueStatusPublisher {
  private readonly logger = new Logger(HttpQueueStatusPublisher.name);

  constructor(private readonly config: QueueConfig = getQueueConfig()) {}

  async publishMessageStatus(update: QueueMessageStatusUpdate): Promise<void> {
    if (!this.config.internalApiToken) {
      throw new Error('INTERNAL_API_TOKEN is required when QUEUE_STATUS_PUBLISHER=http');
    }

    const response = await fetch(
      `${this.config.internalApiBaseUrl.replace(/\/$/, '')}/internal/realtime/message-status`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': this.config.internalApiToken,
        },
        body: JSON.stringify({
          clientId: update.clientId,
          messageId: update.messageId,
          conversationId: update.conversationId,
          status: update.status,
          occurredAt: this.toIso(update.occurredAt),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Internal realtime bridge failed with ${response.status}: ${body.slice(0, 200)}`,
      );
      throw new Error(`Internal realtime bridge failed with ${response.status}`);
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}

export function createQueueStatusPublisher(
  realtimePublisher: RealtimePublisher,
): QueueStatusPublisher {
  const config = getQueueConfig();

  if (config.statusPublisher === 'http') {
    return new HttpQueueStatusPublisher(config);
  }

  return new RealtimeQueueStatusPublisher(realtimePublisher);
}
