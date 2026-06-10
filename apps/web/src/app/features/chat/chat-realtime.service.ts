import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import {
  ConversationUpdatedEventSchema,
  MessageCreatedEventSchema,
  MessageStatusEventSchema,
  TypingEventSchema,
  type ConversationUpdatedEvent,
  type MessageCreatedEvent,
  type MessageStatusEvent,
  type TypingEvent,
} from '@bcb/shared';
import { Subject } from 'rxjs';
import { io, type Socket } from 'socket.io-client';
import { ApiClientService } from '../../core/api/api-client.service';
import { SessionStore } from '../../core/auth/session.store';

const E2E_REALTIME_KEY = 'bcb.e2e.realtime';
const E2E_REALTIME_EVENT = 'bcb:e2e-realtime';

export type ChatRealtimeEvent =
  | { readonly type: 'message.created'; readonly payload: MessageCreatedEvent }
  | { readonly type: 'message.status'; readonly payload: MessageStatusEvent }
  | { readonly type: 'conversation.updated'; readonly payload: ConversationUpdatedEvent }
  | { readonly type: 'typing.started'; readonly payload: TypingEvent }
  | { readonly type: 'typing.stopped'; readonly payload: TypingEvent };

type E2eRealtimeDetail = {
  readonly event?: unknown;
  readonly payload?: unknown;
};

@Injectable({ providedIn: 'root' })
export class ChatRealtimeService implements OnDestroy {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(SessionStore);
  private readonly zone = inject(NgZone);
  private readonly eventsSubject = new Subject<ChatRealtimeEvent>();
  private socket: Socket | null = null;
  private e2eListener: ((event: Event) => void) | null = null;

  readonly events$ = this.eventsSubject.asObservable();

  connect(): void {
    if (this.isE2eRealtimeEnabled()) {
      this.attachE2eBridge();
      return;
    }

    if (this.socket) {
      return;
    }

    const token = this.session.token();

    if (!token) {
      return;
    }

    this.socket = io(this.api.url('/chat'), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    this.socket.on('message.created', (payload: unknown) =>
      this.emitParsedEvent('message.created', payload),
    );
    this.socket.on('message.status', (payload: unknown) =>
      this.emitParsedEvent('message.status', payload),
    );
    this.socket.on('conversation.updated', (payload: unknown) =>
      this.emitParsedEvent('conversation.updated', payload),
    );
    this.socket.on('typing.started', (payload: unknown) =>
      this.emitParsedEvent('typing.started', payload),
    );
    this.socket.on('typing.stopped', (payload: unknown) =>
      this.emitParsedEvent('typing.stopped', payload),
    );
  }

  joinConversation(conversationId: string): void {
    this.connect();
    this.socket?.emit('conversation.join', { conversationId });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;

    if (this.e2eListener) {
      globalThis.window?.removeEventListener(E2E_REALTIME_EVENT, this.e2eListener);
      this.e2eListener = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.eventsSubject.complete();
  }

  private attachE2eBridge(): void {
    if (this.e2eListener) {
      return;
    }

    this.e2eListener = (event: Event) => {
      const detail = (event as CustomEvent<E2eRealtimeDetail>).detail;

      if (!detail || typeof detail.event !== 'string') {
        return;
      }

      this.emitParsedEvent(detail.event, detail.payload);
    };
    globalThis.window?.addEventListener(E2E_REALTIME_EVENT, this.e2eListener);
  }

  private emitParsedEvent(eventName: string, payload: unknown): void {
    const event = parseRealtimeEvent(eventName, payload);

    if (!event) {
      return;
    }

    this.zone.run(() => this.eventsSubject.next(event));
  }

  private isE2eRealtimeEnabled(): boolean {
    return globalThis.localStorage?.getItem(E2E_REALTIME_KEY) === 'true';
  }
}

function parseRealtimeEvent(eventName: string, payload: unknown): ChatRealtimeEvent | null {
  switch (eventName) {
    case 'message.created':
      return { type: eventName, payload: MessageCreatedEventSchema.parse(payload) };
    case 'message.status':
      return { type: eventName, payload: MessageStatusEventSchema.parse(payload) };
    case 'conversation.updated':
      return { type: eventName, payload: ConversationUpdatedEventSchema.parse(payload) };
    case 'typing.started':
      return { type: eventName, payload: TypingEventSchema.parse(payload) };
    case 'typing.stopped':
      return { type: eventName, payload: TypingEventSchema.parse(payload) };
    default:
      return null;
  }
}
