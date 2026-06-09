import 'zone.js';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet, type Routes } from '@angular/router';

@Component({
  selector: 'bcb-placeholder-view',
  standalone: true,
  template: '<p class="text-sm text-slate-600 dark:text-slate-300">BCB route ready.</p>',
})
export class PlaceholderViewComponent {}

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: PlaceholderViewComponent },
  { path: 'onboarding', component: PlaceholderViewComponent },
  { path: 'conversations', component: PlaceholderViewComponent },
  { path: 'conversations/:conversationId', component: PlaceholderViewComponent },
  { path: 'billing', component: PlaceholderViewComponent },
];

@Component({
  selector: 'bcb-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
        <header
          class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800"
        >
          <h1 class="text-xl font-semibold">Big Chat Brasil</h1>
          <span class="text-sm text-slate-500 dark:text-slate-400">Sprint 0</span>
        </header>
        <router-outlet />
      </section>
    </main>
  `,
})
export class AppComponent {}

void bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
