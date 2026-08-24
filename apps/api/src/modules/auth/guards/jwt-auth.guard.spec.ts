import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Ce guard hérite de AuthGuard('jwt') (Passport). On teste ici
 * uniquement le court-circuit @Public — la vérification effective du
 * token JWT est déléguée à Passport et testée via JwtStrategy /
 * l'intégration e2e, pas ici.
 */
describe('JwtAuthGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
  });

  it('retourne true immédiatement si la route est marquée @Public', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);

    const result = guard.canActivate(buildContext());

    expect(result).toBe(true);
  });

  it('consulte bien les métadonnées IS_PUBLIC_KEY via le Reflector', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);

    void guard.canActivate(buildContext());

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      'isPublic',
      expect.any(Array),
    );
  });
});
