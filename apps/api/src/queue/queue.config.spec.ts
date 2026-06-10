import { getQueueConfig } from './queue.config.js';

describe('getQueueConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.QUEUE_PROCESSOR_ENABLED;
    delete process.env.QUEUE_AUTOSTART;
    delete process.env.QUEUE_POLL_INTERVAL_MS;
    delete process.env.QUEUE_STATUS_PUBLISHER;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('disables local queue processing independently from autostart', () => {
    process.env.QUEUE_PROCESSOR_ENABLED = 'false';

    expect(getQueueConfig()).toMatchObject({
      processorEnabled: false,
      autostart: false,
    });
  });

  it('keeps manual processing available when only autostart is disabled', () => {
    process.env.QUEUE_AUTOSTART = 'false';

    expect(getQueueConfig()).toMatchObject({
      processorEnabled: true,
      autostart: false,
    });
  });

  it('reads polling and HTTP bridge configuration for worker mode', () => {
    process.env.QUEUE_POLL_INTERVAL_MS = '250';
    process.env.QUEUE_STATUS_PUBLISHER = 'http';
    process.env.INTERNAL_API_BASE_URL = 'http://api:3000';
    process.env.INTERNAL_API_TOKEN = 'worker-token';

    expect(getQueueConfig()).toMatchObject({
      pollIntervalMs: 250,
      statusPublisher: 'http',
      internalApiBaseUrl: 'http://api:3000',
      internalApiToken: 'worker-token',
    });
  });
});
