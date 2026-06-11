import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IdSchema, type ConversationResponse, type MessageResponse } from '@bcb/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OnboardingGuard } from '../billing/onboarding.guard.js';
import { ValidationErrorException } from '../chat/chat.errors.js';
import { ConversationsService } from './conversations.service.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';

function getClientId(request: AuthenticatedRequest): string {
  const clientId = request.auth?.clientId;
  if (!clientId) {
    throw new UnauthorizedException('Sessao sem cliente autenticado');
  }

  return clientId;
}

function parseId(value: string): string {
  const result = IdSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationErrorException('Identificador invalido', result.error.issues);
  }

  return result.data;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard, OnboardingGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listConversations(
    @Req() request: AuthenticatedRequest,
  ): Promise<readonly ConversationResponse[]> {
    return this.conversationsService.listConversations(getClientId(request));
  }

  @Get(':id')
  getConversation(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ConversationResponse> {
    return this.conversationsService.getConversation(getClientId(request), parseId(id));
  }

  @Get(':id/messages')
  listMessages(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<readonly MessageResponse[]> {
    return this.conversationsService.listMessages(getClientId(request), parseId(id));
  }

  @Post(':id/read')
  markRead(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.conversationsService.markRead(getClientId(request), parseId(id));
  }
}
