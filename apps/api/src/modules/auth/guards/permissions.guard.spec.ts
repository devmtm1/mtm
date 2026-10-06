import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTHENTICATED_KEY } from '../decorators/authenticated.decorator';
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

  // Un oubli de décorateur ne doit jamais ouvrir une route : sans permission,
  // sans @Public et sans @Authenticated, l'accès est refusé.
  it('refuse une route qui ne déclare aucun accès', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(() => guard.canActivate(buildContext(buildUser([])))).toThrow(
      ForbiddenException,
    );
  });

  it('refuse une route dont la liste de permissions est vide et sans autre déclaration', () => {
    reflector.getAllAndOverride.mockImplementation((cle: string) =>
      cle === PERMISSIONS_KEY ? [] : undefined,
    );

    expect(() => guard.canActivate(buildContext(buildUser([])))).toThrow(
      ForbiddenException,
    );
  });

  it('ouvre une route publique', () => {
    reflector.getAllAndOverride.mockImplementation((cle: string) =>
      cle === IS_PUBLIC_KEY ? true : undefined,
    );

    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('ouvre une route réservée aux utilisateurs connectés', () => {
    reflector.getAllAndOverride.mockImplementation((cle: string) =>
      cle === AUTHENTICATED_KEY ? true : undefined,
    );

    expect(guard.canActivate(buildContext(buildUser([])))).toBe(true);
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
