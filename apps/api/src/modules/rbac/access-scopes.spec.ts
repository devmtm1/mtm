import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { hasSupervisionScope } from './role-groups';
import { VentesAccessService } from '../ventes/ventes-access.service';
import { MandatsAccessService } from '../mandats/mandats-access.service';
import { CrmAccessService } from '../crm/crm-access.service';
import { TerrainsAccessService } from '../terrains/terrains-access.service';
import { DemarchesAccessService } from '../demarches/demarches-access.service';
import { LocatifAccessService } from '../locatif/locatif-access.service';
import { ConstructionAccessService } from '../construction/construction-access.service';

/**
 * Périmètre de visibilité : un collaborateur ne voit que ce qui lui est
 * confié, l'encadrement voit tout. Ces règles sont la frontière entre les
 * données de deux commerciaux, et celle de la section 36 (« aucun utilisateur
 * ne doit accéder à des données non autorisées ») : elles ont leurs propres
 * tests plutôt que de dépendre des parcours qui les traversent.
 */
describe('périmètres d’accès', () => {
  const prismaMock = createPrismaMock();
  const prisma = prismaMock as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const utilisateur = (roles: string[], permissions: string[] = []) => ({
    id: 'u1',
    roles,
    permissions,
  });

  describe('hasSupervisionScope', () => {
    it.each([
      [['administrateur'], [], true],
      [['direction'], [], true],
      [['manager'], [], true],
      [['responsable_commercial'], [], true],
      [['commercial'], [], false],
      [['comptable'], [], false],
      // Un rôle créé dans le back-office obtient le périmètre par permission.
      [['role_sur_mesure'], ['ventes:administrer'], true],
      [['role_sur_mesure'], ['ventes:consulter'], false],
    ])('rôles %j, permissions %j → %s', (roles, permissions, attendu) => {
      expect(hasSupervisionScope({ roles, permissions }, 'ventes')).toBe(
        attendu,
      );
    });

    it('une permission d’un autre module ne donne pas le périmètre', () => {
      expect(
        hasSupervisionScope(
          { roles: ['role_sur_mesure'], permissions: ['mandats:administrer'] },
          'ventes',
        ),
      ).toBe(false);
    });
  });

  describe.each([
    ['ventes', new VentesAccessService(prisma), 'commercialResponsableId'],
    ['mandats', new MandatsAccessService(prisma), 'commercialResponsableId'],
    ['terrains', new TerrainsAccessService(prisma), 'commercialResponsableId'],
  ] as const)('filtre de propriété — %s', (_nom, service, champ) => {
    it('un commercial ne voit que ses propres enregistrements', () => {
      expect(service.ownershipFilter(utilisateur(['commercial']))).toEqual({
        [champ]: 'u1',
      });
    });

    it.each(['administrateur', 'direction', 'manager', 'comptable'])(
      'le rôle « %s » voit tout',
      (role) => {
        expect(service.ownershipFilter(utilisateur([role]))).toEqual({});
      },
    );
  });

  describe.each([
    [
      'démarches',
      new DemarchesAccessService(prisma),
      'responsable_demarches',
      false,
    ],
    [
      'locatif',
      new LocatifAccessService(prisma),
      'responsable_gestion_locative',
      true,
    ],
    [
      'construction',
      new ConstructionAccessService(prisma),
      'responsable_construction',
      true,
    ],
  ] as const)(
    'filtre de propriété — %s',
    (_nom, service, roleMetier, comptableVoitTout) => {
      it('un collaborateur ordinaire ne voit que ce dont il est responsable', () => {
        expect(service.ownershipFilter(utilisateur(['commercial']))).toEqual({
          responsableId: 'u1',
        });
      });

      it.each(['administrateur', 'direction', 'manager', roleMetier])(
        'le rôle « %s » voit tout',
        (role) => {
          expect(service.ownershipFilter(utilisateur([role]))).toEqual({});
        },
      );

      it(`la comptabilité ${comptableVoitTout ? 'voit' : 'ne voit pas'} tout`, () => {
        expect(service.ownershipFilter(utilisateur(['comptable']))).toEqual(
          comptableVoitTout ? {} : { responsableId: 'u1' },
        );
      });
    },
  );

  describe.each([
    ['démarches', new DemarchesAccessService(prisma), 'responsable_demarches'],
    [
      'locatif',
      new LocatifAccessService(prisma),
      'responsable_gestion_locative',
    ],
    [
      'construction',
      new ConstructionAccessService(prisma),
      'responsable_construction',
    ],
  ] as const)(
    'affectation d’un responsable — %s',
    (_nom, service, roleMetier) => {
      it('sans demande, ou pour soi-même, on garde son propre identifiant', async () => {
        const moi = utilisateur(['commercial']);
        await expect(service.resolveResponsable(undefined, moi)).resolves.toBe(
          'u1',
        );
        await expect(service.resolveResponsable('u1', moi)).resolves.toBe('u1');
      });

      it('un collaborateur ordinaire ne peut pas confier à quelqu’un d’autre', async () => {
        await expect(
          service.resolveResponsable('u2', utilisateur(['commercial'])),
        ).rejects.toThrow(BadRequestException);
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      });

      it('l’encadrement désigne un collaborateur actif ayant le bon rôle', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
          isActive: true,
          roles: [{ role: { name: roleMetier } }],
        });
        await expect(
          service.resolveResponsable('u2', utilisateur(['direction'])),
        ).resolves.toBe('u2');
      });

      it('refuse un collaborateur inactif, introuvable ou sans le bon rôle', async () => {
        const direction = utilisateur(['direction']);
        prismaMock.user.findUnique.mockResolvedValueOnce({
          isActive: false,
          roles: [{ role: { name: roleMetier } }],
        });
        await expect(
          service.resolveResponsable('u2', direction),
        ).rejects.toThrow(BadRequestException);
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        await expect(
          service.resolveResponsable('u2', direction),
        ).rejects.toThrow(BadRequestException);
        prismaMock.user.findUnique.mockResolvedValueOnce({
          isActive: true,
          roles: [{ role: { name: 'rh' } }],
        });
        await expect(
          service.resolveResponsable('u2', direction),
        ).rejects.toThrow(BadRequestException);
      });
    },
  );

  describe('accès à un enregistrement', () => {
    it('un dossier de vente hors périmètre est introuvable, jamais « interdit »', async () => {
      prismaMock.dossierVente.findFirst.mockResolvedValue(null);
      const service = new VentesAccessService(prisma);
      await expect(
        service.ensureAccessible('d1', utilisateur(['commercial'])),
      ).rejects.toThrow(NotFoundException);
      // Le filtre de propriété est bien appliqué à la requête.
      expect(prismaMock.dossierVente.findFirst).toHaveBeenCalledWith({
        where: { id: 'd1', commercialResponsableId: 'u1' },
        select: { id: true },
      });
    });

    it('un bail hérite du périmètre de son bien', async () => {
      prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'b1',
        bienLocatifId: 'bien1',
      });
      prismaMock.bienLocatif.findFirst.mockResolvedValue(null);
      const service = new LocatifAccessService(prisma);
      await expect(
        service.ensureBailAccessible('b1', utilisateur(['commercial'])),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.bienLocatif.findFirst).toHaveBeenCalledWith({
        where: { id: 'bien1', responsableId: 'u1' },
        select: { id: true },
      });
    });

    it('un prospect d’un autre commercial est introuvable pour un commercial', async () => {
      prismaMock.prospect.findUnique.mockResolvedValue({
        id: 'p1',
        commercialResponsableId: 'autre',
      });
      const service = new CrmAccessService(prisma);
      await expect(
        service.assertOwnership('p1', utilisateur(['commercial'])),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.assertOwnership('p1', utilisateur(['manager'])),
      ).resolves.toBeUndefined();
    });
  });

  describe('visibilité des montants financiers (ventes)', () => {
    const service = new VentesAccessService(prisma);

    it('réservée à l’encadrement, à la comptabilité et à la permission dédiée', () => {
      expect(service.canViewFinancials(utilisateur(['commercial']))).toBe(
        false,
      );
      expect(service.canViewFinancials(utilisateur(['comptable']))).toBe(true);
      expect(service.canViewFinancials(utilisateur(['direction']))).toBe(true);
      expect(
        service.canViewFinancials(
          utilisateur(['commercial'], ['ventes:consulter_financier']),
        ),
      ).toBe(true);
    });
  });

  describe('publication sur le site public (terrains)', () => {
    const service = new TerrainsAccessService(prisma);

    it('exige un rôle de publication ou la permission terrains:publier', () => {
      expect(() =>
        service.assertCanPublish(true, utilisateur(['commercial'])),
      ).toThrow(BadRequestException);
      expect(() =>
        service.assertCanPublish(true, utilisateur(['direction'])),
      ).not.toThrow();
      expect(() =>
        service.assertCanPublish(
          true,
          utilisateur(['commercial'], ['terrains:publier']),
        ),
      ).not.toThrow();
      // Ne rien publier ne demande aucun droit.
      expect(() =>
        service.assertCanPublish(false, utilisateur(['commercial'])),
      ).not.toThrow();
    });
  });
});
