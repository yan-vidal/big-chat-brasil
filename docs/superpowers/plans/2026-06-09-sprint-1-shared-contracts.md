# Sprint 1 Shared Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish `@bcb/shared` as the single source of truth for BCB enums, CPF/CNPJ validation, message pricing, and Zod request/response contracts used by API and web.

**Architecture:** Keep pure rules separate from transport contracts. `enums.ts` owns stable value sets and inferred types, `documents.ts` owns normalization/check-digit rules, `money.ts` owns message costs, and `schemas/` groups API contracts by domain while reusing common schemas. The root barrel exports every public symbol so API/web never import package internals.

**Tech Stack:** TypeScript 6.0.3 strict mode, Zod 4.4.3, Vitest 4.1.8.

---

## Contract Decisions Already Approved

- Money is integer cents in every contract.
- Auth request includes `documentId`, inferred `documentType`, and `password`; the schema rejects a mismatched type.
- CPF/CNPJ formatting characters and whitespace are normalized, but letters are never silently removed.
- `inferDocumentType` infers by normalized length/shape; check-digit validity remains the responsibility of `CpfSchema`, `CnpjSchema`, and `DocumentIdSchema`.
- `SendMessageRequestSchema` requires at least `conversationId` or `recipientId`, matching the architecture example.
- API timestamps use ISO 8601 strings with timezone offsets.
- `MESSAGE_COST_CENTS.normal = 25`, `MESSAGE_COST_CENTS.urgent = 50`, and `ESTIMATED_DELIVERY_SECONDS = 5`.

## File Structure

- `packages/shared/src/enums.ts`: stable tuples, Zod enum schemas, and inferred enum types.
- `packages/shared/src/documents.ts`: normalization, CPF/CNPJ validation, type inference, and document schemas.
- `packages/shared/src/money.ts`: message cost constants and lookup function.
- `packages/shared/src/schemas/common.ts`: UUID, ISO datetime, cents, month, and API error schemas.
- `packages/shared/src/schemas/auth.ts`: JWT, auth session, current client, and response contracts.
- `packages/shared/src/schemas/onboarding.ts`: prepaid/postpaid onboarding discriminated union.
- `packages/shared/src/schemas/billing.ts`: PIX intent, transaction, and billing summary contracts.
- `packages/shared/src/schemas/conversation.ts`: recipient and conversation contracts.
- `packages/shared/src/schemas/message.ts`: send, detail, and status contracts.
- `packages/shared/src/index.ts`: package public barrel.
- Tests live beside the corresponding source files.

---

### Task 1: Stable Enums

**Files:**

- Test: `packages/shared/src/enums.spec.ts`
- Create: `packages/shared/src/enums.ts`

- [x] **Step 1: Write failing enum tests**

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DocumentTypeSchema,
  MessagePrioritySchema,
  MessageStatusSchema,
  PlanTypeSchema,
  RoleSchema,
  type MessageStatus,
  type Role,
} from './enums';

