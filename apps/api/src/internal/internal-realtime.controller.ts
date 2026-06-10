import { Body, Controller, HttpCode, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IdSchema, MessageStatusEventSchema, type MessageStatusEvent } from '@bcb/shared';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { InternalTokenGuard } from './internal-token.guard.js';

const InternalMessageStatusRequestSchema = MessageStatusEventSchema.extend({
  clientId: IdSchema,
});

type InternalMessageStatusRequest = MessageStatusEvent & {
  readonly clientId: string;
};

@Controller('internal/realtime')
@ApiExcludeController()
@UseGuards(InternalTokenGuard)
export class InternalRealtimeController {
  constructor(private readonly realtimePublisher: RealtimePublisher) {}

  @Post('message-status')
  @HttpCode(202)
  publishMessageStatus(@Body() body: unknown): { accepted: true } {
    const payload = this.parseMessageStatus(body);

    this.realtimePublisher.publishMessageStatus(payload.clientId, {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      status: payload.status,
      occurredAt: payload.occurredAt,
    });

    return { accepted: true };
  }

  private parseMessageStatus(body: unknown): InternalMessageStatusRequest {
    const result = InternalMessageStatusRequestSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Payload interno de status invalido',
        details: result.error.flatten(),
      });
    }

    return result.data;
  }
}
