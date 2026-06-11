import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { getQueueConfig, type QueueConfig } from './queue.config.js';
import { QueueRepository } from './queue.repository.js';
import { QUEUE_STATUS_PUBLISHER, type QueueStatusPublisher } from './queue-status.publisher.js';
import type { QueueJob, QueueMessageStatusUpdate, QueueStatus } from './queue.types.js';

const URGENT_BEFORE_NORMAL_LIMIT = 3;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly config: QueueConfig = getQueueConfig();
  private readonly normalQueue: QueueJob[] = [];
  private readonly urgentQueue: QueueJob[] = [];
  private readonly trackedMessageIds = new Set<string>();
  private pollTimer: NodeJS.Timeout | undefined;
  private processing = false;
  private processedCount = 0;
  private failedCount = 0;
  private urgentStreak = 0;

  constructor(
    private readonly queueRepository: QueueRepository,
    @Inject(QUEUE_STATUS_PUBLISHER)
    private readonly statusPublisher: QueueStatusPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.processorEnabled) {
      this.logger.log('Queue processor disabled for this process');
      return;
    }

    await this.recoverPendingMessages();

    if (this.config.autostart) {
      this.kick();
    }

    if (this.config.pollIntervalMs > 0) {
      this.pollTimer = setInterval(() => {
        void this.pollPendingMessages();
      }, this.config.pollIntervalMs);
    }
  }

  onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  enqueue(job: QueueJob, options: { readonly startProcessing?: boolean } = {}): boolean {
    if (!this.config.processorEnabled) {
      return false;
    }

    if (this.trackedMessageIds.has(job.messageId)) {
      return false;
    }

    this.trackedMessageIds.add(job.messageId);
    const targetQueue = job.priority === 'urgent' ? this.urgentQueue : this.normalQueue;
    targetQueue.push(job);

    if (options.startProcessing ?? this.config.autostart) {
      this.kick();
    }

    return true;
  }

  getStatus(): QueueStatus {
    return {
      normalQueued: this.normalQueue.length,
      urgentQueued: this.urgentQueue.length,
      processing: this.processing,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    };
  }

  async processNextForTests(): Promise<boolean> {
    return this.processNext();
  }

  private kick(): void {
    if (!this.config.processorEnabled) {
      return;
    }

    if (this.processing) {
      return;
    }

    void this.processLoop();
  }

  private async processLoop(): Promise<void> {
    while (await this.processNext()) {
      // keep draining while autostart is enabled
    }
  }

  private async processNext(): Promise<boolean> {
    if (!this.config.processorEnabled) {
      return false;
    }

    if (this.processing) {
      return false;
    }

    const job = this.dequeueNext();
    if (!job) {
      return false;
    }

    this.processing = true;

    try {
      await this.updateAndPublishStatus(job.messageId, 'processing');
      await this.delay(this.config.sentDelayMs);
      await this.updateAndPublishStatus(job.messageId, 'sent');
      await this.delay(this.config.deliveredDelayMs);
      await this.updateAndPublishStatus(job.messageId, 'delivered');
      this.processedCount += 1;
    } catch (error) {
      this.failedCount += 1;
      await this.updateAndPublishStatus(job.messageId, 'failed');
      this.logger.error(`Failed processing message ${job.messageId}`, error);
    } finally {
      this.processing = false;
      this.trackedMessageIds.delete(job.messageId);
    }

    return true;
  }

  private async pollPendingMessages(): Promise<void> {
    try {
      const recoveredCount = await this.recoverPendingMessages();

      if (recoveredCount > 0 && this.config.autostart) {
        this.kick();
      }
    } catch (error) {
      this.logger.error('Failed polling pending queue messages', error);
    }
  }

  private async recoverPendingMessages(): Promise<number> {
    const recoverableMessages = await this.queueRepository.listRecoverableMessages();
    let recoveredCount = 0;

    for (const message of recoverableMessages) {
      if (this.enqueue(message, { startProcessing: false })) {
        recoveredCount += 1;
      }
    }

    if (recoveredCount > 0) {
      this.logger.log(`Recovered ${recoveredCount} pending messages`);
    }

    return recoveredCount;
  }

  private dequeueNext(): QueueJob | undefined {
    const mustGiveNormalTurn =
      this.urgentStreak >= URGENT_BEFORE_NORMAL_LIMIT && this.normalQueue.length > 0;

    if (!mustGiveNormalTurn && this.urgentQueue.length > 0) {
      this.urgentStreak += 1;
      return this.urgentQueue.shift();
    }

    if (this.normalQueue.length > 0) {
      this.urgentStreak = 0;
      return this.normalQueue.shift();
    }

    this.urgentStreak = 0;
    return this.urgentQueue.shift();
  }

  private async updateAndPublishStatus(
    messageId: string,
    status: QueueMessageStatusUpdate['status'],
  ): Promise<void> {
    const updated = await this.queueRepository.updateMessageStatus(messageId, status);

    if (!updated) {
      return;
    }

    await this.statusPublisher.publishMessageStatus(updated);
  }

  private async delay(durationMs: number): Promise<void> {
    if (durationMs === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
