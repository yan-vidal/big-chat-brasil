import type { JwtSignOptions } from '@nestjs/jwt';

export const AUTH_PASSWORD_SALT_ROUNDS = 8;
export const AUTH_JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
export const AUTH_JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  '1d') as JwtSignOptions['expiresIn'];
