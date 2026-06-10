import { Injectable, signal } from '@angular/core';

const SESSION_ACTIVE_KEY = 'bcb.session.active';
const ONBOARDING_COMPLETED_KEY = 'bcb.onboarding.completed';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly authenticatedSignal = signal(readBoolean(SESSION_ACTIVE_KEY));
  private readonly onboardingCompletedSignal = signal(readBoolean(ONBOARDING_COMPLETED_KEY));

  readonly authenticated = this.authenticatedSignal.asReadonly();
  readonly onboardingCompleted = this.onboardingCompletedSignal.asReadonly();

  refreshFromStorage(): void {
    this.authenticatedSignal.set(readBoolean(SESSION_ACTIVE_KEY));
    this.onboardingCompletedSignal.set(readBoolean(ONBOARDING_COMPLETED_KEY));
  }
}

function readBoolean(key: string): boolean {
  return globalThis.localStorage?.getItem(key) === 'true';
}
