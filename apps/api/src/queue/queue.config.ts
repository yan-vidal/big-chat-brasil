export type QueueConfig = {
  readonly autostart: boolean;
  readonly sentDelayMs: number;
  readonly deliveredDelayMs: number;
};

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);

  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getQueueConfig(): QueueConfig {
  return {
    autostart: process.env.QUEUE_AUTOSTART !== 'false',
    sentDelayMs: numberFromEnv('QUEUE_SENT_DELAY_MS', 1000),
    deliveredDelayMs: numberFromEnv('QUEUE_DELIVERED_DELAY_MS', 4000),
  };
}
