import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  IdSchema,
  SendMessageRequestSchema,
  type MessageResponse,
  type MessageStatusResponse,
  type SendMessageRequest,
  type SendMessageResponse,
} from '@bcb/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OnboardingGuard } from '../billing/onboarding.guard.js';
import { ValidationErrorException } from '../chat/chat.errors.js';
import { MessagesService } from './messages.service.js';
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

function parseSendMessageRequest(body: unknown): SendMessageRequest {
  const result = SendMessageRequestSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationErrorException('Payload de mensagem invalido', result.error.issues);
  }

  return result.data;
}

@Controller('messages')
@UseGuards(JwtAuthGuard, OnboardingGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<SendMessageResponse> {
    return this.messagesService.sendMessage(getClientId(request), parseSendMessageRequest(body));
  }

  @Get(':id')
  getMessage(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<MessageResponse> {
    return this.messagesService.getMessage(getClientId(request), parseId(id));
  }

  @Get(':id/status')
  getMessageStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<MessageStatusResponse> {
    return this.messagesService.getMessageStatus(getClientId(request), parseId(id));
  }
}
