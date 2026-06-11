export type QueueConfig = {
  readonly processorEnabled: boolean;
  readonly autostart: boolean;
  readonly pollIntervalMs: number;
  readonly statusPublisher: 'realtime' | 'http';
  readonly internalApiBaseUrl: string;
  readonly internalApiToken: string | undefined;
  readonly sentDelayMs: number;
  readonly deliveredDelayMs: number;
};

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);

  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getQueueConfig(): QueueConfig {
  const processorEnabled = process.env.QUEUE_PROCESSOR_ENABLED !== 'false';
  const statusPublisher = process.env.QUEUE_STATUS_PUBLISHER === 'http' ? 'http' : 'realtime';

  return {
    processorEnabled,
    autostart: processorEnabled && process.env.QUEUE_AUTOSTART !== 'false',
    pollIntervalMs: numberFromEnv('QUEUE_POLL_INTERVAL_MS', 0),
    statusPublisher,
    internalApiBaseUrl: process.env.INTERNAL_API_BASE_URL ?? 'http://localhost:3000',
    internalApiToken: process.env.INTERNAL_API_TOKEN,
    sentDelayMs: numberFromEnv('QUEUE_SENT_DELAY_MS', 1000),
    deliveredDelayMs: numberFromEnv('QUEUE_DELIVERED_DELAY_MS', 4000),
  };
}
