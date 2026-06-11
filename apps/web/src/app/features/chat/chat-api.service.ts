import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BillingSummaryResponseSchema,
  ConversationResponseSchema,
  MarkConversationReadResponseSchema,
  MessageResponseSchema,
  RecipientResponseSchema,
  SendMessageResponseSchema,
  type BillingSummaryResponse,
  type ConversationResponse,
  type MarkConversationReadResponse,
  type MessageResponse,
  type RecipientResponse,
  type SendMessageRequest,
  type SendMessageResponse,
} from '@bcb/shared';
import { map, type Observable } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);

  getBillingSummary(): Observable<BillingSummaryResponse> {
    return this.http
      .get<unknown>(this.api.url('/billing/me'), this.api.authHeaders())
      .pipe(map((response) => BillingSummaryResponseSchema.parse(response)));
  }

  listConversations(): Observable<readonly ConversationResponse[]> {
    return this.http
      .get<unknown>(this.api.url('/conversations'), this.api.authHeaders())
      .pipe(map((response) => ConversationResponseSchema.array().parse(response)));
  }

  getConversation(conversationId: string): Observable<ConversationResponse> {
    return this.http
      .get<unknown>(this.api.url(`/conversations/${conversationId}`), this.api.authHeaders())
      .pipe(map((response) => ConversationResponseSchema.parse(response)));
  }

  listMessages(conversationId: string): Observable<readonly MessageResponse[]> {
    return this.http
      .get<unknown>(
        this.api.url(`/conversations/${conversationId}/messages`),
        this.api.authHeaders(),
      )
      .pipe(map((response) => MessageResponseSchema.array().parse(response)));
  }

  markConversationRead(conversationId: string): Observable<MarkConversationReadResponse> {
    return this.http
      .post<unknown>(
        this.api.url(`/conversations/${conversationId}/read`),
        {},
        this.api.authHeaders(),
      )
      .pipe(map((response) => MarkConversationReadResponseSchema.parse(response)));
  }

  sendMessage(request: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http
      .post<unknown>(this.api.url('/messages'), request, this.api.authHeaders())
      .pipe(map((response) => SendMessageResponseSchema.parse(response)));
  }

  listRecipients(): Observable<readonly RecipientResponse[]> {
    return this.http
      .get<unknown>(this.api.url('/recipients'), this.api.authHeaders())
      .pipe(map((response) => RecipientResponseSchema.array().parse(response)));
  }
}
