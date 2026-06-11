import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  OnboardingResponseSchema,
  PaymentIntentResponseSchema,
  type CreatePixIntentRequest,
  type OnboardingRequest,
  type OnboardingResponse,
  type PaymentIntentResponse,
} from '@bcb/shared';
import { map, type Observable } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';

export type ConfirmPixResponse = {
  readonly paymentIntent: PaymentIntentResponse;
  readonly balanceCents: number;
};

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);

  completeOnboarding(request: OnboardingRequest): Observable<OnboardingResponse> {
    return this.http
      .post<unknown>(this.api.url('/billing/onboarding'), request, this.api.authHeaders())
      .pipe(map((response) => OnboardingResponseSchema.parse(response)));
  }

  createPixIntent(request: CreatePixIntentRequest): Observable<PaymentIntentResponse> {
    return this.http
      .post<unknown>(this.api.url('/billing/pix-intents'), request, this.api.authHeaders())
      .pipe(map((response) => PaymentIntentResponseSchema.parse(response)));
  }

  confirmPixIntent(intentId: string): Observable<ConfirmPixResponse> {
    return this.http
      .post<unknown>(
        this.api.url(`/billing/pix-intents/${intentId}/confirm`),
        {},
        this.api.authHeaders(),
      )
      .pipe(map(parseConfirmPixResponse));
  }
}

function parseConfirmPixResponse(response: unknown): ConfirmPixResponse {
  const value = response as { paymentIntent?: unknown; balanceCents?: unknown };
  const paymentIntent = PaymentIntentResponseSchema.parse(value.paymentIntent);
  const balanceCents = Number(value.balanceCents);

  if (!Number.isInteger(balanceCents) || balanceCents < 0) {
    throw new Error('Invalid PIX confirmation balance');
  }

  return { paymentIntent, balanceCents };
}
