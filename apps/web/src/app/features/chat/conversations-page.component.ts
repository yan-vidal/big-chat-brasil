import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  SendMessageRequestSchema,
  type BillingSummaryResponse,
  type ConversationResponse,
  type RecipientResponse,
} from '@bcb/shared';
import { firstValueFrom, type Subscription } from 'rxjs';
import { ChatApiService } from './chat-api.service';
import { ChatRealtimeService, type ChatRealtimeEvent } from './chat-realtime.service';

@Component({
  selector: 'bcb-conversations-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div
        class="grid gap-4 border-b border-slate-200 pb-4 md:grid-cols-[minmax(0,1fr)_auto] dark:border-slate-800"
      >
        <div class="min-w-0">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            {{ 'conversations.kicker' | translate }}
          </p>
          <h2 class="mt-2 text-2xl font-semibold">
            {{ 'conversations.title' | translate }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {{ 'conversations.description' | translate }}
          </p>
        </div>

        <div class="grid content-start gap-2 text-sm md:justify-items-end">
          @if (billing(); as summary) {
            <p
              class="rounded border border-slate-200 px-3 py-2 font-semibold dark:border-slate-800"
            >
              {{ billingText(summary) }}
            </p>
          }
          <button
            type="button"
            class="h-10 rounded bg-slate-900 px-4 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-950"
            (click)="toggleNewConversation()"
          >
            {{ 'conversations.newConversation' | translate }}
          </button>
        </div>
      </div>

      @if (newConversationOpen()) {
        <form
          class="grid gap-3 border-b border-slate-200 pb-4 dark:border-slate-800"
          [formGroup]="newConversationForm"
          (ngSubmit)="sendNewConversation()"
        >
          <div class="grid gap-3 md:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_auto]">
            <label class="grid gap-1 text-sm font-medium" for="recipientId">
              {{ 'conversations.recipientLabel' | translate }}
              <select
                id="recipientId"
                class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                formControlName="recipientId"
              >
                @for (recipient of recipients(); track recipient.id) {
                  <option [value]="recipient.id">{{ recipient.name }}</option>
                }
              </select>
            </label>

            <label class="grid gap-1 text-sm font-medium" for="newContent">
              {{ 'conversations.initialMessageLabel' | translate }}
              <input
                id="newContent"
                class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                formControlName="content"
              />
            </label>

            <button
              type="submit"
              class="mt-6 h-10 rounded bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 md:mt-auto dark:bg-slate-100 dark:text-slate-950"
              [disabled]="sendingNewConversation() || recipients().length === 0"
            >
              {{ 'conversations.sendNewConversation' | translate }}
            </button>
          </div>

          @if (newConversationFeedback()) {
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {{ newConversationFeedback()! | translate }}
            </p>
          }
        </form>
      }

      <label class="grid gap-1 text-sm font-medium" for="conversationSearch">
        {{ 'conversations.searchLabel' | translate }}
        <input
          id="conversationSearch"
          class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          [value]="searchTerm()"
          (input)="updateSearch($event)"
        />
      </label>

      @if (error()) {
        <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {{ error()! | translate }}
        </p>
      }

      <section class="grid gap-3" [attr.aria-label]="'conversations.listLabel' | translate">
        @if (loading()) {
          <p class="text-sm text-slate-600 dark:text-slate-300">
            {{ 'conversations.loading' | translate }}
          </p>
        } @else {
          @for (conversation of filteredConversations(); track conversation.id) {
            <a
              class="grid gap-2 rounded border border-slate-200 p-4 hover:bg-slate-100 md:grid-cols-[minmax(0,1fr)_auto] dark:border-slate-800 dark:hover:bg-slate-900"
              [routerLink]="['/conversations', conversation.id]"
            >
              <span class="min-w-0">
                <span class="block text-sm font-semibold">{{ conversation.recipientName }}</span>
                <span class="mt-1 block truncate text-sm text-slate-600 dark:text-slate-300">
                  {{
                    conversation.lastMessageContent || ('conversations.emptyMessage' | translate)
                  }}
                </span>
              </span>

              <span class="flex flex-wrap items-center gap-2 md:justify-end">
                @if (conversation.unreadCount > 0) {
                  <span
                    class="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                  >
                    {{ 'conversations.unread' | translate: { count: conversation.unreadCount } }}
                  </span>
                }
                @if (conversation.lastMessageAt) {
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    {{ timeLabel(conversation.lastMessageAt) }}
                  </span>
                }
              </span>
            </a>
          } @empty {
            <p class="rounded border border-slate-200 p-4 text-sm dark:border-slate-800">
              {{ 'conversations.emptySearch' | translate }}
            </p>
          }
        }
      </section>
    </section>
  `,
})
export class ConversationsPageComponent implements OnInit, OnDestroy {
  private readonly chatApi = inject(ChatApiService);
  private readonly realtime = inject(ChatRealtimeService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly translate = inject(TranslateService);
  private realtimeSubscription: Subscription | null = null;

  protected readonly conversations = signal<readonly ConversationResponse[]>([]);
  protected readonly billing = signal<BillingSummaryResponse | null>(null);
  protected readonly recipients = signal<readonly RecipientResponse[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly newConversationOpen = signal(false);
  protected readonly sendingNewConversation = signal(false);
  protected readonly newConversationFeedback = signal<string | null>(null);
  protected readonly filteredConversations = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');

    if (!term) {
      return this.conversations();
    }

    return this.conversations().filter((conversation) => {
      const searchable = [conversation.recipientName, conversation.lastMessageContent ?? ''].join(
        ' ',
      );

      return searchable.toLocaleLowerCase('pt-BR').includes(term);
    });
  });

  protected readonly newConversationForm = this.formBuilder.group({
    recipientId: ['', [Validators.required]],
    content: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.realtimeSubscription = this.realtime.events$.subscribe((event) =>
      this.applyRealtimeEvent(event),
    );
    this.realtime.connect();
    void this.load();
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected async toggleNewConversation(): Promise<void> {
    const nextOpen = !this.newConversationOpen();
    this.newConversationOpen.set(nextOpen);
    this.newConversationFeedback.set(null);

    if (nextOpen && this.recipients().length === 0) {
      await this.loadRecipients();
    }
  }

  protected async sendNewConversation(): Promise<void> {
    this.newConversationFeedback.set(null);

    const requestResult = SendMessageRequestSchema.safeParse({
      recipientId: this.newConversationForm.controls.recipientId.value,
      content: this.newConversationForm.controls.content.value,
      priority: 'normal',
    });

    if (!requestResult.success) {
      this.newConversationFeedback.set('conversations.feedback.invalidNewConversation');
      return;
    }

    this.sendingNewConversation.set(true);
    try {
      const response = await firstValueFrom(this.chatApi.sendMessage(requestResult.data));
      this.updatePrepaidBalance(response.currentBalance);
      this.newConversationForm.controls.content.setValue('');
      this.newConversationFeedback.set('conversations.feedback.newConversationSent');
      await this.loadConversations();
    } catch {
      this.newConversationFeedback.set('conversations.feedback.newConversationFailed');
    } finally {
      this.sendingNewConversation.set(false);
    }
  }

  protected billingText(summary: BillingSummaryResponse): string {
    if (summary.planType === 'prepaid') {
      return this.translate.instant('conversations.balance', {
        amount: formatMoney(summary.balanceCents),
      }) as string;
    }

    return this.translate.instant('conversations.limit', {
      limit: formatMoney(summary.monthlyLimitCents),
      remaining: formatMoney(summary.remainingCents),
    }) as string;
  }

  protected timeLabel(timestamp: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    await Promise.all([this.loadBilling(), this.loadConversations()]);
    this.loading.set(false);
  }

  private async loadBilling(): Promise<void> {
    try {
      this.billing.set(await firstValueFrom(this.chatApi.getBillingSummary()));
    } catch {
      this.billing.set(null);
    }
  }

  private async loadConversations(): Promise<void> {
    try {
      this.conversations.set(await firstValueFrom(this.chatApi.listConversations()));
      this.error.set(null);
    } catch {
      this.error.set('conversations.errors.loadFailed');
    }
  }

  private async loadRecipients(): Promise<void> {
    try {
      const recipients = await firstValueFrom(this.chatApi.listRecipients());
      this.recipients.set(recipients);
      this.newConversationForm.controls.recipientId.setValue(recipients[0]?.id ?? '');
    } catch {
      this.newConversationFeedback.set('conversations.feedback.recipientsFailed');
    }
  }

  private updatePrepaidBalance(balanceCents: number | undefined): void {
    const current = this.billing();

    if (current?.planType === 'prepaid' && typeof balanceCents === 'number') {
      this.billing.set({ ...current, balanceCents });
    }
  }

  private applyRealtimeEvent(event: ChatRealtimeEvent): void {
    if (event.type !== 'conversation.updated') {
      return;
    }

    this.conversations.update((conversations) =>
      conversations
        .map((conversation) =>
          conversation.id === event.payload.conversationId
            ? {
                ...conversation,
                lastMessageContent: event.payload.lastMessageContent,
                lastMessageAt: event.payload.lastMessageAt,
                unreadCount: event.payload.unreadCount,
              }
            : conversation,
        )
        .sort(compareConversationsByRecentMessage),
    );
  }
}

function formatMoney(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function compareConversationsByRecentMessage(
  left: ConversationResponse,
  right: ConversationResponse,
): number {
  const rightTimestamp = right.lastMessageAt ? Date.parse(right.lastMessageAt) : 0;
  const leftTimestamp = left.lastMessageAt ? Date.parse(left.lastMessageAt) : 0;

  return rightTimestamp - leftTimestamp;
}
