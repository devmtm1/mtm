import { SessionService } from './session.service';
import type { AuthenticatedUser } from '../models/auth.model';

describe('SessionService', () => {
  let service: SessionService;

  const buildUser = (permissions: string[]): AuthenticatedUser => ({
    id: 'u1',
    email: 'admin@mtm-immobilier.sn',
    firstName: 'Admin',
    lastName: 'MTM',
    roles: ['administrateur'],
    permissions,
    mustChangePassword: false,
    twoFactorEnabled: false,
  });

  beforeEach(() => {
    service = new SessionService();
  });

  it('n’est pas authentifié par défaut', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('devient authentifié après setSession', () => {
    service.setSession('token-abc', buildUser(['users:consulter']));

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken).toBe('token-abc');
    expect(service.user()?.email).toBe('admin@mtm-immobilier.sn');
  });

  it('met à jour uniquement le token avec updateAccessToken', () => {
    service.setSession('token-1', buildUser([]));
    service.updateAccessToken('token-2');

    expect(service.accessToken).toBe('token-2');
    expect(service.user()?.email).toBe('admin@mtm-immobilier.sn');
  });

  it('efface toute la session avec clearSession', () => {
    service.setSession('token-abc', buildUser(['users:consulter']));
    service.clearSession();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.accessToken).toBeNull();
  });

  it('hasPermission détecte correctement une permission présente/absente', () => {
    service.setSession('token', buildUser(['users:consulter', 'roles:consulter']));

    expect(service.hasPermission('users:consulter')).toBe(true);
    expect(service.hasPermission('users:supprimer')).toBe(false);
  });

  it('hasAllPermissions exige la totalité des permissions demandées', () => {
    service.setSession('token', buildUser(['users:consulter', 'roles:consulter']));

    expect(
      service.hasAllPermissions(['users:consulter', 'roles:consulter']),
    ).toBe(true);
    expect(
      service.hasAllPermissions(['users:consulter', 'users:supprimer']),
    ).toBe(false);
  });

  it('hasPermission retourne false si aucune session active', () => {
    expect(service.hasPermission('users:consulter')).toBe(false);
  });

  describe('patchUser', () => {
    it('fusionne les champs fournis avec l’utilisateur existant', () => {
      service.setSession('token', buildUser(['users:consulter']));

      service.patchUser({ mustChangePassword: true });

      expect(service.user()?.mustChangePassword).toBe(true);
      expect(service.user()?.email).toBe('admin@mtm-immobilier.sn');
    });

    it('ne fait rien si aucune session active', () => {
      service.patchUser({ mustChangePassword: true });

      expect(service.user()).toBeNull();
    });
  });
});
