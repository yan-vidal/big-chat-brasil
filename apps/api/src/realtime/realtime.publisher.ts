import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  clientRoom,
  conversationRoom,
  type ConversationUpdatedPayload,
  type MessageCreatedPayload,
  type MessageStatusPayload,
  type RealtimeDomainEvent,
  type RealtimeEventName,
  type TypingPayload,
} from './realtime.types.js';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimePublisher {
  private readonly logger = new Logger(RealtimePublisher.name);
  private readonly eventsSubject = new Subject<RealtimeDomainEvent>();
  readonly events$ = this.eventsSubject.asObservable();
  private server: Server | undefined;

  attachServer(server: Server): void {
    this.server = server;
  }

  publishMessageCreated(clientId: string, payload: MessageCreatedPayload): void {
    this.publish({
      name: 'message.created',
      clientId,
      payload,
    });
  }

  publishMessageStatus(clientId: string, payload: MessageStatusPayload): void {
    this.publish({
      name: 'message.status',
      clientId,
      payload,
    });
  }

  publishConversationUpdated(clientId: string, payload: ConversationUpdatedPayload): void {
    this.publish({
      name: 'conversation.updated',
      clientId,
      payload,
    });
  }

  publishTypingStarted(clientId: string, payload: TypingPayload): void {
    this.publish(
      {
        name: 'typing.started',
        clientId,
        payload,
      },
      conversationRoom(payload.conversationId),
    );
  }

  publishTypingStopped(clientId: string, payload: TypingPayload): void {
    this.publish(
      {
        name: 'typing.stopped',
        clientId,
        payload,
      },
      conversationRoom(payload.conversationId),
    );
  }

  private publish(event: RealtimeDomainEvent, room = clientRoom(event.clientId)): void {
    this.eventsSubject.next(event);

    if (!this.server) {
      return;
    }

    this.server.to(room).emit(event.name satisfies RealtimeEventName, event.payload);
    this.logger.debug(`Published ${event.name} to ${room}`);
  }
}
