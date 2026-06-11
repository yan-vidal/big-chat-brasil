import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  CreatePixIntentRequestSchema,
  OnboardingRequestSchema,
  type OnboardingRequest,
  type PaymentIntentResponse,
  type PlanType,
} from '@bcb/shared';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-errors';
import { SessionStore } from '../../core/auth/session.store';
import { OnboardingApiService } from './onboarding-api.service';

@Component({
  selector: 'bcb-onboarding-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'onboarding.kicker' | translate }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold">{{ 'onboarding.title' | translate }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {{ 'onboarding.description' | translate }}
        </p>
      </div>

      <form
        class="grid max-w-2xl gap-4 rounded border border-slate-200 p-4 dark:border-slate-800"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <label class="grid gap-1 text-sm font-medium" for="name">
          {{ 'onboarding.nameLabel' | translate }}
          <input
            id="name"
            class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            formControlName="name"
            autocomplete="organization"
          />
        </label>

        <fieldset class="grid gap-2">
          <legend class="text-sm font-medium">{{ 'onboarding.planLabel' | translate }}</legend>
          <label class="flex w-fit items-center gap-2 text-sm" for="plan-prepaid">
            <input
              id="plan-prepaid"
              formControlName="planType"
              type="radio"
              value="prepaid"
              (change)="syncPlanType()"
            />
            {{ 'onboarding.prepaidOption' | translate }}
          </label>
          <label class="flex w-fit items-center gap-2 text-sm" for="plan-postpaid">
            <input
              id="plan-postpaid"
              formControlName="planType"
              type="radio"
              value="postpaid"
              (change)="syncPlanType()"
            />
            {{ 'onboarding.postpaidOption' | translate }}
          </label>
        </fieldset>

        @if (planType() === 'prepaid') {
          <label class="grid gap-1 text-sm font-medium" for="initialCredit">
            {{ 'onboarding.initialCreditLabel' | translate }}
            <select
              id="initialCredit"
              class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              formControlName="initialCreditCents"
            >
              <option value="2500">R$ 25,00</option>
              <option value="5000">R$ 50,00</option>
              <option value="10000">R$ 100,00</option>
            </select>
          </label>
        } @else {
          <label class="grid gap-1 text-sm font-medium" for="monthlyLimit">
            {{ 'onboarding.monthlyLimitLabel' | translate }}
            <select
              id="monthlyLimit"
              class="h-10 rounded border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              formControlName="monthlyLimitCents"
            >
              <option value="5000">R$ 50,00</option>
              <option value="10000">R$ 100,00</option>
              <option value="20000">R$ 200,00</option>
            </select>
          </label>
        }

        @if (errorKey()) {
          <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {{ errorKey() | translate }}
          </p>
        }

        @if (pixIntent()) {
          <section class="grid gap-2 rounded border border-emerald-300 p-3 dark:border-emerald-800">
            <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {{ 'onboarding.pixPending' | translate }}
            </p>
            <p class="break-all font-mono text-xs text-slate-600 dark:text-slate-300">
              {{ pixIntent()?.id }}
            </p>
            <button
              type="button"
              class="h-10 w-fit rounded bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
              [disabled]="loading()"
              (click)="confirmPix()"
            >
              {{ 'onboarding.confirmPix' | translate }}
            </button>
          </section>
        } @else {
          <button
            type="submit"
            class="h-10 w-fit rounded bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
            [disabled]="loading()"
          >
            {{ submitLabel() | translate }}
          </button>
        }
      </form>
    </section>
  `,
})
export class OnboardingPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly pixIntent = signal<PaymentIntentResponse | null>(null);
  protected readonly planType = signal<PlanType>('prepaid');
  protected readonly submitLabel = computed(() =>
    this.planType() === 'prepaid' ? 'onboarding.generatePix' : 'onboarding.activatePlan',
  );

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required]],
    planType: ['prepaid', [Validators.required]],
    initialCreditCents: ['2500', [Validators.required]],
    monthlyLimitCents: ['10000', [Validators.required]],
  });

  protected syncPlanType(): void {
    const planType = this.form.controls.planType.value;
    this.planType.set(planType === 'postpaid' ? 'postpaid' : 'prepaid');
    this.pixIntent.set(null);
  }

  protected async submit(): Promise<void> {
    this.errorKey.set(null);
    this.syncPlanType();

    const request = this.buildOnboardingRequest();
    if (!request) {
      this.errorKey.set('onboarding.errors.invalidForm');
      return;
    }

    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.onboardingApi.completeOnboarding(request));
      this.sessionStore.updateClient(response.client, request.planType === 'prepaid');

      if (request.planType === 'postpaid') {
        await this.router.navigateByUrl('/conversations');
        return;
      }

      const pixRequest = CreatePixIntentRequestSchema.parse({
        amountCents: Number(this.form.controls.initialCreditCents.value),
      });
      this.pixIntent.set(await firstValueFrom(this.onboardingApi.createPixIntent(pixRequest)));
    } catch (error) {
      this.errorKey.set(apiErrorMessage(error, 'onboarding.errors.requestFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async confirmPix(): Promise<void> {
    const intent = this.pixIntent();

    if (!intent) {
      return;
    }

    this.loading.set(true);
    this.errorKey.set(null);
    try {
      const confirmation = await firstValueFrom(this.onboardingApi.confirmPixIntent(intent.id));
      this.sessionStore.markOnboardingCompleted({
        planType: 'prepaid',
        balanceCents: confirmation.balanceCents,
      });
      await this.router.navigateByUrl('/conversations');
    } catch (error) {
      this.errorKey.set(apiErrorMessage(error, 'onboarding.errors.requestFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  private buildOnboardingRequest(): OnboardingRequest | null {
    const planType = this.planType();
    const candidate =
      planType === 'prepaid'
        ? {
            name: this.form.controls.name.value,
            planType,
          }
        : {
            name: this.form.controls.name.value,
            planType,
            monthlyLimitCents: Number(this.form.controls.monthlyLimitCents.value),
          };
    const result = OnboardingRequestSchema.safeParse(candidate);

    return result.success ? result.data : null;
  }
}
