import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import type { ExecutionContext } from '@nestjs/common';

class AdminOnlyController {
  @Roles('admin')
  adminRoute(): null {
    return null;
  }

  unrestrictedRoute(): null {
    return null;
  }
}

function createContext(handler: () => null, role?: string): ExecutionContext {
  return {
    getClass: () => AdminOnlyController,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({
        auth: role ? { role } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows routes without role metadata', () => {
    expect(guard.canActivate(createContext(AdminOnlyController.prototype.unrestrictedRoute))).toBe(
      true,
    );
  });

  it('allows requests with a matching role', () => {
    expect(
      guard.canActivate(createContext(AdminOnlyController.prototype.adminRoute, 'admin')),
    ).toBe(true);
  });

  it('blocks requests without a matching role', () => {
    expect(
      guard.canActivate(createContext(AdminOnlyController.prototype.adminRoute, 'client')),
    ).toBe(false);
  });
});
