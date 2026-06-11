export const DEFAULT_DATABASE_URL = 'postgres://bcb:bcb@localhost:5432/bcb';

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}
