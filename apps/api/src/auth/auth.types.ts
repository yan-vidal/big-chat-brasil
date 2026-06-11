import type { DocumentType, JwtPayload, PlanType, Role } from '@bcb/shared';

export type AuthIdentity = {
  readonly accountId: string;
  readonly documentId: string;
  readonly documentType: DocumentType;
  readonly passwordHash: string;
  readonly role: Role;
  readonly active: boolean;
  readonly clientId: string;
  readonly name: string;
  readonly planType: PlanType;
  readonly onboardingCompleted: boolean;
  readonly balanceCents: number;
  readonly monthlyLimitCents: number | null;
  readonly monthlyUsedCents: number;
};

export type AuthenticatedRequest = {
  readonly headers?: Record<string, string | string[] | undefined>;
  auth?: JwtPayload;
};
