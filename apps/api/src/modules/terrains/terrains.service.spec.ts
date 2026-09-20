import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createTerrainsTestContext } from './terrains.test-support';

describe('TerrainsService', () => {
  const internalUser = { id: 'u-com', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createTerrainsTestContext>['prismaMock'];
  let service: ReturnType<typeof createTerrainsTestContext>['service'];

  beforeEach(() => {
    ({ prismaMock, service } = createTerrainsTestContext());
  });

  it('refuse une référence interne déjà utilisée', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          referenceInterne: 'T-001',
          nom: 'Terrain test',
          statutJuridique: 'Bail',
          niveauVerification: 'Non vérifié',
          statutCommercial: 'Brouillon',
        },
        internalUser,
      ),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('refuse un statut commercial absent du paramétrage', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          referenceInterne: 'T-001',
          nom: 'Terrain test',
          statutJuridique: 'Bail',
          niveauVerification: 'Non vérifié',
          statutCommercial: 'Statut inconnu',
        },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('propose au commercial tout le catalogue encore vendable, même les terrains dont il n’est pas responsable', async () => {
    prismaMock.terrain.findMany.mockResolvedValue([
      {
        id: 't1',
        referenceInterne: 'T-010',
        nom: 'Parcelle Mbour',
        commune: 'Mbour',
        region: 'Thiès',
        superficie: { toString: () => '300' },
        prixPublic: { toString: () => '12000000' },
        statutCommercial: 'Disponible',
      },
    ]);

    const items = await service.catalogueProposition('mbour');

    const where = prismaMock.terrain.findMany.mock.calls[0][0].where;
    expect(where.statutCommercial).toEqual({ not: 'Vendu' });
    expect(where.commercialResponsableId).toBeUndefined();
    expect(items).toEqual([
      expect.objectContaining({
        id: 't1',
        referenceInterne: 'T-010',
        superficie: 300,
        prixPublic: 12000000,
      }),
    ]);
  });

  it('laisse un commercial ouvrir la fiche d’un terrain qu’il ne gère pas, pour le proposer', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({
      id: 't1',
      referenceInterne: 'T-010',
      commercialResponsableId: 'autre-commercial',
      prixAcquisition: 5000000,
      marge: 1000000,
    });

    const terrain = await service.findOne('t1', internalUser);

    expect(terrain.id).toBe('t1');
    // Le portefeuille n'est plus un filtre de lecture...
    expect(prismaMock.terrain.findUnique.mock.calls[0][0].where).toEqual({
      id: 't1',
    });
    // ...mais les données sensibles restent masquées.
    expect(terrain.prixAcquisition).toBeNull();
    expect(terrain.marge).toBeNull();
  });

  it('lève une erreur si le terrain à modifier est introuvable', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing', { nom: 'Nouveau nom' }, internalUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('rattache le terrain créé au commercial connecté', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.create.mockResolvedValue({
      id: 't1',
      referenceInterne: 'T-001',
      medias: [],
      documents: [],
      pointsInteret: [],
    });

    await service.create(
      {
        referenceInterne: 'T-001',
        nom: 'Terrain test',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Non vérifié',
        statutCommercial: 'Brouillon',
      },
      internalUser,
    );

    expect(prismaMock.terrain.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ commercialResponsableId: 'u-com' }),
      }),
    );
  });

  it('refuse à un commercial d’affecter un terrain à quelqu’un d’autre', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          referenceInterne: 'T-002',
          nom: 'Terrain test',
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Non vérifié',
          statutCommercial: 'Brouillon',
          commercialResponsableId: 'u-autre',
        },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
