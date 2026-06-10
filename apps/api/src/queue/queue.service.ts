import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { getQueueConfig, type QueueConfig } from './queue.config.js';
import { QueueRepository } from './queue.repository.js';
import type { QueueJob, QueueStatus } from './queue.types.js';

const URGENT_BEFORE_NORMAL_LIMIT = 3;

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly config: QueueConfig = getQueueConfig();
  private readonly normalQueue: QueueJob[] = [];
  private readonly urgentQueue: QueueJob[] = [];
  private processing = false;
  private processedCount = 0;
  private failedCount = 0;
  private urgentStreak = 0;

  constructor(private readonly queueRepository: QueueRepository) {}

  async onModuleInit(): Promise<void> {
    const recoverableMessages = await this.queueRepository.listRecoverableMessages();

    for (const message of recoverableMessages) {
      this.enqueue(message, { startProcessing: false });
    }

    if (recoverableMessages.length > 0) {
      this.logger.log(`Recovered ${recoverableMessages.length} pending messages`);
    }

    if (this.config.autostart) {
      this.kick();
    }
  }

  enqueue(job: QueueJob, options: { readonly startProcessing?: boolean } = {}): void {
    const targetQueue = job.priority === 'urgent' ? this.urgentQueue : this.normalQueue;
    targetQueue.push(job);

    if (options.startProcessing ?? this.config.autostart) {
      this.kick();
    }
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
    if (this.processing) {
      return false;
    }

    const job = this.dequeueNext();
    if (!job) {
      return false;
    }

    this.processing = true;

    try {
      await this.queueRepository.updateMessageStatus(job.messageId, 'processing');
      await this.delay(this.config.sentDelayMs);
      await this.queueRepository.updateMessageStatus(job.messageId, 'sent');
      await this.delay(this.config.deliveredDelayMs);
      await this.queueRepository.updateMessageStatus(job.messageId, 'delivered');
      this.processedCount += 1;
    } catch (error) {
      this.failedCount += 1;
      await this.queueRepository.updateMessageStatus(job.messageId, 'failed');
      this.logger.error(`Failed processing message ${job.messageId}`, error);
    } finally {
      this.processing = false;
    }

    return true;
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

  private async delay(durationMs: number): Promise<void> {
    if (durationMs === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
