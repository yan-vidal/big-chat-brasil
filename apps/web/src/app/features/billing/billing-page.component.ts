import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { type BillingSummaryResponse, type BillingTransactionResponse } from '@bcb/shared';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-errors';
import { BillingApiService } from './billing-api.service';

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

      @if (loading()) {
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ 'billing.loading' | translate }}
        </p>
      } @else if (error()) {
        <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {{ error()! | translate }}
        </p>
      } @else if (summary(); as billing) {
        <section class="grid gap-3 md:grid-cols-4">
          <article class="rounded border border-slate-200 p-4 dark:border-slate-800">
            <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              {{ 'billing.planLabel' | translate }}
            </p>
            <h3 class="mt-2 text-lg font-semibold">{{ planLabel(billing) }}</h3>
          </article>

          @if (billing.planType === 'prepaid') {
            <article
              class="rounded border border-slate-200 p-4 md:col-span-3 dark:border-slate-800"
            >
              <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {{ 'billing.balanceLabel' | translate }}
              </p>
              <p class="mt-2 text-2xl font-semibold">{{ formatMoney(billing.balanceCents) }}</p>
            </article>
          } @else {
            <article class="rounded border border-slate-200 p-4 dark:border-slate-800">
              <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {{ 'billing.monthlyLimitLabel' | translate }}
              </p>
              <p class="mt-2 text-xl font-semibold">
                {{ formatMoney(billing.monthlyLimitCents) }}
              </p>
            </article>
            <article class="rounded border border-slate-200 p-4 dark:border-slate-800">
              <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {{ 'billing.monthlyUsedLabel' | translate }}
              </p>
              <p class="mt-2 text-xl font-semibold">{{ formatMoney(billing.monthlyUsedCents) }}</p>
            </article>
            <article class="rounded border border-slate-200 p-4 dark:border-slate-800">
              <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {{ 'billing.remainingLabel' | translate }}
              </p>
              <p class="mt-2 text-xl font-semibold">{{ formatMoney(billing.remainingCents) }}</p>
            </article>
            <article class="rounded border border-slate-200 p-4 dark:border-slate-800">
              <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {{ 'billing.usageMonthLabel' | translate }}
              </p>
              <p class="mt-2 text-xl font-semibold">{{ billing.usageMonth }}</p>
            </article>
          }
        </section>

        <section class="grid gap-3">
          <h3 class="text-base font-semibold">{{ 'billing.transactionsTitle' | translate }}</h3>
          <div class="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
            <table class="min-w-full border-collapse text-left text-sm">
              <thead
                class="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <tr>
                  <th class="px-3 py-2">{{ 'billing.typeHeader' | translate }}</th>
                  <th class="px-3 py-2">{{ 'billing.amountHeader' | translate }}</th>
                  <th class="px-3 py-2">{{ 'billing.referenceHeader' | translate }}</th>
                  <th class="px-3 py-2">{{ 'billing.createdHeader' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (transaction of billing.transactions; track transaction.id) {
                  <tr class="border-t border-slate-200 dark:border-slate-800">
                    <td class="px-3 py-2 font-medium">{{ transactionType(transaction.type) }}</td>
                    <td class="px-3 py-2">{{ formatTransactionAmount(transaction) }}</td>
                    <td class="px-3 py-2">{{ referenceLabel(transaction) }}</td>
                    <td class="px-3 py-2">{{ dateLabel(transaction.createdAt) }}</td>
                  </tr>
                } @empty {
                  <tr class="border-t border-slate-200 dark:border-slate-800">
                    <td class="px-3 py-4 text-slate-600 dark:text-slate-300" colspan="4">
                      {{ 'billing.emptyTransactions' | translate }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </section>
  `,
})
export class BillingPageComponent implements OnInit {
  private readonly billingApi = inject(BillingApiService);
  private readonly translate = inject(TranslateService);

  protected readonly summary = signal<BillingSummaryResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadSummary();
  }

  protected planLabel(summary: BillingSummaryResponse): string {
    return summary.planType === 'prepaid'
      ? (this.translate.instant('billing.prepaidPlan') as string)
      : (this.translate.instant('billing.postpaidPlan') as string);
  }

  protected transactionType(type: BillingTransactionResponse['type']): string {
    return this.translate.instant(`billing.transactionTypes.${type}`) as string;
  }

  protected referenceLabel(transaction: BillingTransactionResponse): string {
    if (transaction.paymentIntentId) {
      return this.translate.instant('billing.references.payment') as string;
    }

    if (transaction.messageId) {
      return this.translate.instant('billing.references.message') as string;
    }

    return this.translate.instant('billing.references.manual') as string;
  }

  protected dateLabel(timestamp: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  protected formatMoney(cents: number): string {
    return formatMoney(cents);
  }

  protected formatTransactionAmount(transaction: BillingTransactionResponse): string {
    const signedCents = signedTransactionAmount(transaction);
    const sign = signedCents > 0 ? '+' : signedCents < 0 ? '-' : '';

    return `${sign}${formatMoney(Math.abs(signedCents))}`;
  }

  private async loadSummary(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.summary.set(await firstValueFrom(this.billingApi.getSummary()));
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'billing.errors.loadFailed'));
      this.summary.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}

function formatMoney(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function signedTransactionAmount(transaction: BillingTransactionResponse): number {
  if (transaction.type === 'debit' || transaction.type === 'usage') {
    return -Math.abs(transaction.amountCents);
  }

  if (transaction.type === 'credit' || transaction.type === 'refund') {
    return Math.abs(transaction.amountCents);
  }

  return transaction.amountCents;
}
