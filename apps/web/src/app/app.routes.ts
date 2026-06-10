import { type Routes } from '@angular/router';
import { adminGuard, onboardingGuard, onboardingSetupGuard } from './core/auth/auth.guard';
import { AdminPageComponent } from './features/admin/admin-page.component';
import { BillingPageComponent } from './features/billing/billing-page.component';
import { ConversationDetailPageComponent } from './features/chat/conversation-detail-page.component';
import { ConversationsPageComponent } from './features/chat/conversations-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { OnboardingPageComponent } from './features/onboarding/onboarding-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'admin', component: AdminPageComponent, canActivate: [adminGuard] },
  { path: 'onboarding', component: OnboardingPageComponent, canActivate: [onboardingSetupGuard] },
  { path: 'conversations', component: ConversationsPageComponent, canActivate: [onboardingGuard] },
  {
    path: 'conversations/:conversationId',
    component: ConversationDetailPageComponent,
    canActivate: [onboardingGuard],
  },
  { path: 'billing', component: BillingPageComponent, canActivate: [onboardingGuard] },
  { path: '**', redirectTo: 'login' },
];
