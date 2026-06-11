import type { MessagePriority } from './enums.js';

export const MESSAGE_COST_CENTS = {
  normal: 25,
  urgent: 50,
} as const satisfies Record<MessagePriority, number>;

export const ESTIMATED_DELIVERY_SECONDS = 5;

export function getMessageCostCents(priority: MessagePriority): number {
  return MESSAGE_COST_CENTS[priority];
}
