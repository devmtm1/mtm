import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createMandatsTestContext } from './mandats.test-support';

describe('MandatsService', () => {
  const internalUser = { id: 'u1', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createMandatsTestContext>['prismaMock'];
  let service: ReturnType<typeof createMandatsTestContext>['service'];

  beforeEach(() => {
    ({ prismaMock, service } = createMandatsTestContext());
  });

  it('rejette une référence interne déjà utilisée', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          referenceInterne: 'M-001',
          proprietaireId: 'p1',
          typeMandat: 'Vente',
          dateDebut: '2026-01-01',
          dateFin: '2027-01-01',
          statut: 'Brouillon',
        },
        internalUser,
      ),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.mandat.create).not.toHaveBeenCalled();
  });

  it('rejette un statut de mandat invalide', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['Brouillon', 'Actif'],
    });

    await expect(
      service.create(
        {
          referenceInterne: 'M-002',
          proprietaireId: 'p1',
          typeMandat: 'Vente',
          dateDebut: '2026-01-01',
          dateFin: '2027-01-01',
          statut: 'Invalide',
        },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.mandat.create).not.toHaveBeenCalled();
  });

  it('refuse un mandat dont la date de fin précède le début', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          referenceInterne: 'M-003',
          proprietaireId: 'p1',
          typeMandat: 'Vente',
          dateDebut: '2027-01-01',
          dateFin: '2026-01-01',
          statut: 'Brouillon',
        },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });
  it('laisse un commercial créer un mandat en brouillon', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['Brouillon', 'Actif'],
    });
    prismaMock.mandat.create.mockResolvedValue({
      id: 'm1',
      statut: 'Brouillon',
      lots: [],
      documents: [],
    });

    await service.create(
      {
        referenceInterne: 'M-010',
        proprietaireId: 'p1',
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: '2027-01-01',
        statut: 'Brouillon',
      },
      internalUser,
    );

    expect(prismaMock.mandat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statut: 'Brouillon',
          commercialResponsableId: 'u1',
        }),
      }),
    );
  });

  it('refuse à un commercial d’activer un mandat : validation d’un responsable requise', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['Brouillon', 'Actif'],
    });

    await expect(
      service.create(
        {
          referenceInterne: 'M-011',
          proprietaireId: 'p1',
          typeMandat: 'Vente',
          dateDebut: '2026-01-01',
          dateFin: '2027-01-01',
          statut: 'Actif',
        },
        internalUser,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.mandat.create).not.toHaveBeenCalled();
  });

  it('laisse un responsable (mandats:valider) activer un mandat', async () => {
    prismaMock.mandat.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['Brouillon', 'Actif'],
    });
    prismaMock.mandat.create.mockResolvedValue({
      id: 'm2',
      statut: 'Actif',
      lots: [],
      documents: [],
    });

    await service.create(
      {
        referenceInterne: 'M-012',
        proprietaireId: 'p1',
        typeMandat: 'Vente',
        dateDebut: '2026-01-01',
        dateFin: '2027-01-01',
        statut: 'Actif',
      },
      {
        id: 'r1',
        roles: ['responsable_commercial'],
        permissions: ['mandats:creer', 'mandats:valider'],
      },
    );

    expect(prismaMock.mandat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'Actif' }),
      }),
    );
  });
});
