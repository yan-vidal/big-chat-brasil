import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'bcb-login-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'auth.kicker' | translate }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold">{{ 'auth.title' | translate }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {{ 'auth.description' | translate }}
        </p>
      </div>

      <div class="grid gap-3 rounded border border-slate-200 p-4 dark:border-slate-800">
        <p class="text-sm text-slate-700 dark:text-slate-200">
          {{ 'auth.next' | translate }}
        </p>
        <a
          class="w-fit rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-950"
          routerLink="/onboarding"
        >
          {{ 'auth.onboardingLink' | translate }}
        </a>
      </div>
    </section>
  `,
})
export class LoginPageComponent {}
