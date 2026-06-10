import { Injectable } from '@nestjs/common';
import {
  AdminClientListResponseSchema,
  AdminClientResponseSchema,
  type AdminAddCreditRequest,
  type AdminClientResponse,
  type AdminConvertPlanRequest,
  type AdminCreateClientRequest,
  type AdminUpdateClientStatusRequest,
  type AdminUpdateLimitRequest,
} from '@bcb/shared';
import { AdminRepository } from './admin.repository.js';

type AdminClientRecord = {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly documentId: string;
  readonly documentType: 'CPF' | 'CNPJ';
  readonly role: 'client' | 'admin';
  readonly active: boolean;
  readonly planType: 'prepaid' | 'postpaid';
  readonly onboardingCompleted: boolean;
  readonly balanceCents: number;
  readonly monthlyLimitCents?: number | null;
  readonly monthlyUsedCents: number;
  readonly usageMonth: string | null;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
};

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async listClients(): Promise<readonly AdminClientResponse[]> {
    const clients = await this.adminRepository.listClients();

    return AdminClientListResponseSchema.parse(
      clients.map((client) => this.toAdminClientResponse(client)),
    );
  }

  async createClient(input: AdminCreateClientRequest): Promise<AdminClientResponse> {
    return this.toParsedResponse(await this.adminRepository.createClient(input));
  }

  async updateStatus(
    clientId: string,
    input: AdminUpdateClientStatusRequest,
  ): Promise<AdminClientResponse> {
    return this.toParsedResponse(await this.adminRepository.updateStatus(clientId, input));
  }

  async addPrepaidCredit(
    clientId: string,
    input: AdminAddCreditRequest,
  ): Promise<AdminClientResponse> {
    return this.toParsedResponse(await this.adminRepository.addPrepaidCredit(clientId, input));
  }

  async updatePostpaidLimit(
    clientId: string,
    input: AdminUpdateLimitRequest,
  ): Promise<AdminClientResponse> {
    return this.toParsedResponse(await this.adminRepository.updatePostpaidLimit(clientId, input));
  }

  async convertPlan(
    clientId: string,
    input: AdminConvertPlanRequest,
  ): Promise<AdminClientResponse> {
    return this.toParsedResponse(await this.adminRepository.convertPlan(clientId, input));
  }

  private toParsedResponse(client: AdminClientRecord) {
    return AdminClientResponseSchema.parse(this.toAdminClientResponse(client));
  }

  private toAdminClientResponse(client: AdminClientRecord): AdminClientResponse {
    return AdminClientResponseSchema.parse({
      ...client,
      createdAt: this.toIso(client.createdAt),
      updatedAt: this.toIso(client.updatedAt),
      ...(client.monthlyLimitCents === null ? { monthlyLimitCents: undefined } : {}),
    });
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}
