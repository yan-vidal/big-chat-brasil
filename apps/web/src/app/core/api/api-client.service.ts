import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../auth/session.store';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL_KEY = 'bcb.api.baseUrl';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly session = inject(SessionStore);
  private readonly baseUrl = resolveApiBaseUrl();

  url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  authHeaders(): { readonly headers: HttpHeaders } {
    const token = this.session.token();

    return {
      headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders(),
    };
  }
}

function resolveApiBaseUrl(): string {
  return (
    globalThis.localStorage?.getItem(API_BASE_URL_KEY) ??
    runtimeConfig().apiBaseUrl ??
    DEFAULT_API_BASE_URL
  );
}

function runtimeConfig(): { readonly apiBaseUrl?: string } {
  return (
    (
      globalThis as typeof globalThis & {
        readonly __BCB_RUNTIME_CONFIG__?: { readonly apiBaseUrl?: string };
      }
    ).__BCB_RUNTIME_CONFIG__ ?? {}
  );
}
