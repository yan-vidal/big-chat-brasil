import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

const demoConversationId = '550e8400-e29b-41d4-a716-446655440011';

@Component({
  selector: 'bcb-conversations-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'conversations.kicker' | translate }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold">{{ 'conversations.title' | translate }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {{ 'conversations.description' | translate }}
        </p>
      </div>

      <a
        class="grid gap-1 rounded border border-slate-200 p-4 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900"
        [routerLink]="['/conversations', demoConversationId]"
      >
        <span class="text-sm font-semibold">{{ 'conversations.demoName' | translate }}</span>
        <span class="text-sm text-slate-600 dark:text-slate-300">
          {{ 'conversations.demoPreview' | translate }}
        </span>
      </a>
    </section>
  `,
})
export class ConversationsPageComponent {
  protected readonly demoConversationId = demoConversationId;
}
