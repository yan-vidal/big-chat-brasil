import { Injectable } from '@nestjs/common';
import {
  ConversationResponseSchema,
  MarkConversationReadResponseSchema,
  MessageResponseSchema,
  type ConversationResponse,
  type MarkConversationReadResponse,
  type MessageResponse,
} from '@bcb/shared';
import { ConversationNotFoundException } from '../chat/chat.errors.js';
import { ConversationsRepository } from './conversations.repository.js';

@Injectable()
export class ConversationsService {
  constructor(private readonly conversationsRepository: ConversationsRepository) {}

  async listConversations(clientId: string): Promise<readonly ConversationResponse[]> {
    const conversations = await this.conversationsRepository.listConversations(clientId);

    return conversations.map((conversation) =>
      ConversationResponseSchema.parse({
        ...conversation,
        lastMessageAt: this.toIsoOrNull(conversation.lastMessageAt),
      }),
    );
  }

  async getConversation(clientId: string, conversationId: string): Promise<ConversationResponse> {
    const conversation = await this.conversationsRepository.findConversation(
      clientId,
      conversationId,
    );
    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    return ConversationResponseSchema.parse({
      ...conversation,
      lastMessageAt: this.toIsoOrNull(conversation.lastMessageAt),
    });
  }

  async listMessages(
    clientId: string,
    conversationId: string,
  ): Promise<readonly MessageResponse[]> {
    const conversation = await this.conversationsRepository.findConversation(
      clientId,
      conversationId,
    );
    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    const messages = await this.conversationsRepository.listMessages(clientId, conversationId);

    return messages.map((message) =>
      MessageResponseSchema.parse({
        ...message,
        timestamp: this.toIso(message.timestamp),
      }),
    );
  }

  async markRead(clientId: string, conversationId: string): Promise<MarkConversationReadResponse> {
    const result = await this.conversationsRepository.markConversationRead(
      clientId,
      conversationId,
    );
    if (!result) {
      throw new ConversationNotFoundException();
    }

    return MarkConversationReadResponseSchema.parse(result);
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private toIsoOrNull(value: Date | string | null): string | null {
    return value === null ? null : this.toIso(value);
  }
}
