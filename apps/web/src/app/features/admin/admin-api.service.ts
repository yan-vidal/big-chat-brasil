import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
import { map, type Observable } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);

  listClients(): Observable<readonly AdminClientResponse[]> {
    return this.http
      .get<unknown>(this.api.url('/admin/clients'), this.api.authHeaders())
      .pipe(map((response) => AdminClientListResponseSchema.parse(response)));
  }

  createClient(request: AdminCreateClientRequest): Observable<AdminClientResponse> {
    return this.http
      .post<unknown>(this.api.url('/admin/clients'), request, this.api.authHeaders())
      .pipe(map((response) => AdminClientResponseSchema.parse(response)));
  }

  updateStatus(
    clientId: string,
    request: AdminUpdateClientStatusRequest,
  ): Observable<AdminClientResponse> {
    return this.http
      .patch<unknown>(this.api.url(`/admin/clients/${clientId}/status`), request, {
        ...this.api.authHeaders(),
      })
      .pipe(map((response) => AdminClientResponseSchema.parse(response)));
  }

  addPrepaidCredit(
    clientId: string,
    request: AdminAddCreditRequest,
  ): Observable<AdminClientResponse> {
    return this.http
      .post<unknown>(this.api.url(`/admin/clients/${clientId}/credits`), request, {
        ...this.api.authHeaders(),
      })
      .pipe(map((response) => AdminClientResponseSchema.parse(response)));
  }

  updatePostpaidLimit(
    clientId: string,
    request: AdminUpdateLimitRequest,
  ): Observable<AdminClientResponse> {
    return this.http
      .patch<unknown>(this.api.url(`/admin/clients/${clientId}/limit`), request, {
        ...this.api.authHeaders(),
      })
      .pipe(map((response) => AdminClientResponseSchema.parse(response)));
  }

  convertPlan(clientId: string, request: AdminConvertPlanRequest): Observable<AdminClientResponse> {
    return this.http
      .post<unknown>(this.api.url(`/admin/clients/${clientId}/plan`), request, {
        ...this.api.authHeaders(),
      })
      .pipe(map((response) => AdminClientResponseSchema.parse(response)));
  }
}