describe('shared enums', () => {
  it('accepts stable contract values', () => {
    expect(RoleSchema.parse('admin')).toBe('admin');
    expect(PlanTypeSchema.parse('prepaid')).toBe('prepaid');
    expect(MessagePrioritySchema.parse('urgent')).toBe('urgent');
    expect(MessageStatusSchema.parse('delivered')).toBe('delivered');
    expect(DocumentTypeSchema.parse('CNPJ')).toBe('CNPJ');
  });

  it('rejects values outside the contract', () => {
    expect(RoleSchema.safeParse('owner').success).toBe(false);
    expect(MessageStatusSchema.safeParse('cancelled').success).toBe(false);
  });

  it('infers literal union types', () => {
    expectTypeOf<Role>().toEqualTypeOf<'client' | 'admin'>();
    expectTypeOf<MessageStatus>().toEqualTypeOf<
      'queued' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed'
    >();
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @bcb/shared test -- src/enums.spec.ts`

Expected: FAIL because `./enums` does not exist.

- [x] **Step 3: Implement enum schemas and types**

```ts
import { z } from 'zod';

export const ROLE_VALUES = ['client', 'admin'] as const;
export const PLAN_TYPE_VALUES = ['prepaid', 'postpaid'] as const;
export const DOCUMENT_TYPE_VALUES = ['CPF', 'CNPJ'] as const;
export const MESSAGE_PRIORITY_VALUES = ['normal', 'urgent'] as const;
export const MESSAGE_STATUS_VALUES = [
  'queued',
  'processing',
  'sent',
  'delivered',
  'read',
  'failed',
] as const;
export const SENDER_TYPE_VALUES = ['client', 'user'] as const;
export const PAYMENT_INTENT_STATUS_VALUES = ['pending', 'confirmed'] as const;
export const PAYMENT_METHOD_VALUES = ['pix'] as const;
export const BILLING_TRANSACTION_TYPE_VALUES = ['credit', 'debit', 'usage', 'refund'] as const;

export const RoleSchema = z.enum(ROLE_VALUES);
export const PlanTypeSchema = z.enum(PLAN_TYPE_VALUES);
export const DocumentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES);
export const MessagePrioritySchema = z.enum(MESSAGE_PRIORITY_VALUES);
export const MessageStatusSchema = z.enum(MESSAGE_STATUS_VALUES);
export const SenderTypeSchema = z.enum(SENDER_TYPE_VALUES);
export const PaymentIntentStatusSchema = z.enum(PAYMENT_INTENT_STATUS_VALUES);
export const PaymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES);
export const BillingTransactionTypeSchema = z.enum(BILLING_TRANSACTION_TYPE_VALUES);

export type Role = z.infer<typeof RoleSchema>;
export type PlanType = z.infer<typeof PlanTypeSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type MessagePriority = z.infer<typeof MessagePrioritySchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type SenderType = z.infer<typeof SenderTypeSchema>;
export type PaymentIntentStatus = z.infer<typeof PaymentIntentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type BillingTransactionType = z.infer<typeof BillingTransactionTypeSchema>;
```

- [x] **Step 4: Verify GREEN**

Run: `pnpm --filter @bcb/shared test -- src/enums.spec.ts`

Expected: 3 tests pass.

---

### Task 2: CPF/CNPJ Rules

**Files:**

- Test: `packages/shared/src/documents.spec.ts`
- Create: `packages/shared/src/documents.ts`

- [x] **Step 1: Write failing document tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  CnpjSchema,
  CpfSchema,
  DocumentIdSchema,
  inferDocumentType,
  isValidCnpj,
  isValidCpf,
  normalizeDocument,
} from './documents';

describe('document normalization and validation', () => {
  it('normalizes formatted CPF and CNPJ values', () => {
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725');
    expect(normalizeDocument('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('validates CPF check digits', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('validates CNPJ check digits', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11444777000161')).toBe(true);
    expect(isValidCnpj('11222333000180')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });

  it('infers document type from normalized shape', () => {
    expect(inferDocumentType('123.456.789-09')).toBe('CPF');
    expect(inferDocumentType('11.222.333/0001-81')).toBe('CNPJ');
    expect(() => inferDocumentType('123')).toThrow('Documento deve ter 11 ou 14 dígitos');
    expect(() => inferDocumentType('abc12345678909')).toThrow(
      'Documento deve conter apenas dígitos',
    );
  });

  it('parses and normalizes valid schemas', () => {
    expect(CpfSchema.parse('529.982.247-25')).toBe('52998224725');
    expect(CnpjSchema.parse('11.222.333/0001-81')).toBe('11222333000181');
    expect(DocumentIdSchema.parse('123.456.789-09')).toBe('12345678909');
  });

  it('rejects invalid check digits and letters', () => {
    expect(DocumentIdSchema.safeParse('529.982.247-24').success).toBe(false);
    expect(DocumentIdSchema.safeParse('abc52998224725').success).toBe(false);
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @bcb/shared test -- src/documents.spec.ts`

Expected: FAIL because `./documents` does not exist.

- [x] **Step 3: Implement document rules**

```ts
import { z } from 'zod';
import type { DocumentType } from './enums';

const FORMATTING_CHARACTERS = /[./\s-]/g;
const DIGITS_ONLY = /^\d+$/;
const REPEATED_DIGITS = /^(\d)\1+$/;

export function normalizeDocument(value: string): string {
  return value.trim().replace(FORMATTING_CHARACTERS, '');
}

function calculateCheckDigit(base: string, weights: readonly number[]): number {
  const sum = base
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const normalized = normalizeDocument(value);
  if (!/^\d{11}$/.test(normalized) || REPEATED_DIGITS.test(normalized)) {
    return false;
  }

  const firstDigit = calculateCheckDigit(normalized.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateCheckDigit(
    `${normalized.slice(0, 9)}${firstDigit}`,
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return normalized.endsWith(`${firstDigit}${secondDigit}`);
}

export function isValidCnpj(value: string): boolean {
  const normalized = normalizeDocument(value);
  if (!/^\d{14}$/.test(normalized) || REPEATED_DIGITS.test(normalized)) {
    return false;
  }

  const firstDigit = calculateCheckDigit(
    normalized.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateCheckDigit(
    `${normalized.slice(0, 12)}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return normalized.endsWith(`${firstDigit}${secondDigit}`);
}

export function inferDocumentType(value: string): DocumentType {
  const normalized = normalizeDocument(value);
  if (!DIGITS_ONLY.test(normalized)) {
    throw new Error('Documento deve conter apenas dígitos');
  }
  if (normalized.length === 11) {
    return 'CPF';
  }
  if (normalized.length === 14) {
    return 'CNPJ';
  }
  throw new Error('Documento deve ter 11 ou 14 dígitos');
}

const NormalizedDocumentStringSchema = z
  .string()
  .trim()
  .min(1)
  .transform(normalizeDocument)
  .refine((value) => DIGITS_ONLY.test(value), {
    message: 'Documento deve conter apenas dígitos',
  });

export const CpfSchema = NormalizedDocumentStringSchema.refine(isValidCpf, {
  message: 'CPF inválido',
});

export const CnpjSchema = NormalizedDocumentStringSchema.refine(isValidCnpj, {
  message: 'CNPJ inválido',
});

export const DocumentIdSchema = z.union([CpfSchema, CnpjSchema]);
```

- [x] **Step 4: Verify GREEN**

Run: `pnpm --filter @bcb/shared test -- src/documents.spec.ts`

Expected: 6 tests pass.

---

### Task 3: Message Pricing

**Files:**

- Test: `packages/shared/src/money.spec.ts`
- Create: `packages/shared/src/money.ts`

- [x] **Step 1: Write failing pricing tests**

```ts
import { describe, expect, it } from 'vitest';
import { ESTIMATED_DELIVERY_SECONDS, MESSAGE_COST_CENTS, getMessageCostCents } from './money';

describe('message pricing', () => {
  it('prices normal messages at 25 cents', () => {
    expect(getMessageCostCents('normal')).toBe(25);
  });

  it('prices urgent messages at 50 cents', () => {
    expect(getMessageCostCents('urgent')).toBe(50);
  });

  it('exposes the simulated delivery estimate', () => {
    expect(MESSAGE_COST_CENTS).toEqual({ normal: 25, urgent: 50 });
    expect(ESTIMATED_DELIVERY_SECONDS).toBe(5);
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @bcb/shared test -- src/money.spec.ts`

Expected: FAIL because `./money` does not exist.

- [x] **Step 3: Implement pricing**

```ts
import type { MessagePriority } from './enums';

export const MESSAGE_COST_CENTS = {
  normal: 25,
  urgent: 50,
} as const satisfies Record<MessagePriority, number>;

export const ESTIMATED_DELIVERY_SECONDS = 5;

export function getMessageCostCents(priority: MessagePriority): number {
  return MESSAGE_COST_CENTS[priority];
}
```

- [x] **Step 4: Verify GREEN**

Run: `pnpm --filter @bcb/shared test -- src/money.spec.ts`

Expected: 3 tests pass.

---

### Task 4: Common, Auth, and Onboarding Contracts

**Files:**

- Test: `packages/shared/src/schemas/contracts.spec.ts`
- Create: `packages/shared/src/schemas/common.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/schemas/onboarding.ts`

- [x] **Step 1: Write the first failing contract tests**

Create `contracts.spec.ts` with auth and onboarding cases:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import { AuthSessionRequestSchema, type AuthSessionRequest } from './auth';
import { OnboardingRequestSchema, type OnboardingRequest } from './onboarding';

describe('auth and onboarding contracts', () => {
  it('normalizes a valid auth document', () => {
    expect(
      AuthSessionRequestSchema.parse({
        documentId: '529.982.247-25',
        documentType: 'CPF',
        password: 'Demo@123',
      }),
    ).toEqual({
      documentId: '52998224725',
      documentType: 'CPF',
      password: 'Demo@123',
    });
  });

  it('rejects a mismatched document type', () => {
    expect(
      AuthSessionRequestSchema.safeParse({
        documentId: '52998224725',
        documentType: 'CNPJ',
        password: 'Demo@123',
      }).success,
    ).toBe(false);
  });

  it('requires a monthly limit for postpaid onboarding', () => {
    expect(
      OnboardingRequestSchema.safeParse({
        name: 'Empresa ABC',
        planType: 'postpaid',
      }).success,
    ).toBe(false);
  });

  it('accepts prepaid onboarding without payment data', () => {
    expect(
      OnboardingRequestSchema.parse({
        name: 'Empresa ABC',
        planType: 'prepaid',
      }),
    ).toEqual({
      name: 'Empresa ABC',
      planType: 'prepaid',
    });
  });

  it('infers request types from Zod schemas', () => {
    expectTypeOf<AuthSessionRequest>().toEqualTypeOf<{
      documentId: string;
      documentType: 'CPF' | 'CNPJ';
      password: string;
    }>();
    expectTypeOf<OnboardingRequest>().toMatchTypeOf<
      | { name: string; planType: 'prepaid' }
      | { name: string; planType: 'postpaid'; monthlyLimitCents: number }
    >();
  });
});
```

- [x] **Step 2: Run and verify RED**

Run: `pnpm --filter @bcb/shared test -- src/schemas/contracts.spec.ts`

Expected: FAIL because auth/onboarding exports do not exist.

- [x] **Step 3: Implement common schemas**

```ts
import { z } from 'zod';

export const IdSchema = z.uuid();
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const MoneyCentsSchema = z.number().int().nonnegative();
export const PositiveMoneyCentsSchema = z.number().int().positive();
export const UsageMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
```

- [x] **Step 4: Implement auth schemas**

```ts
import { z } from 'zod';
import { DocumentIdSchema, inferDocumentType } from '../documents';
import { DocumentTypeSchema, PlanTypeSchema, RoleSchema } from '../enums';
import { IdSchema, MoneyCentsSchema } from './common';

export const JwtPayloadSchema = z.object({
  sub: IdSchema,
  documentId: DocumentIdSchema,
  documentType: DocumentTypeSchema,
  role: RoleSchema,
  clientId: IdSchema.optional(),
});

export const AuthSessionRequestSchema = z
  .object({
    documentId: DocumentIdSchema,
    documentType: DocumentTypeSchema,
    password: z.string().min(1).max(72),
  })
  .superRefine((value, context) => {
    if (inferDocumentType(value.documentId) !== value.documentType) {
      context.addIssue({
        code: 'custom',
        path: ['documentType'],
        message: 'Tipo de documento não corresponde ao documento informado',
      });
    }
  });

export const AuthenticatedClientSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).nullable(),
  documentId: DocumentIdSchema,
  documentType: DocumentTypeSchema,
  role: RoleSchema,
  planType: PlanTypeSchema.nullable(),
  active: z.boolean(),
  onboardingCompleted: z.boolean(),
  balanceCents: MoneyCentsSchema.optional(),
  monthlyLimitCents: MoneyCentsSchema.optional(),
  monthlyUsedCents: MoneyCentsSchema.optional(),
});

export const AuthSessionResponseSchema = z.object({
  token: z.string().min(1),
  requiresOnboarding: z.boolean(),
  client: AuthenticatedClientSchema,
});

export const AuthMeResponseSchema = AuthenticatedClientSchema;

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export type AuthSessionRequest = z.infer<typeof AuthSessionRequestSchema>;
export type AuthenticatedClient = z.infer<typeof AuthenticatedClientSchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
```

- [x] **Step 5: Implement onboarding schemas**

```ts
import { z } from 'zod';
import { AuthenticatedClientSchema } from './auth';
import { PositiveMoneyCentsSchema } from './common';

const ClientNameSchema = z.string().trim().min(1).max(120);

export const PrepaidOnboardingRequestSchema = z.object({
  name: ClientNameSchema,
  planType: z.literal('prepaid'),
});

export const PostpaidOnboardingRequestSchema = z.object({
  name: ClientNameSchema,
  planType: z.literal('postpaid'),
  monthlyLimitCents: PositiveMoneyCentsSchema,
});

export const OnboardingRequestSchema = z.discriminatedUnion('planType', [
  PrepaidOnboardingRequestSchema,
  PostpaidOnboardingRequestSchema,
]);

export const OnboardingResponseSchema = z.object({
  client: AuthenticatedClientSchema,
});

export type PrepaidOnboardingRequest = z.infer<typeof PrepaidOnboardingRequestSchema>;
export type PostpaidOnboardingRequest = z.infer<typeof PostpaidOnboardingRequestSchema>;
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>;
export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;
```

- [x] **Step 6: Verify auth/onboarding GREEN**

Run: `pnpm --filter @bcb/shared test -- src/schemas/contracts.spec.ts`

Expected: 5 tests pass.

---

### Task 5: Billing, Conversation, and Message Contracts

**Files:**

- Modify: `packages/shared/src/schemas/contracts.spec.ts`
- Create: `packages/shared/src/schemas/billing.ts`
- Create: `packages/shared/src/schemas/conversation.ts`
- Create: `packages/shared/src/schemas/message.ts`

- [x] **Step 1: Add failing billing/conversation/message tests**

Add these imports at the top of `contracts.spec.ts`:

```ts
import { BillingSummaryResponseSchema, type BillingSummaryResponse } from './billing';
import { ConversationResponseSchema } from './conversation';
import {
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  type SendMessageRequest,
} from './message';
```

Append:

```ts
describe('billing, conversation, and message contracts', () => {
  it('accepts billing summaries for both plans', () => {
    expect(
      BillingSummaryResponseSchema.parse({
        planType: 'prepaid',
        balanceCents: 2500,
        transactions: [],
      }),
    ).toMatchObject({ planType: 'prepaid', balanceCents: 2500 });

    expect(
      BillingSummaryResponseSchema.parse({
        planType: 'postpaid',
        monthlyLimitCents: 10000,
        monthlyUsedCents: 250,
        remainingCents: 9750,
        usageMonth: '2026-06',
        transactions: [],
      }),
    ).toMatchObject({ planType: 'postpaid', remainingCents: 9750 });
  });

  it('accepts nullable last-message fields for an empty conversation', () => {
    expect(
      ConversationResponseSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        recipientId: '550e8400-e29b-41d4-a716-446655440001',
        recipientName: 'Maria Oliveira',
        lastMessageContent: null,
        lastMessageAt: null,
        unreadCount: 0,
      }).lastMessageAt,
    ).toBeNull();
  });

  it('requires a conversation or recipient when sending', () => {
    expect(
      SendMessageRequestSchema.safeParse({
        content: 'Olá',
        priority: 'normal',
      }).success,
    ).toBe(false);
  });

  it('accepts a queued response with integer-cent values', () => {
    expect(
      SendMessageResponseSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440002',
        status: 'queued',
        timestamp: '2026-06-09T18:00:00.000Z',
        estimatedDelivery: '2026-06-09T18:00:05.000Z',
        cost: 50,
        currentBalance: 2450,
      }).cost,
    ).toBe(50);
  });

  it('infers billing and message request types', () => {
    expectTypeOf<SendMessageRequest>().toMatchTypeOf<{
      content: string;
      priority: 'normal' | 'urgent';
      conversationId?: string;
      recipientId?: string;
    }>();
    expectTypeOf<BillingSummaryResponse>().toHaveProperty('transactions');
  });
});
```

- [x] **Step 2: Run and verify RED**

Run: `pnpm --filter @bcb/shared test -- src/schemas/contracts.spec.ts`

Expected: FAIL because billing/conversation/message exports do not exist.

- [x] **Step 3: Implement billing contracts**

```ts
import { z } from 'zod';
import {
  BillingTransactionTypeSchema,
  PaymentIntentStatusSchema,
  PaymentMethodSchema,
} from '../enums';
import {
  IdSchema,
  IsoDateTimeSchema,
  MoneyCentsSchema,
  PositiveMoneyCentsSchema,
  UsageMonthSchema,
} from './common';

export const BillingTransactionResponseSchema = z.object({
  id: IdSchema,
  type: BillingTransactionTypeSchema,
  amountCents: z.number().int(),
  messageId: IdSchema.nullable(),
  paymentIntentId: IdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const CreatePixIntentRequestSchema = z.object({
  amountCents: PositiveMoneyCentsSchema,
});

export const PaymentIntentResponseSchema = z.object({
  id: IdSchema,
  method: PaymentMethodSchema,
  amountCents: PositiveMoneyCentsSchema,
  status: PaymentIntentStatusSchema,
  confirmedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

const BillingTransactionsSchema = z.array(BillingTransactionResponseSchema);

export const PrepaidBillingSummaryResponseSchema = z.object({
  planType: z.literal('prepaid'),
  balanceCents: MoneyCentsSchema,
  transactions: BillingTransactionsSchema,
});

export const PostpaidBillingSummaryResponseSchema = z.object({
  planType: z.literal('postpaid'),
  monthlyLimitCents: MoneyCentsSchema,
  monthlyUsedCents: MoneyCentsSchema,
  remainingCents: MoneyCentsSchema,
  usageMonth: UsageMonthSchema,
  transactions: BillingTransactionsSchema,
});

export const BillingSummaryResponseSchema = z.discriminatedUnion('planType', [
  PrepaidBillingSummaryResponseSchema,
  PostpaidBillingSummaryResponseSchema,
]);

export type BillingTransactionResponse = z.infer<typeof BillingTransactionResponseSchema>;
export type CreatePixIntentRequest = z.infer<typeof CreatePixIntentRequestSchema>;
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;
export type PrepaidBillingSummaryResponse = z.infer<typeof PrepaidBillingSummaryResponseSchema>;
export type PostpaidBillingSummaryResponse = z.infer<typeof PostpaidBillingSummaryResponseSchema>;
export type BillingSummaryResponse = z.infer<typeof BillingSummaryResponseSchema>;
```

- [x] **Step 4: Implement conversation contracts**

```ts
import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema } from './common';

export const RecipientResponseSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});

export const ConversationResponseSchema = z.object({
  id: IdSchema,
  recipientId: IdSchema,
  recipientName: z.string().min(1),
  lastMessageContent: z.string().nullable(),
  lastMessageAt: IsoDateTimeSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
});

export const MarkConversationReadResponseSchema = z.object({
  conversationId: IdSchema,
  unreadCount: z.literal(0),
});

export type RecipientResponse = z.infer<typeof RecipientResponseSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
export type MarkConversationReadResponse = z.infer<typeof MarkConversationReadResponseSchema>;
```

- [x] **Step 5: Implement message contracts**

```ts
import { z } from 'zod';
import { MessagePrioritySchema, MessageStatusSchema, SenderTypeSchema } from '../enums';
import { IdSchema, IsoDateTimeSchema, MoneyCentsSchema } from './common';

export const SendMessageRequestSchema = z
  .object({
    conversationId: IdSchema.optional(),
    recipientId: IdSchema.optional(),
    content: z.string().trim().min(1).max(2000),
    priority: MessagePrioritySchema,
  })
  .refine((value) => value.conversationId || value.recipientId, {
    message: 'conversationId ou recipientId é obrigatório',
  });

export const SendMessageResponseSchema = z.object({
  id: IdSchema,
  status: z.literal('queued'),
  timestamp: IsoDateTimeSchema,
  estimatedDelivery: IsoDateTimeSchema,
  cost: MoneyCentsSchema,
  currentBalance: MoneyCentsSchema.optional(),
});

export const MessageResponseSchema = z.object({
  id: IdSchema,
  conversationId: IdSchema,
  content: z.string(),
  senderType: SenderTypeSchema,
  timestamp: IsoDateTimeSchema,
  priority: MessagePrioritySchema,
  status: MessageStatusSchema,
  cost: MoneyCentsSchema,
});

export const MessageStatusResponseSchema = z.object({
  messageId: IdSchema,
  conversationId: IdSchema,
  status: MessageStatusSchema,
  occurredAt: IsoDateTimeSchema,
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type MessageStatusResponse = z.infer<typeof MessageStatusResponseSchema>;
```

- [x] **Step 6: Verify contracts GREEN**

Run: `pnpm --filter @bcb/shared test -- src/schemas/contracts.spec.ts`

Expected: 10 tests pass across both describe blocks.

---

### Task 6: Public Barrel and Sprint Gates

**Files:**

- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/index.spec.ts`
- Modify: `HANDOFF.md`

- [x] **Step 1: Replace smoke-only barrel with public exports**

```ts
export * from './documents';
export * from './enums';
export * from './money';
export * from './schemas/auth';
export * from './schemas/billing';
export * from './schemas/common';
export * from './schemas/conversation';
export * from './schemas/message';
export * from './schemas/onboarding';
```

- [x] **Step 2: Replace the Sprint 0 smoke test with a barrel test**

```ts
import { describe, expect, it } from 'vitest';
import { AuthSessionRequestSchema, MESSAGE_COST_CENTS, MessageStatusSchema } from './index';

describe('@bcb/shared public exports', () => {
  it('exports contracts and constants through the package barrel', () => {
    expect(MessageStatusSchema.parse('queued')).toBe('queued');
    expect(MESSAGE_COST_CENTS.urgent).toBe(50);
    expect(
      AuthSessionRequestSchema.safeParse({
        documentId: '52998224725',
        documentType: 'CPF',
        password: 'Demo@123',
      }).success,
    ).toBe(true);
  });
});
```

- [x] **Step 3: Run package gates**

Run: `pnpm --filter @bcb/shared test`

Expected: all shared tests pass.

Run: `pnpm --filter @bcb/shared lint`

Expected: PASS.

Run: `pnpm --filter @bcb/shared build`

Expected: PASS and declaration files are emitted.

- [x] **Step 4: Run repository gates**

Run: `pnpm lint`

Expected: PASS.

Run: `pnpm test`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [x] **Step 5: Update handoff**

Record:

- Sprint 1 implementation state.
- Files/modules added.
- RED/GREEN evidence.
- Gate results.
- Next action: review/commit Sprint 1, then plan Sprint 2.

- [ ] **Step 6: Ask Yan before commit**

Ask:

```text
Sprint 1 gates are green. Posso commitar este bloco como `feat(shared): add contracts and document validation`?
```
