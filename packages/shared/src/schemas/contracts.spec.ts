import { describe, expect, expectTypeOf, it } from 'vitest';
import { AuthSessionRequestSchema, type AuthSessionRequest } from './auth';
import { BillingSummaryResponseSchema, type BillingSummaryResponse } from './billing';
import { ConversationResponseSchema } from './conversation';
import {
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  type SendMessageRequest,
} from './message';
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
