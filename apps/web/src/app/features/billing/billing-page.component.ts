import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'bcb-billing-page',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'billing.kicker' | translate }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold">{{ 'billing.title' | translate }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {{ 'billing.description' | translate }}
        </p>
      </div>

      <div class="grid gap-2 rounded border border-slate-200 p-4 dark:border-slate-800">
        <p class="text-sm font-medium">{{ 'billing.prepaid' | translate }}</p>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ 'billing.postpaid' | translate }}
        </p>
      </div>
    </section>
  `,
})
export class BillingPageComponent {}
