import { computed, Injectable, signal } from '@angular/core';
import {
  AuthSessionResponseSchema,
  type AuthenticatedClient,
  type AuthSessionResponse,
} from '@bcb/shared';

const SESSION_KEY = 'bcb.session';

export type StoredSession = AuthSessionResponse;

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly sessionSignal = signal<StoredSession | null>(readSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly authenticated = computed(() => this.sessionSignal() !== null);
  readonly isAdmin = computed(() => this.sessionSignal()?.client.role === 'admin');
  readonly requiresOnboarding = computed(() => {
    const session = this.sessionSignal();

    return Boolean(session?.requiresOnboarding && !session.client.onboardingCompleted);
  });
  readonly onboardingCompleted = computed(() => {
    const session = this.sessionSignal();

    return Boolean(session && !session.requiresOnboarding && session.client.onboardingCompleted);
  });
  readonly token = computed(() => this.sessionSignal()?.token ?? null);

  refreshFromStorage(): void {
    this.sessionSignal.set(readSession());
  }

  setSession(session: AuthSessionResponse): void {
    const parsed = AuthSessionResponseSchema.parse(session);
    this.sessionSignal.set(parsed);
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(parsed));
  }

  updateClient(
    client: AuthenticatedClient,
    requiresOnboarding = !client.onboardingCompleted,
  ): void {
    const current = this.sessionSignal();

    if (!current) {
      return;
    }

    this.setSession({
      token: current.token,
      requiresOnboarding,
      client,
    });
  }

  markOnboardingCompleted(partialClient: Partial<AuthenticatedClient> = {}): void {
    const current = this.sessionSignal();

    if (!current) {
      return;
    }

    this.setSession({
      token: current.token,
      requiresOnboarding: false,
      client: {
        ...current.client,
        ...partialClient,
        onboardingCompleted: true,
      },
    });
  }

  clear(): void {
    this.sessionSignal.set(null);
    globalThis.localStorage?.removeItem(SESSION_KEY);
  }
}

function readSession(): StoredSession | null {
  const raw = globalThis.localStorage?.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return AuthSessionResponseSchema.parse(JSON.parse(raw));
  } catch {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return null;
  }
}
