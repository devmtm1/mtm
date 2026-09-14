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
