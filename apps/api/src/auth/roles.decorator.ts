import { SetMetadata } from '@nestjs/common';
import type { Role } from '@bcb/shared';

export const ROLES_KEY = 'auth:roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
