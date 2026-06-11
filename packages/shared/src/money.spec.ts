import { describe, expect, it } from 'vitest';
import { ESTIMATED_DELIVERY_SECONDS, MESSAGE_COST_CENTS, getMessageCostCents } from './money.js';

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
