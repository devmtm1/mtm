import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createTerrainsTestContext } from './terrains.test-support';

describe('TerrainsService', () => {
  const internalUser = { roles: ['commercial'], permissions: [] };

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
});
