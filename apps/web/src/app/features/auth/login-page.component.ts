import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  AuthSessionRequestSchema,
  inferDocumentType,
  normalizeDocument,
  type AuthSessionRequest,
  type DocumentType,
} from '@bcb/shared';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-errors';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { SessionStore } from '../../core/auth/session.store';

@Component({
  selector: 'bcb-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
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

      <form
        class="grid max-w-xl gap-4 rounded border border-slate-200 p-4 dark:border-slate-800"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <label class="grid gap-1 text-sm font-medium" for="documentId">
          {{ 'auth.documentLabel' | translate }}
          <input
            id="documentId"
            class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            formControlName="documentId"
            inputmode="numeric"
            autocomplete="username"
            (input)="updateDocumentType()"
          />
        </label>

        <p class="min-h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {{ documentTypeLabel() }}
        </p>

        <label class="grid gap-1 text-sm font-medium" for="password">
          {{ 'auth.passwordLabel' | translate }}
          <input
            id="password"
            class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            formControlName="password"
            type="password"
            autocomplete="current-password"
          />
        </label>

        @if (errorKey()) {
          <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {{ errorKey() | translate }}
          </p>
        }

        <button
          type="submit"
          class="h-10 w-fit rounded bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
          [disabled]="loading()"
        >
          {{ (loading() ? 'auth.loading' : 'auth.submit') | translate }}
        </button>
      </form>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  private readonly inferredDocumentType = signal<DocumentType | null>(null);
  protected readonly documentTypeLabel = computed(() => this.inferredDocumentType() ?? '');

  protected readonly form = this.formBuilder.group({
    documentId: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected updateDocumentType(): void {
    try {
      this.inferredDocumentType.set(inferDocumentType(this.form.controls.documentId.value));
    } catch {
      this.inferredDocumentType.set(null);
    }
  }

  protected async submit(): Promise<void> {
    this.errorKey.set(null);
    this.updateDocumentType();

    const request = this.buildRequest();
    if (!request) {
      this.errorKey.set('auth.errors.invalidDocument');
      return;
    }

    this.loading.set(true);
    try {
      const session = await firstValueFrom(this.authApi.createSession(request));
      this.sessionStore.setSession(session);
      await this.router.navigateByUrl(this.redirectPathFor(session));
    } catch (error) {
      this.errorKey.set(apiErrorMessage(error, 'auth.errors.requestFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  private buildRequest(): AuthSessionRequest | null {
    try {
      const documentId = normalizeDocument(this.form.controls.documentId.value);
      const documentType = inferDocumentType(documentId);
      const result = AuthSessionRequestSchema.safeParse({
        documentId,
        documentType,
        password: this.form.controls.password.value,
      });

      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  private redirectPathFor(session: {
    client: { role: string };
    requiresOnboarding: boolean;
  }): string {
    if (session.client.role === 'admin') {
      return '/admin';
    }

    return session.requiresOnboarding ? '/onboarding' : '/conversations';
  }
}
