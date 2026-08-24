import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';
import type { AuthenticatedUser } from '../auth.types';

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildUser = (mustChangePassword: boolean): AuthenticatedUser => ({
    id: 'u1',
    email: 'test@mtm.sn',
    firstName: 'Test',
    lastName: 'User',
    roles: [],
    permissions: [],
    mustChangePassword,
    twoFactorEnabled: false,
  });

  const buildContext = (user?: AuthenticatedUser): ExecutionContext => {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new MustChangePasswordGuard(reflector as unknown as Reflector);
  });

  it('autorise si la route est publique', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // IS_PUBLIC_KEY

    const result = guard.canActivate(buildContext(undefined));

    expect(result).toBe(true);
  });

  it('autorise si la route est exemptée (@SkipPasswordCheck)', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(true); // SKIP_PASSWORD_CHECK_KEY

    const result = guard.canActivate(buildContext(buildUser(true)));

    expect(result).toBe(true);
  });

  it('bloque si mustChangePassword=true et route non exemptée', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    expect(() => guard.canActivate(buildContext(buildUser(true)))).toThrow(
      ForbiddenException,
    );
  });

  it('autorise si mustChangePassword=false', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    const result = guard.canActivate(buildContext(buildUser(false)));

    expect(result).toBe(true);
  });
});
