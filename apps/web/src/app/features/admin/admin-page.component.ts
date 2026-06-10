import { Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  inferDocumentType,
  normalizeDocument,
  type AdminConvertPlanRequest,
  type AdminClientResponse,
  type AdminCreateClientRequest,
  type PlanType,
} from '@bcb/shared';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from './admin-api.service';

@Component({
  selector: 'bcb-admin-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ 'admin.kicker' | translate }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold">{{ 'admin.title' | translate }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {{ 'admin.description' | translate }}
        </p>
      </div>

      @if (feedback()) {
        <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
          {{ feedback()! | translate }}
        </p>
      }
      @if (error()) {
        <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {{ error()! | translate }}
        </p>
      }

      <section class="grid gap-3 rounded border border-slate-200 p-4 dark:border-slate-800">
        <h3 class="text-base font-semibold">{{ 'admin.create.title' | translate }}</h3>
        <form
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          [formGroup]="createForm"
          (ngSubmit)="createClient()"
        >
          <label class="grid gap-1 text-sm font-medium" for="admin-new-document">
            {{ 'admin.create.documentLabel' | translate }}
            <input
              id="admin-new-document"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="documentId"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-new-name">
            {{ 'admin.create.nameLabel' | translate }}
            <input
              id="admin-new-name"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="name"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-new-password">
            {{ 'admin.create.passwordLabel' | translate }}
            <input
              id="admin-new-password"
              type="password"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="password"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-new-plan">
            {{ 'admin.create.planLabel' | translate }}
            <select
              id="admin-new-plan"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="planType"
            >
              <option value="prepaid">{{ 'admin.plans.prepaid' | translate }}</option>
              <option value="postpaid">{{ 'admin.plans.postpaid' | translate }}</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-initial-balance">
            {{ 'admin.create.initialBalanceLabel' | translate }}
            <input
              id="admin-initial-balance"
              type="number"
              min="0"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="initialBalanceCents"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-initial-limit">
            {{ 'admin.create.monthlyLimitLabel' | translate }}
            <input
              id="admin-initial-limit"
              type="number"
              min="1"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="monthlyLimitCents"
            />
          </label>
          <div class="flex items-end">
            <button
              type="submit"
              class="h-10 rounded bg-slate-900 px-4 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-950"
            >
              {{ 'admin.create.submit' | translate }}
            </button>
          </div>
        </form>
      </section>

      <section class="grid gap-3 rounded border border-slate-200 p-4 dark:border-slate-800">
        <h3 class="text-base font-semibold">{{ 'admin.quickActions.title' | translate }}</h3>
        <div class="grid gap-3 md:grid-cols-3">
          <form class="grid gap-2" [formGroup]="creditForm" (ngSubmit)="addCredit()">
            <label class="grid gap-1 text-sm font-medium" for="admin-credit-client">
              {{ 'admin.credit.clientLabel' | translate }}
              <select
                id="admin-credit-client"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="clientId"
              >
                @for (client of prepaidClients(); track client.id) {
                  <option [value]="client.id">{{ client.name }}</option>
                }
              </select>
            </label>
            <label class="grid gap-1 text-sm font-medium" for="admin-credit">
              {{ 'admin.credit.amountLabel' | translate }}
              <input
                id="admin-credit"
                type="number"
                min="1"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="amountCents"
              />
            </label>
            <button
              type="submit"
              class="h-10 w-fit rounded bg-slate-900 px-4 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-950"
            >
              {{ 'admin.credit.submit' | translate }}
            </button>
          </form>

          <form class="grid gap-2" [formGroup]="limitForm" (ngSubmit)="updateLimit()">
            <label class="grid gap-1 text-sm font-medium" for="admin-limit-client">
              {{ 'admin.limit.clientLabel' | translate }}
              <select
                id="admin-limit-client"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="clientId"
              >
                @for (client of postpaidClients(); track client.id) {
                  <option [value]="client.id">{{ client.name }}</option>
                }
              </select>
            </label>
            <label class="grid gap-1 text-sm font-medium" for="admin-limit">
              {{ 'admin.limit.amountLabel' | translate }}
              <input
                id="admin-limit"
                type="number"
                min="1"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="monthlyLimitCents"
              />
            </label>
            <button
              type="submit"
              class="h-10 w-fit rounded bg-slate-900 px-4 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-950"
            >
              {{ 'admin.limit.submit' | translate }}
            </button>
          </form>

          <form class="grid gap-2" [formGroup]="convertForm" (ngSubmit)="convertPlan()">
            <label class="grid gap-1 text-sm font-medium" for="admin-convert-client">
              {{ 'admin.convert.clientLabel' | translate }}
              <select
                id="admin-convert-client"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="clientId"
              >
                @for (client of manageableClients(); track client.id) {
                  <option [value]="client.id">{{ client.name }}</option>
                }
              </select>
            </label>
            <label class="grid gap-1 text-sm font-medium" for="admin-convert-plan">
              {{ 'admin.convert.planLabel' | translate }}
              <select
                id="admin-convert-plan"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="planType"
              >
                <option value="prepaid">{{ 'admin.plans.prepaid' | translate }}</option>
                <option value="postpaid">{{ 'admin.plans.postpaid' | translate }}</option>
              </select>
            </label>
            @if (convertForm.controls.planType.value === 'prepaid') {
              <label class="grid gap-1 text-sm font-medium" for="admin-convert-balance">
                {{ 'admin.convert.balanceLabel' | translate }}
                <input
                  id="admin-convert-balance"
                  type="number"
                  min="0"
                  class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                  formControlName="initialBalanceCents"
                />
              </label>
            } @else {
              <label class="grid gap-1 text-sm font-medium" for="admin-convert-limit">
                {{ 'admin.convert.limitLabel' | translate }}
                <input
                  id="admin-convert-limit"
                  type="number"
                  min="1"
                  class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                  formControlName="monthlyLimitCents"
                />
              </label>
            }
            <button
              type="submit"
              class="h-10 w-fit rounded bg-slate-900 px-4 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-950"
            >
              {{ 'admin.convert.submit' | translate }}
            </button>
          </form>
        </div>
      </section>

      <section class="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
        <table class="min-w-full border-collapse text-left text-sm">
          <thead
            class="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300"
          >
            <tr>
              <th class="px-3 py-2">{{ 'admin.table.name' | translate }}</th>
              <th class="px-3 py-2">{{ 'admin.table.document' | translate }}</th>
              <th class="px-3 py-2">{{ 'admin.table.role' | translate }}</th>
              <th class="px-3 py-2">{{ 'admin.table.plan' | translate }}</th>
              <th class="px-3 py-2">{{ 'admin.table.status' | translate }}</th>
              <th class="px-3 py-2">{{ 'admin.table.financial' | translate }}</th>
              <th class="px-3 py-2">{{ 'admin.table.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (client of clients(); track client.id) {
              <tr
                class="border-t border-slate-200 transition-colors dark:border-slate-800"
                [attr.data-client-id]="client.id"
                [class.ring-2]="highlightedClientId() === client.id"
                [class.ring-inset]="highlightedClientId() === client.id"
                [class.ring-emerald-500]="highlightedClientId() === client.id"
              >
                <td class="px-3 py-2 font-medium">{{ client.name }}</td>
                <td class="px-3 py-2">{{ client.documentId }}</td>
                <td class="px-3 py-2">{{ roleLabel(client.role) }}</td>
                <td class="px-3 py-2">{{ planLabel(client.planType) }}</td>
                <td class="px-3 py-2">
                  {{
                    (client.active ? 'admin.status.active' : 'admin.status.inactive') | translate
                  }}
                </td>
                <td class="px-3 py-2">{{ financialLabel(client) }}</td>
                <td class="px-3 py-2">
                  @if (client.role === 'client') {
                    <button
                      type="button"
                      class="h-9 rounded border border-slate-300 px-3 text-sm font-medium dark:border-slate-700"
                      (click)="updateStatus(client)"
                    >
                      {{
                        (client.active ? 'admin.actions.deactivate' : 'admin.actions.activate')
                          | translate
                      }}
                    </button>
                  } @else {
                    <span class="text-xs text-slate-500 dark:text-slate-400">
                      {{ 'admin.actions.readOnly' | translate }}
                    </span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
})
export class AdminPageComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly adminApi = inject(AdminApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly translate = inject(TranslateService);

  protected readonly clients = signal<readonly AdminClientResponse[]>([]);
  protected readonly feedback = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly highlightedClientId = signal<string | null>(null);
  protected readonly manageableClients = computed(() =>
    this.clients().filter((client) => client.role === 'client'),
  );
  protected readonly prepaidClients = computed(() =>
    this.manageableClients().filter((client) => client.planType === 'prepaid'),
  );
  protected readonly postpaidClients = computed(() =>
    this.manageableClients().filter((client) => client.planType === 'postpaid'),
  );

  protected readonly createForm = this.formBuilder.group({
    documentId: ['', [Validators.required]],
    password: ['', [Validators.required]],
    name: ['', [Validators.required]],
    planType: ['prepaid' as 'prepaid' | 'postpaid', [Validators.required]],
    initialBalanceCents: [0],
    monthlyLimitCents: [10000],
  });
  protected readonly creditForm = this.formBuilder.group({
    clientId: [''],
    amountCents: [0, [Validators.required, Validators.min(1)]],
  });
  protected readonly limitForm = this.formBuilder.group({
    clientId: [''],
    monthlyLimitCents: [0, [Validators.required, Validators.min(1)]],
  });
  protected readonly convertForm = this.formBuilder.group({
    clientId: [''],
    planType: ['postpaid' as PlanType, [Validators.required]],
    initialBalanceCents: [0],
    monthlyLimitCents: [10000, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    void this.loadClients();
  }

  protected async createClient(): Promise<void> {
    this.resetMessages();

    try {
      const documentId = normalizeDocument(this.createForm.controls.documentId.value);
      const planType = this.createForm.controls.planType.value;
      const request: AdminCreateClientRequest =
        planType === 'postpaid'
          ? {
              documentId,
              documentType: inferDocumentType(documentId),
              password: this.createForm.controls.password.value,
              name: this.createForm.controls.name.value,
              planType: 'postpaid',
              monthlyLimitCents: Number(this.createForm.controls.monthlyLimitCents.value),
            }
          : {
              documentId,
              documentType: inferDocumentType(documentId),
              password: this.createForm.controls.password.value,
              name: this.createForm.controls.name.value,
              planType: 'prepaid',
              initialBalanceCents: Number(this.createForm.controls.initialBalanceCents.value),
            };
      const client = await firstValueFrom(this.adminApi.createClient(request));
      this.replaceClient(client);
      this.resetCreateForm();
      this.highlightAndScrollToClient(client.id);
      this.feedback.set('admin.feedback.clientCreated');
    } catch {
      this.error.set('admin.errors.createFailed');
    }
  }

  protected async addCredit(): Promise<void> {
    this.resetMessages();
    const clientId = this.creditForm.controls.clientId.value;

    if (!clientId) {
      this.error.set('admin.errors.noPrepaidClient');
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.adminApi.addPrepaidCredit(clientId, {
          amountCents: Number(this.creditForm.controls.amountCents.value),
        }),
      );
      this.replaceClient(updated);
      this.feedback.set('admin.feedback.creditAdded');
    } catch {
      this.error.set('admin.errors.creditFailed');
    }
  }

  protected async updateLimit(): Promise<void> {
    this.resetMessages();
    const clientId = this.limitForm.controls.clientId.value;

    if (!clientId) {
      this.error.set('admin.errors.noPostpaidClient');
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.adminApi.updatePostpaidLimit(clientId, {
          monthlyLimitCents: Number(this.limitForm.controls.monthlyLimitCents.value),
        }),
      );
      this.replaceClient(updated);
      this.feedback.set('admin.feedback.limitUpdated');
    } catch {
      this.error.set('admin.errors.limitFailed');
    }
  }

  protected async updateStatus(client: AdminClientResponse): Promise<void> {
    this.resetMessages();

    try {
      const updated = await firstValueFrom(
        this.adminApi.updateStatus(client.id, { active: !client.active }),
      );
      this.replaceClient(updated);
      this.feedback.set('admin.feedback.statusUpdated');
    } catch {
      this.error.set('admin.errors.statusFailed');
    }
  }

  protected async convertPlan(): Promise<void> {
    this.resetMessages();
    const clientId = this.convertForm.controls.clientId.value;

    if (!clientId) {
      this.error.set('admin.errors.noConvertibleClient');
      return;
    }

    const planType = this.convertForm.controls.planType.value;
    const request: AdminConvertPlanRequest =
      planType === 'postpaid'
        ? {
            planType,
            monthlyLimitCents: Number(this.convertForm.controls.monthlyLimitCents.value),
          }
        : {
            planType,
            balanceCents: Number(this.convertForm.controls.initialBalanceCents.value),
          };

    try {
      const updated = await firstValueFrom(this.adminApi.convertPlan(clientId, request));
      this.replaceClient(updated);
      this.feedback.set('admin.feedback.planConverted');
    } catch {
      this.error.set('admin.errors.convertFailed');
    }
  }

  protected financialLabel(client: AdminClientResponse): string {
    if (client.planType === 'prepaid') {
      return this.translate.instant('admin.financial.balance', {
        amount: this.formatMoney(client.balanceCents),
      }) as string;
    }

    return this.translate.instant('admin.financial.limitUsage', {
      limit: this.formatMoney(client.monthlyLimitCents ?? 0),
      used: this.formatMoney(client.monthlyUsedCents),
    }) as string;
  }

  protected planLabel(planType: PlanType): string {
    return this.translate.instant(`admin.plans.${planType}`) as string;
  }

  protected roleLabel(role: AdminClientResponse['role']): string {
    return this.translate.instant(`admin.roles.${role}`) as string;
  }

  private async loadClients(): Promise<void> {
    try {
      this.clients.set(await firstValueFrom(this.adminApi.listClients()));
      this.syncActionDefaults();
    } catch {
      this.error.set('admin.errors.loadFailed');
    }
  }

  private replaceClient(client: AdminClientResponse): void {
    const existing = this.clients();
    const next = existing.some((item) => item.id === client.id)
      ? existing.map((item) => (item.id === client.id ? client : item))
      : [...existing, client];

    this.clients.set(next);
    this.syncActionDefaults();
  }

  private resetMessages(): void {
    this.feedback.set(null);
    this.error.set(null);
  }

  private resetCreateForm(): void {
    this.createForm.reset({
      documentId: '',
      password: '',
      name: '',
      planType: 'prepaid',
      initialBalanceCents: 0,
      monthlyLimitCents: 10000,
    });
  }

  private highlightAndScrollToClient(clientId: string): void {
    this.highlightedClientId.set(clientId);

    setTimeout(() => {
      this.host.nativeElement
        .querySelector(`[data-client-id="${clientId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat(this.translate.currentLang() ?? 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  }

  private syncActionDefaults(): void {
    const prepaid = this.prepaidClients();
    const postpaid = this.postpaidClients();
    const manageable = this.manageableClients();

    if (!prepaid.some((client) => client.id === this.creditForm.controls.clientId.value)) {
      this.creditForm.controls.clientId.setValue(prepaid[0]?.id ?? '');
    }

    if (!postpaid.some((client) => client.id === this.limitForm.controls.clientId.value)) {
      this.limitForm.controls.clientId.setValue(postpaid[0]?.id ?? '');
    }

    if (!manageable.some((client) => client.id === this.convertForm.controls.clientId.value)) {
      this.convertForm.controls.clientId.setValue(manageable[0]?.id ?? '');
    }
  }
}
