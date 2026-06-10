import { Injectable } from '@nestjs/common';
import {
  ESTIMATED_DELIVERY_SECONDS,
  MessageResponseSchema,
  MessageStatusResponseSchema,
  SendMessageResponseSchema,
  type MessageResponse,
  type MessageStatusResponse,
  type SendMessageRequest,
  type SendMessageResponse,
} from '@bcb/shared';
import { BillingService } from '../billing/billing.service.js';
import {
  ConversationNotFoundException,
  MessageNotFoundException,
  RecipientNotFoundException,
} from '../chat/chat.errors.js';
import { QueueService } from '../queue/queue.service.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import {
  MessagesRepository,
  type ConversationUpdateRow,
  type ConversationReference,
  type MessageRow,
} from './messages.repository.js';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly billingService: BillingService,
    private readonly queueService: QueueService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  async sendMessage(clientId: string, request: SendMessageRequest): Promise<SendMessageResponse> {
    const conversation = await this.resolveConversation(clientId, request);
    const charge = await this.billingService.chargeMessage({
      clientId,
      priority: request.priority,
      messageId: null,
    });

    try {
      const message = await this.messagesRepository.createClientMessage({
        conversationId: conversation.id,
        content: request.content,
        priority: request.priority,
        costCents: charge.chargedCents,
      });
      this.queueService.enqueue({ messageId: message.id, priority: message.priority });
      await this.publishMessageEvents(clientId, message);

      return SendMessageResponseSchema.parse({
        id: message.id,
        status: 'queued',
        timestamp: this.toIso(message.timestamp),
        estimatedDelivery: this.estimatedDelivery(message.timestamp),
        cost: message.cost,
        ...(charge.planType === 'prepaid' ? { currentBalance: charge.balanceCents } : {}),
      });
    } catch (error) {
      if (charge.planType === 'prepaid') {
        await this.billingService.refundPrepaid(clientId, charge.chargedCents, null);
      }

      throw error;
    }
  }

  async getMessage(clientId: string, messageId: string): Promise<MessageResponse> {
    const message = await this.messagesRepository.findMessageForClient(clientId, messageId);
    if (!message) {
      throw new MessageNotFoundException();
    }

    return this.toMessageResponse(message);
  }

  async getMessageStatus(clientId: string, messageId: string): Promise<MessageStatusResponse> {
    const messageStatus = await this.messagesRepository.findMessageStatusForClient(
      clientId,
      messageId,
    );
    if (!messageStatus) {
      throw new MessageNotFoundException();
    }

    return MessageStatusResponseSchema.parse({
      ...messageStatus,
      occurredAt: this.toIso(messageStatus.occurredAt),
    });
  }

  private async resolveConversation(
    clientId: string,
    request: SendMessageRequest,
  ): Promise<ConversationReference> {
    if (request.conversationId) {
      const conversation = await this.messagesRepository.findConversationForClient(
        clientId,
        request.conversationId,
      );
      if (!conversation) {
        throw new ConversationNotFoundException();
      }

      return conversation;
    }

    if (
      !request.recipientId ||
      !(await this.messagesRepository.findRecipient(request.recipientId))
    ) {
      throw new RecipientNotFoundException();
    }

    return this.messagesRepository.findOrCreateConversation(clientId, request.recipientId);
  }

  private toMessageResponse(message: MessageRow): MessageResponse {
    return MessageResponseSchema.parse({
      ...message,
      timestamp: this.toIso(message.timestamp),
    });
  }

  private async publishMessageEvents(clientId: string, message: MessageRow): Promise<void> {
    this.realtimePublisher.publishMessageCreated(clientId, {
      message: this.toMessageResponse(message),
    });

    const conversation = await this.messagesRepository.findConversationUpdate(
      clientId,
      message.conversationId,
    );

    if (conversation) {
      this.realtimePublisher.publishConversationUpdated(
        clientId,
        this.toConversationUpdatedPayload(conversation),
      );
    }
  }

  private toConversationUpdatedPayload(conversation: ConversationUpdateRow): {
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

  private estimatedDelivery(timestamp: Date | string): string {
    return new Date(
      this.toDate(timestamp).getTime() + ESTIMATED_DELIVERY_SECONDS * 1000,
    ).toISOString();
  }

  private toIso(value: Date | string): string {
    return this.toDate(value).toISOString();
  }

  private toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
