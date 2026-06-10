import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BillingSummaryResponseSchema, type BillingSummaryResponse } from '@bcb/shared';
import { map, type Observable } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);

  getSummary(): Observable<BillingSummaryResponse> {
    return this.http
      .get<unknown>(this.api.url('/billing/me'), this.api.authHeaders())
      .pipe(map((response) => BillingSummaryResponseSchema.parse(response)));
  }
}
