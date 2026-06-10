import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AuthSessionRequestSchema,
  JwtPayloadSchema,
  type AuthSessionRequest,
  type JwtPayload,
} from './auth.js';
import { BillingSummaryResponseSchema, type BillingSummaryResponse } from './billing.js';
import { ConversationResponseSchema } from './conversation.js';
import {
  QueueStatusResponseSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  type SendMessageRequest,
} from './message.js';
import { OnboardingRequestSchema, type OnboardingRequest } from './onboarding.js';
import {
  ConversationUpdatedEventSchema,
  MessageStatusEventSchema,
  TypingEventSchema,
} from './realtime.js';

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

  it('requires onboarding status in JWT payloads', () => {
    expect(
      JwtPayloadSchema.parse({
        sub: '11111111-1111-4111-8111-111111111111',
        clientId: '22222222-2222-4222-8222-222222222222',
        role: 'client',
        documentId: '52998224725',
        documentType: 'CPF',
        requiresOnboarding: true,
      }),
    ).toMatchObject({ requiresOnboarding: true });
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
    expectTypeOf<JwtPayload>().toMatchTypeOf<{ requiresOnboarding: boolean }>();
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

  it('accepts queue status counters', () => {
    expect(
      QueueStatusResponseSchema.parse({
        normalQueued: 1,
        urgentQueued: 2,
        processing: false,
        processedCount: 3,
        failedCount: 0,
      }),
    ).toMatchObject({ urgentQueued: 2 });
  });

  it('accepts realtime event payloads', () => {
    expect(
      MessageStatusEventSchema.parse({
        messageId: '550e8400-e29b-41d4-a716-446655440010',
        conversationId: '550e8400-e29b-41d4-a716-446655440011',
        status: 'delivered',
        occurredAt: '2026-06-09T18:00:05.000Z',
      }),
    ).toMatchObject({ status: 'delivered' });

    expect(
      ConversationUpdatedEventSchema.parse({
        conversationId: '550e8400-e29b-41d4-a716-446655440011',
        lastMessageContent: 'Recebido, retorno em instantes.',
        lastMessageAt: '2026-06-09T18:00:06.000Z',
        unreadCount: 1,
      }),
    ).toMatchObject({ unreadCount: 1 });

    expect(
      TypingEventSchema.parse({
        conversationId: '550e8400-e29b-41d4-a716-446655440011',
        senderType: 'user',
      }),
    ).toMatchObject({ senderType: 'user' });
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
