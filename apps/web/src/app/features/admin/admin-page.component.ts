import { Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [ReactiveFormsModule],
  template: `
    <section class="grid gap-4">
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Administração
        </p>
        <h2 class="mt-2 text-2xl font-semibold">Administração</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Gerenciamento operacional de clientes, planos, créditos e limites.
        </p>
      </div>

      @if (feedback()) {
        <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
          {{ feedback() }}
        </p>
      }
      @if (error()) {
        <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {{ error() }}
        </p>
      }

      <section class="grid gap-3 rounded border border-slate-200 p-4 dark:border-slate-800">
        <h3 class="text-base font-semibold">Novo cliente</h3>
        <form
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          [formGroup]="createForm"
          (ngSubmit)="createClient()"
        >
          <label class="grid gap-1 text-sm font-medium" for="admin-new-document">
            Documento do novo cliente
            <input
              id="admin-new-document"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="documentId"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-new-name">
            Nome do novo cliente
            <input
              id="admin-new-name"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="name"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-new-password">
            Senha do novo cliente
            <input
              id="admin-new-password"
              type="password"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="password"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-new-plan">
            Plano
            <select
              id="admin-new-plan"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="planType"
            >
              <option value="prepaid">Pré-pago</option>
              <option value="postpaid">Pós-pago</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-initial-balance">
            Saldo inicial (centavos)
            <input
              id="admin-initial-balance"
              type="number"
              min="0"
              class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              formControlName="initialBalanceCents"
            />
          </label>
          <label class="grid gap-1 text-sm font-medium" for="admin-initial-limit">
            Limite mensal inicial (centavos)
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
              Criar cliente
            </button>
          </div>
        </form>
      </section>

      <section class="grid gap-3 rounded border border-slate-200 p-4 dark:border-slate-800">
        <h3 class="text-base font-semibold">Ações rápidas</h3>
        <div class="grid gap-3 md:grid-cols-3">
          <form class="grid gap-2" [formGroup]="creditForm" (ngSubmit)="addCredit()">
            <label class="grid gap-1 text-sm font-medium" for="admin-credit-client">
              Cliente pré-pago
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
              Crédito pré-pago (centavos)
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
              Adicionar crédito
            </button>
          </form>

          <form class="grid gap-2" [formGroup]="limitForm" (ngSubmit)="updateLimit()">
            <label class="grid gap-1 text-sm font-medium" for="admin-limit-client">
              Cliente pós-pago
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
              Novo limite pós-pago (centavos)
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
              Atualizar limite
            </button>
          </form>

          <form class="grid gap-2" [formGroup]="convertForm" (ngSubmit)="convertPlan()">
            <label class="grid gap-1 text-sm font-medium" for="admin-convert-client">
              Cliente para converter
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
              Novo plano
              <select
                id="admin-convert-plan"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="planType"
              >
                <option value="prepaid">Pré-pago</option>
                <option value="postpaid">Pós-pago</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-medium" for="admin-convert-balance">
              Saldo ao converter para pré-pago (centavos)
              <input
                id="admin-convert-balance"
                type="number"
                min="0"
                class="h-10 rounded border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                formControlName="initialBalanceCents"
              />
            </label>
            <label class="grid gap-1 text-sm font-medium" for="admin-convert-limit">
              Limite mensal ao converter para pós-pago (centavos)
              <input
                id="admin-convert-limit"
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
              Converter plano
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
              <th class="px-3 py-2">Nome</th>
              <th class="px-3 py-2">Documento</th>
              <th class="px-3 py-2">Role</th>
              <th class="px-3 py-2">Plano</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Financeiro</th>
              <th class="px-3 py-2">Ações</th>
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
                <td class="px-3 py-2">{{ client.role }}</td>
                <td class="px-3 py-2">{{ client.planType }}</td>
                <td class="px-3 py-2">{{ client.active ? 'Ativo' : 'Inativo' }}</td>
                <td class="px-3 py-2">{{ financialLabel(client) }}</td>
                <td class="px-3 py-2">
                  @if (client.role === 'client') {
                    <button
                      type="button"
                      class="h-9 rounded border border-slate-300 px-3 text-sm font-medium dark:border-slate-700"
                      (click)="updateStatus(client)"
                    >
                      {{ client.active ? 'Inativar' : 'Ativar' }}
                    </button>
                  } @else {
                    <span class="text-xs text-slate-500 dark:text-slate-400">Somente leitura</span>
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
      this.feedback.set('Cliente criado');
    } catch {
      this.error.set('Não foi possível criar o cliente');
    }
  }

  protected async addCredit(): Promise<void> {
    this.resetMessages();
    const clientId = this.creditForm.controls.clientId.value;

    if (!clientId) {
      this.error.set('Nenhum cliente pré-pago disponível');
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.adminApi.addPrepaidCredit(clientId, {
          amountCents: Number(this.creditForm.controls.amountCents.value),
        }),
      );
      this.replaceClient(updated);
      this.feedback.set('Crédito adicionado');
    } catch {
      this.error.set('Não foi possível adicionar crédito');
    }
  }

  protected async updateLimit(): Promise<void> {
    this.resetMessages();
    const clientId = this.limitForm.controls.clientId.value;

    if (!clientId) {
      this.error.set('Nenhum cliente pós-pago disponível');
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.adminApi.updatePostpaidLimit(clientId, {
          monthlyLimitCents: Number(this.limitForm.controls.monthlyLimitCents.value),
        }),
      );
      this.replaceClient(updated);
      this.feedback.set('Limite atualizado');
    } catch {
      this.error.set('Não foi possível atualizar limite');
    }
  }

  protected async updateStatus(client: AdminClientResponse): Promise<void> {
    this.resetMessages();

    try {
      const updated = await firstValueFrom(
        this.adminApi.updateStatus(client.id, { active: !client.active }),
      );
      this.replaceClient(updated);
      this.feedback.set('Status atualizado');
    } catch {
      this.error.set('Não foi possível atualizar status');
    }
  }

  protected async convertPlan(): Promise<void> {
    this.resetMessages();
    const clientId = this.convertForm.controls.clientId.value;

    if (!clientId) {
      this.error.set('Nenhum cliente disponível para conversão');
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
      this.feedback.set('Plano convertido');
    } catch {
      this.error.set('Não foi possível converter plano');
    }
  }

  protected financialLabel(client: AdminClientResponse): string {
    if (client.planType === 'prepaid') {
      return `Saldo ${this.formatMoney(client.balanceCents)}`;
    }

    return `Limite ${this.formatMoney(client.monthlyLimitCents ?? 0)} · Usado ${this.formatMoney(client.monthlyUsedCents)}`;
  }

  private async loadClients(): Promise<void> {
    try {
      this.clients.set(await firstValueFrom(this.adminApi.listClients()));
      this.syncActionDefaults();
    } catch {
      this.error.set('Não foi possível carregar clientes');
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
    return new Intl.NumberFormat('pt-BR', {
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
