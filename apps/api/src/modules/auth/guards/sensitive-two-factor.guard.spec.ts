import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SensitiveTwoFactorGuard } from './sensitive-two-factor.guard';
import type { AuthenticatedUser } from '../auth.types';

describe('SensitiveTwoFactorGuard', () => {
  let guard: SensitiveTwoFactorGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildUser = (
    roles: string[],
    twoFactorEnabled: boolean,
  ): AuthenticatedUser => ({
    id: 'u1',
    email: 'test@mtm.sn',
    firstName: 'Test',
    lastName: 'User',
    roles,
    permissions: [],
    mustChangePassword: false,
    twoFactorEnabled,
  });

  const buildContext = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new SensitiveTwoFactorGuard(reflector as unknown as Reflector);
  });

  it('autorise une route publique', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('autorise une route exemptée', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    expect(guard.canActivate(buildContext(buildUser(['administrateur'], false)))).toBe(
      true,
    );
  });

  it('bloque un rôle sensible sans 2FA', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    expect(() =>
      guard.canActivate(buildContext(buildUser(['administrateur'], false))),
    ).toThrow(ForbiddenException);
  });

  it('autorise un rôle sensible avec 2FA', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    expect(
      guard.canActivate(buildContext(buildUser(['administrateur'], true))),
    ).toBe(true);
  });

  it('autorise un rôle non sensible sans 2FA', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    expect(guard.canActivate(buildContext(buildUser(['commercial'], false)))).toBe(
      true,
    );
  });
});
