import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'bcb-conversation-detail-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'conversation.kicker' | translate }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold">{{ 'conversation.title' | translate }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {{ 'conversation.description' | translate }}
        </p>
      </div>

      <div class="grid gap-2 rounded border border-slate-200 p-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'conversation.routeId' | translate }}
        </p>
        <p class="break-all font-mono text-sm">{{ conversationId }}</p>
      </div>

      <a
        class="w-fit text-sm font-medium text-slate-700 underline dark:text-slate-200"
        routerLink="/conversations"
      >
        {{ 'conversation.back' | translate }}
      </a>
    </section>
  `,
})
export class ConversationDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly conversationId = this.route.snapshot.paramMap.get('conversationId') ?? '';
}
