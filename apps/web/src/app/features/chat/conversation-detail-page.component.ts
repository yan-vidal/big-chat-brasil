import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  SendMessageRequestSchema,
  type BillingSummaryResponse,
  type ConversationResponse,
  type MessagePriority,
  type MessageResponse,
  type MessageStatus,
} from '@bcb/shared';
import { firstValueFrom, type Subscription } from 'rxjs';
import { ChatApiService } from './chat-api.service';
import { ChatRealtimeService, type ChatRealtimeEvent } from './chat-realtime.service';

@Component({
  selector: 'bcb-conversation-detail-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="grid min-h-[640px] grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
      <header
        class="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center dark:border-slate-800"
      >
        <a
          class="w-fit text-sm font-medium text-slate-700 underline dark:text-slate-200"
          routerLink="/conversations"
        >
          {{ 'conversation.back' | translate }}
        </a>

        <div class="min-w-0">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            {{ 'conversation.kicker' | translate }}
          </p>
          <h2 class="mt-1 truncate text-xl font-semibold">
            {{ conversation()?.recipientName || ('conversation.loadingTitle' | translate) }}
          </h2>
          @if (typing()) {
            <p class="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {{ 'conversation.typing' | translate: { name: recipientFirstName() } }}
            </p>
          }
        </div>

        @if (billing(); as summary) {
          <p
            class="w-fit rounded border border-slate-200 px-3 py-2 text-sm font-semibold sm:justify-self-end dark:border-slate-800"
          >
            {{ billingText(summary) }}
          </p>
        }
      </header>

      <section
        class="grid content-start gap-3 overflow-y-auto rounded border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-950"
        [attr.aria-label]="'conversation.historyLabel' | translate"
      >
        @if (loading()) {
          <p class="text-sm text-slate-600 dark:text-slate-300">
            {{ 'conversation.loading' | translate }}
          </p>
        } @else if (error()) {
          <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {{ error()! | translate }}
          </p>
        } @else {
          @for (message of messages(); track message.id) {
            <article
              data-testid="message-bubble"
              class="grid max-w-[88%] gap-2 rounded p-3 text-sm sm:max-w-[72%]"
              [class.justify-self-end]="message.senderType === 'client'"
              [class.bg-slate-900]="message.senderType === 'client'"
              [class.text-white]="message.senderType === 'client'"
              [class.justify-self-start]="message.senderType === 'user'"
              [class.bg-slate-100]="message.senderType === 'user'"
              [class.text-slate-950]="message.senderType === 'user'"
              [class.dark:bg-slate-800]="message.senderType === 'user'"
              [class.dark:text-slate-50]="message.senderType === 'user'"
              [class.border]="message.priority === 'urgent'"
              [class.border-amber-400]="message.priority === 'urgent'"
            >
              <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>

              <footer
                class="flex min-h-5 flex-wrap items-center justify-end gap-2 text-xs"
                [class.text-slate-300]="message.senderType === 'client'"
                [class.text-slate-500]="message.senderType === 'user'"
              >
                @if (message.priority === 'urgent') {
                  <span class="font-semibold text-amber-500">
                    {{ 'conversation.urgentPriority' | translate }}
                  </span>
                }
                <time [attr.datetime]="message.timestamp">{{ timeLabel(message.timestamp) }}</time>
                @if (message.senderType === 'client') {
                  <span [class.text-sky-300]="message.status === 'read'">
                    {{ statusIcon(message.status) }} {{ statusLabel(message.status) }}
                  </span>
                }
              </footer>
            </article>
          } @empty {
            <p class="text-sm text-slate-600 dark:text-slate-300">
              {{ 'conversation.empty' | translate }}
            </p>
          }
        }
      </section>

      <form
        class="grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800"
        [formGroup]="messageForm"
        (ngSubmit)="sendMessage()"
      >
        <label class="grid gap-1 text-sm font-medium" for="messageContent">
          {{ 'conversation.messageLabel' | translate }}
          <textarea
            id="messageContent"
            class="min-h-24 resize-y rounded border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            formControlName="content"
            maxlength="2000"
          ></textarea>
        </label>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <fieldset class="flex items-center gap-4">
            <legend class="sr-only">{{ 'conversation.priorityLabel' | translate }}</legend>
            <label class="flex items-center gap-2 text-sm" for="priority-normal">
              <input id="priority-normal" type="radio" formControlName="priority" value="normal" />
              {{ 'conversation.normalPriority' | translate }}
            </label>
            <label class="flex items-center gap-2 text-sm font-medium" for="priority-urgent">
              <input id="priority-urgent" type="radio" formControlName="priority" value="urgent" />
              {{ 'conversation.urgentPriority' | translate }}
            </label>
          </fieldset>

          <button
            type="submit"
            class="h-10 rounded bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
            [disabled]="sending()"
          >
            {{ 'conversation.send' | translate }}
          </button>
        </div>

        @if (sendError()) {
          <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {{ sendError()! | translate }}
          </p>
        }
      </form>
    </section>
  `,
})
export class ConversationDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly chatApi = inject(ChatApiService);
  private readonly realtime = inject(ChatRealtimeService);
  private readonly translate = inject(TranslateService);
  private readonly conversationId = this.route.snapshot.paramMap.get('conversationId') ?? '';
  private realtimeSubscription: Subscription | null = null;

  protected readonly conversation = signal<ConversationResponse | null>(null);
  protected readonly messages = signal<readonly MessageResponse[]>([]);
  protected readonly billing = signal<BillingSummaryResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly typing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sendError = signal<string | null>(null);
  protected readonly recipientFirstName = computed(
    () => this.conversation()?.recipientName.split(/\s+/)[0] ?? 'Contato',
  );

  protected readonly messageForm = this.formBuilder.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
    priority: ['normal' as MessagePriority, [Validators.required]],
  });

  ngOnInit(): void {
    this.realtimeSubscription = this.realtime.events$.subscribe((event) =>
      this.applyRealtimeEvent(event),
    );
    this.realtime.joinConversation(this.conversationId);
    void this.load();
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
  }

  protected async sendMessage(): Promise<void> {
    this.sendError.set(null);

    const result = SendMessageRequestSchema.safeParse({
      conversationId: this.conversationId,
      content: this.messageForm.controls.content.value,
      priority: this.messageForm.controls.priority.value,
    });

    if (!result.success) {
      this.sendError.set('conversation.errors.invalidMessage');
      return;
    }

    this.sending.set(true);
    try {
      const response = await firstValueFrom(this.chatApi.sendMessage(result.data));
      const message: MessageResponse = {
        id: response.id,
        conversationId: this.conversationId,
        content: result.data.content,
        senderType: 'client',
        timestamp: response.timestamp,
        priority: result.data.priority,
        status: response.status,
        cost: response.cost,
      };

      this.upsertMessage(message);
      this.updatePrepaidBalance(response.currentBalance);
      this.messageForm.controls.content.setValue('');
      this.messageForm.controls.priority.setValue('normal');
    } catch {
      this.sendError.set('conversation.errors.sendFailed');
    } finally {
      this.sending.set(false);
    }
  }

  protected billingText(summary: BillingSummaryResponse): string {
    if (summary.planType === 'prepaid') {
      return this.translate.instant('conversation.balance', {
        amount: formatMoney(summary.balanceCents),
      }) as string;
    }

    return this.translate.instant('conversation.remaining', {
      amount: formatMoney(summary.remainingCents),
    }) as string;
  }

  protected timeLabel(timestamp: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }

  protected statusIcon(status: MessageStatus): string {
    switch (status) {
      case 'queued':
      case 'processing':
        return '…';
      case 'sent':
        return '✓';
      case 'delivered':
      case 'read':
        return '✓✓';
      case 'failed':
        return '!';
    }
  }

  protected statusLabel(status: MessageStatus): string {
    return this.translate.instant(`conversation.status.${status}`) as string;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [conversation, messages, billing] = await Promise.all([
        firstValueFrom(this.chatApi.getConversation(this.conversationId)),
        firstValueFrom(this.chatApi.listMessages(this.conversationId)),
        firstValueFrom(this.chatApi.getBillingSummary()),
      ]);

      this.conversation.set(conversation);
      this.messages.set(messages);
      this.billing.set(billing);
      await firstValueFrom(this.chatApi.markConversationRead(this.conversationId));
    } catch {
      this.error.set('conversation.errors.loadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  private applyRealtimeEvent(event: ChatRealtimeEvent): void {
    switch (event.type) {
      case 'message.created':
        if (event.payload.message.conversationId === this.conversationId) {
          this.upsertMessage(event.payload.message);
        }
        return;
      case 'message.status':
        if (event.payload.conversationId === this.conversationId) {
          this.updateMessageStatus(event.payload.messageId, event.payload.status);
        }
        return;
      case 'typing.started':
        if (
          event.payload.conversationId === this.conversationId &&
          event.payload.senderType === 'user'
        ) {
          this.typing.set(true);
        }
        return;
      case 'typing.stopped':
        if (
          event.payload.conversationId === this.conversationId &&
          event.payload.senderType === 'user'
        ) {
          this.typing.set(false);
        }
        return;
      case 'conversation.updated':
        if (event.payload.conversationId === this.conversationId) {
          const current = this.conversation();

          if (current) {
            this.conversation.set({
              ...current,
              lastMessageContent: event.payload.lastMessageContent,
              lastMessageAt: event.payload.lastMessageAt,
              unreadCount: event.payload.unreadCount,
            });
          }
        }
    }
  }

  private upsertMessage(message: MessageResponse): void {
    this.messages.update((messages) => {
      const index = messages.findIndex((current) => current.id === message.id);

      if (index === -1) {
        return [...messages, message];
      }

      return messages.map((current) => (current.id === message.id ? message : current));
    });
  }

  private updateMessageStatus(messageId: string, status: MessageStatus): void {
    this.messages.update((messages) =>
      messages.map((message) => (message.id === messageId ? { ...message, status } : message)),
    );
  }

  private updatePrepaidBalance(balanceCents: number | undefined): void {
    const current = this.billing();

    if (current?.planType === 'prepaid' && typeof balanceCents === 'number') {
      this.billing.set({ ...current, balanceCents });
    }
  }
}

function formatMoney(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
