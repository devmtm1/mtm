import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import type { AuthenticatedUser } from '../auth.types';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildUser = (permissions: string[]): AuthenticatedUser => ({
    id: 'u1',
    email: 'test@mtm.sn',
    firstName: 'Test',
    lastName: 'User',
    roles: ['commercial'],
    permissions,
    mustChangePassword: false,
    twoFactorEnabled: false,
  });

  const buildContext = (user?: AuthenticatedUser): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('autorise si aucune permission n’est requise sur la route', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(buildContext(buildUser([])));

    expect(result).toBe(true);
  });

  it('autorise si le tableau de permissions requises est vide', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const result = guard.canActivate(buildContext(buildUser([])));

    expect(result).toBe(true);
  });

  it("rejette si aucun utilisateur n'est présent sur la requête", () => {
    reflector.getAllAndOverride.mockReturnValue(['users:consulter']);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejette si l’utilisateur n’a pas toutes les permissions requises', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'users:consulter',
      'users:creer',
    ]);
    const user = buildUser(['users:consulter']); // manque users:creer

    expect(() => guard.canActivate(buildContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('autorise si l’utilisateur a toutes les permissions requises', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'users:consulter',
      'users:creer',
    ]);
    const user = buildUser([
      'users:consulter',
      'users:creer',
      'roles:consulter',
    ]);

    const result = guard.canActivate(buildContext(user));

    expect(result).toBe(true);
  });
});
