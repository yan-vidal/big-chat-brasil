import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { JwtPayloadSchema, type JwtPayload } from '@bcb/shared';
import { CHAT_NAMESPACE, clientRoom, conversationRoom } from './realtime.types.js';
import { RealtimePublisher } from './realtime.publisher.js';
import { RealtimeRepository } from './realtime.repository.js';
import type { Server, Socket } from 'socket.io';

type JoinConversationRequest = {
  readonly conversationId?: unknown;
};

type JoinConversationResponse =
  | {
      readonly ok: true;
      readonly conversationId: string;
    }
  | {
      readonly ok: false;
      readonly code: 'FORBIDDEN_RESOURCE' | 'VALIDATION_ERROR';
    };

type AuthenticatedSocketData = {
  auth?: JwtPayload;
};

@WebSocketGateway({
  namespace: CHAT_NAMESPACE,
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimePublisher: RealtimePublisher,
    private readonly realtimeRepository: RealtimeRepository,
  ) {}

  afterInit(server: Server): void {
    this.realtimePublisher.attachServer(server);
    server.use(async (socket, next) => {
      const token = this.extractToken(socket);

      if (!token) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      try {
        const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token);
        const parsedPayload = JwtPayloadSchema.parse(payload);

        if (!parsedPayload.clientId) {
          next(new Error('UNAUTHORIZED'));
          return;
        }

        (socket.data as AuthenticatedSocketData).auth = parsedPayload;
        next();
      } catch {
        next(new Error('UNAUTHORIZED'));
      }
    });
  }

  handleConnection(client: Socket): void {
    const payload = this.getAuth(client);

    if (!payload?.clientId) {
      client.disconnect(true);
      return;
    }

    void client.join(clientRoom(payload.clientId));
    this.logger.debug(`Socket joined ${clientRoom(payload.clientId)}`);
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinConversationRequest,
  ): Promise<JoinConversationResponse> {
    const payload = this.getAuth(client);
    const conversationId = body?.conversationId;

    if (!payload?.clientId || typeof conversationId !== 'string') {
      return { ok: false, code: 'VALIDATION_ERROR' };
    }

    const canAccess = await this.realtimeRepository.clientCanAccessConversation(
      payload.clientId,
      conversationId,
    );

    if (!canAccess) {
      return { ok: false, code: 'FORBIDDEN_RESOURCE' };
    }

    await client.join(conversationRoom(conversationId));

    return { ok: true, conversationId };
  }

  private extractToken(socket: Socket): string | undefined {
    const token = socket.handshake.auth?.token;

    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  private getAuth(socket: Socket): JwtPayload | undefined {
    return (socket.data as AuthenticatedSocketData).auth;
  }
}
