import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { MessageResponseSchema } from '@bcb/shared';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { getSimulatorConfig, type SimulatorConfig } from './simulator.config.js';
import {
  SimulatorRepository,
  type SimulatorConversationUpdateRow,
  type SimulatorMessageRow,
} from './simulator.repository.js';
import type { Subscription } from 'rxjs';
import type { RealtimeDomainEvent } from '../realtime/realtime.types.js';
import type { MessageResponse } from '@bcb/shared';

const RESPONSES = [
  'Recebido, retorno em instantes.',
  'Obrigado pelo contato. Ja estou verificando.',
  'Certo, vou acompanhar por aqui.',
] as const;

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly config: SimulatorConfig = getSimulatorConfig();
  private subscription: Subscription | undefined;
  private responseIndex = 0;

  constructor(
    private readonly realtimePublisher: RealtimePublisher,
    private readonly simulatorRepository: SimulatorRepository,
  ) {}

  onModuleInit(): void {
    if (!this.config.enabled) {
      this.logger.log('Recipient simulator disabled');
      return;
    }

    this.subscription = this.realtimePublisher.events$.subscribe((event) => {
      if (event.name !== 'message.status' || event.payload.status !== 'delivered') {
        return;
      }

      void this.handleDeliveredMessage(event).catch((error: unknown) => {
        this.logger.error('Failed running recipient simulator', error);
      });
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async handleDeliveredMessage(
    event: Extract<RealtimeDomainEvent, { name: 'message.status' }>,
  ): Promise<void> {
    const shouldSimulate = await this.simulatorRepository.conversationUsesSimulatedRecipient(
      event.payload.conversationId,
    );

    if (!shouldSimulate) {
      return;
    }

    await this.delay(this.config.readDelayMs);

    const readMessages = await this.simulatorRepository.markDeliveredClientMessagesRead(
      event.payload.conversationId,
    );

    for (const message of readMessages) {
      this.realtimePublisher.publishMessageStatus(event.clientId, {
        messageId: message.messageId,
        conversationId: message.conversationId,
        status: message.status,
        occurredAt: this.toIso(message.occurredAt),
      });
    }

    this.realtimePublisher.publishTypingStarted(event.clientId, {
      conversationId: event.payload.conversationId,
      senderType: 'user',
    });
    await this.delay(this.config.typingMs);

    const response = await this.simulatorRepository.createRecipientResponse(
      event.payload.conversationId,
      this.nextResponse(),
    );

    this.realtimePublisher.publishTypingStopped(response.clientId, {
      conversationId: response.conversation.conversationId,
      senderType: 'user',
    });
    this.realtimePublisher.publishMessageCreated(response.clientId, {
      message: this.toMessageResponse(response.message),
    });
    this.realtimePublisher.publishConversationUpdated(
      response.clientId,
      this.toConversationUpdatedPayload(response.conversation),
    );
  }

  private nextResponse(): string {
    const response = RESPONSES[this.responseIndex % RESPONSES.length];
    this.responseIndex += 1;

    return response;
  }

  private toMessageResponse(message: SimulatorMessageRow): MessageResponse {
    return MessageResponseSchema.parse({
      ...message,
      timestamp: this.toIso(message.timestamp),
    });
  }

  private toConversationUpdatedPayload(conversation: SimulatorConversationUpdateRow): {
    readonly conversationId: string;
    readonly lastMessageContent: string;
    readonly lastMessageAt: string;
    readonly unreadCount: number;
  } {
    return {
      conversationId: conversation.conversationId,
      lastMessageContent: conversation.lastMessageContent ?? '',
      lastMessageAt: this.toIso(conversation.lastMessageAt ?? new Date()),
      unreadCount: conversation.unreadCount,
    };
  }

  private async delay(durationMs: number): Promise<void> {
    if (durationMs === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}
