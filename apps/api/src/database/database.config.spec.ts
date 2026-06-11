import { getDatabaseUrl } from './database.config.js';

describe('getDatabaseUrl', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('uses DATABASE_URL when present', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/custom';

    expect(getDatabaseUrl()).toBe('postgres://user:pass@localhost:5432/custom');
  });

  it('falls back to the local compose database URL', () => {
    delete process.env.DATABASE_URL;

    expect(getDatabaseUrl()).toBe('postgres://bcb:bcb@localhost:5432/bcb');
  });
});
