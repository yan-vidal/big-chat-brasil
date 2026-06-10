import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionStore } from './session.store';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  session.refreshFromStorage();

  return session.authenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const onboardingGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  session.refreshFromStorage();

  if (!session.authenticated()) {
    return router.createUrlTree(['/login']);
  }

  return session.onboardingCompleted() ? true : router.createUrlTree(['/onboarding']);
};

export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  session.refreshFromStorage();

  if (!session.authenticated()) {
    return router.createUrlTree(['/login']);
  }

  return session.isAdmin() ? true : router.createUrlTree(['/conversations']);
};
