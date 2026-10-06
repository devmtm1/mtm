import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { UsersService, type UserActor } from './users.service';

/**
 * Garde-fous d'administration des comptes : pas d'élévation de privilèges, pas
 * de prise de contrôle d'un administrateur, jamais de plateforme sans
 * administrateur actif.
 */
describe('UsersService — garde-fous d’administration', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let service: UsersService;

  const admin: UserActor = {
    id: 'admin1',
    roles: ['administrateur'],
    permissions: ['users:creer', 'users:modifier', 'users:supprimer'],
  };
  const gestionnaire: UserActor = {
    id: 'gest1',
    roles: ['gestionnaire_comptes'],
    permissions: [
      'users:creer',
      'users:modifier',
      'users:supprimer',
      'crm:consulter',
    ],
  };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new UsersService(prismaMock as unknown as PrismaService);
  });

  const roleAvecPermissions = (...noms: string[]) => ({
    permissions: noms.map((nom) => ({ permission: { name: nom } })),
  });

  describe('attribution d’un rôle', () => {
    it('refuse un rôle qui donne plus de droits que ceux de l’auteur', async () => {
      prismaMock.role.findUnique.mockResolvedValue(
        roleAvecPermissions('crm:consulter', 'settings:administrer'),
      );
      await expect(
        service.assertCanGrantRole(gestionnaire, 'role-admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('accepte un rôle dont tous les droits sont détenus par l’auteur', async () => {
      prismaMock.role.findUnique.mockResolvedValue(
        roleAvecPermissions('crm:consulter'),
      );
      await expect(
        service.assertCanGrantRole(gestionnaire, 'role-crm'),
      ).resolves.toBeUndefined();
    });

    it('un administrateur peut tout attribuer, sans même lire le rôle', async () => {
      await expect(
        service.assertCanGrantRole(admin, 'n-importe-lequel'),
      ).resolves.toBeUndefined();
      expect(prismaMock.role.findUnique).not.toHaveBeenCalled();
    });

    it('signale un rôle inexistant', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);
      await expect(
        service.assertCanGrantRole(gestionnaire, 'fantome'),
      ).rejects.toThrow(BadRequestException);
    });

    it('la création de compte applique la règle avant tout enregistrement', async () => {
      prismaMock.role.findUnique.mockResolvedValue(
        roleAvecPermissions('settings:administrer'),
      );
      await expect(
        service.create(
          {
            email: 'nouveau@mtm.sn',
            password: 'MotDePasse-Solide-2026',
            firstName: 'A',
            lastName: 'B',
            roleId: 'role-admin',
          },
          gestionnaire,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('comptes administrateur', () => {
    it('un non-administrateur ne peut pas modifier un administrateur', async () => {
      prismaMock.userRole.count.mockResolvedValue(1);
      await expect(
        service.update(
          'admin2',
          { password: 'NouveauMotDePasse-2026' },
          gestionnaire,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('ni réinitialiser sa double authentification', async () => {
      prismaMock.userRole.count.mockResolvedValue(1);
      await expect(
        service.resetTwoFactor('admin2', gestionnaire),
      ).rejects.toThrow(ForbiddenException);
    });

    it('chacun peut agir sur son propre compte', async () => {
      await expect(
        service.assertCanManageTarget(gestionnaire, gestionnaire.id),
      ).resolves.toBeUndefined();
    });
  });

  describe('dernier administrateur', () => {
    it('ne peut être ni supprimé, ni désactivé, ni retiré de son rôle', async () => {
      prismaMock.userRole.count.mockResolvedValue(1); // la cible est administrateur
      prismaMock.user.count.mockResolvedValue(0); // aucun autre administrateur actif

      await expect(service.remove('admin2', admin)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.setActive('admin2', false, admin)).rejects.toThrow(
        ConflictException,
      );
      await expect(
        service.removeRole('admin2', 'role-admin', admin),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('peut être supprimé s’il reste un autre administrateur actif', async () => {
      prismaMock.userRole.count.mockResolvedValue(1);
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.user.delete.mockResolvedValue({});

      await expect(service.remove('admin2', admin)).resolves.toBeUndefined();
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'admin2' },
      });
    });

    it('on ne supprime ni ne désactive son propre compte', async () => {
      await expect(service.remove(admin.id, admin)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.setActive(admin.id, false, admin)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('désactivation', () => {
    it('révoque les sessions ouvertes du compte désactivé', async () => {
      prismaMock.userRole.count.mockResolvedValue(0); // pas un administrateur
      prismaMock.user.update.mockResolvedValue({ id: 'u2', isActive: false });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.setActive('u2', false, admin);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u2', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('la réactivation ne touche pas aux sessions', async () => {
      prismaMock.userRole.count.mockResolvedValue(0);
      prismaMock.user.update.mockResolvedValue({ id: 'u2', isActive: true });

      await service.setActive('u2', true, admin);

      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('changement de rôle', () => {
    it('s’effectue dans une seule transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u2',
        roles: [],
      });
      await service.update('u2', { roleId: 'role-crm' }, admin);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u2' },
      });
      expect(prismaMock.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'u2', roleId: 'role-crm' },
      });
    });
  });
});
