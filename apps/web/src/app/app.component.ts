import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from './core/auth/session.store';
import { PreferencesService, type SupportedLanguage } from './core/preferences/preferences.service';

@Component({
  selector: 'bcb-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  template: `
    <main
      class="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50"
    >
      <section class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5">
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800"
        >
          <div class="min-w-0">
            <h1 class="text-xl font-semibold">Big Chat Brasil</h1>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {{ 'shell.subtitle' | translate }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="sr-only" for="language-select">
              {{ 'shell.languageLabel' | translate }}
            </label>
            <select
              id="language-select"
              class="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              [attr.aria-label]="'shell.languageLabel' | translate"
              [value]="preferences.language()"
              (change)="changeLanguage($event)"
            >
              <option value="pt-BR">Português</option>
              <option value="en-US">English</option>
            </select>

            <button
              type="button"
              class="h-9 rounded border border-slate-300 px-3 text-sm font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100"
              [attr.aria-label]="
                (preferences.theme() === 'dark' ? 'shell.lightTheme' : 'shell.darkTheme')
                  | translate
              "
              (click)="preferences.toggleTheme()"
            >
              {{
                (preferences.theme() === 'dark' ? 'shell.lightTheme' : 'shell.darkTheme')
                  | translate
              }}
            </button>
          </div>
        </header>

        <div class="grid gap-5 md:flex-1 md:grid-cols-[184px_minmax(0,1fr)]">
          <nav
            class="flex flex-wrap items-start gap-2 border-b border-slate-200 pb-3 text-sm md:flex-nowrap md:flex-col md:items-stretch md:border-b-0 md:border-r md:pb-0 md:pr-4 dark:border-slate-800"
            [attr.aria-label]="'shell.primaryNavigation' | translate"
          >
            <a
              class="whitespace-nowrap rounded px-3 py-2 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
              routerLink="/login"
              routerLinkActive="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              {{ 'nav.login' | translate }}
            </a>
            <a
              class="whitespace-nowrap rounded px-3 py-2 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
              routerLink="/onboarding"
              routerLinkActive="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              {{ 'nav.onboarding' | translate }}
            </a>
            <a
              class="whitespace-nowrap rounded px-3 py-2 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
              routerLink="/conversations"
              routerLinkActive="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
            >
              {{ 'nav.conversations' | translate }}
            </a>
            <a
              class="whitespace-nowrap rounded px-3 py-2 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
              routerLink="/billing"
              routerLinkActive="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              {{ 'nav.billing' | translate }}
            </a>
            @if (session.isAdmin()) {
              <a
                class="whitespace-nowrap rounded px-3 py-2 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
                routerLink="/admin"
                routerLinkActive="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                {{ 'nav.admin' | translate }}
              </a>
            }
          </nav>

          <section class="min-w-0">
            <router-outlet />
          </section>
        </div>
      </section>
    </main>
  `,
})
export class AppComponent {
  protected readonly preferences = inject(PreferencesService);
  protected readonly session = inject(SessionStore);

  protected changeLanguage(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (value === 'pt-BR' || value === 'en-US') {
      this.preferences.setLanguage(value satisfies SupportedLanguage);
    }
  }
}
