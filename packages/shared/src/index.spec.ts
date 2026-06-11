import { describe, expect, it } from 'vitest';
import { AuthSessionRequestSchema, MESSAGE_COST_CENTS, MessageStatusSchema } from './index.js';

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
