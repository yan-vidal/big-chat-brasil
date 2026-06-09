import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DocumentTypeSchema,
  MessagePrioritySchema,
  MessageStatusSchema,
  PlanTypeSchema,
  RoleSchema,
  type MessageStatus,
  type Role,
} from './enums.js';

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
