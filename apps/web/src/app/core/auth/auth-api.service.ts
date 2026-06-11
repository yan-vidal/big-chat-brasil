import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AuthSessionResponseSchema,
  type AuthSessionRequest,
  type AuthSessionResponse,
} from '@bcb/shared';
import { map, type Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);

  createSession(request: AuthSessionRequest): Observable<AuthSessionResponse> {
    return this.http
      .post<unknown>(this.api.url('/auth/session'), request)
      .pipe(map((response) => AuthSessionResponseSchema.parse(response)));
  }
}
