export type SimulatorConfig = {
  readonly enabled: boolean;
  readonly readDelayMs: number;
  readonly typingMs: number;
};

export function getSimulatorConfig(): SimulatorConfig {
  return {
    enabled: process.env.RECIPIENT_SIMULATOR_ENABLED !== 'false',
    readDelayMs: numberFromEnv('RECIPIENT_SIMULATOR_READ_DELAY_MS', 1000),
    typingMs: numberFromEnv('RECIPIENT_SIMULATOR_TYPING_MS', 1500),
  };
}

function numberFromEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
