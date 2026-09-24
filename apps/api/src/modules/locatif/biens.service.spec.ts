import { ConflictException, NotFoundException } from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';

describe('BiensService', () => {
  const responsableGL = {
    id: 'u-rgl',
    roles: ['responsable_gestion_locative'],
    permissions: [],
  };
  const commercial = { id: 'u-com', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let biens: ReturnType<typeof createLocatifTestContext>['biens'];

  beforeEach(() => {
    ({ prismaMock, biens } = createLocatifTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  });

  it('limite un collaborateur aux biens dont il est responsable', async () => {
    prismaMock.bienLocatif.findMany.mockResolvedValue([]);
    prismaMock.bienLocatif.count.mockResolvedValue(0);

    await biens.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      commercial,
    );

    const where = prismaMock.bienLocatif.findMany.mock.calls[0][0].where;
    expect(where.responsableId).toBe('u-com');
  });

  it('donne au responsable gestion locative la vue sur tout le portefeuille', async () => {
    prismaMock.bienLocatif.findMany.mockResolvedValue([]);
    prismaMock.bienLocatif.count.mockResolvedValue(0);

    await biens.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      responsableGL,
    );

    const where = prismaMock.bienLocatif.findMany.mock.calls[0][0].where;
    expect(where.responsableId).toBeUndefined();
  });

  it('cache un bien hors du périmètre de l’utilisateur', async () => {
    prismaMock.bienLocatif.findFirst.mockResolvedValue(null);

    await expect(biens.findOne('bien-1', commercial)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuse de supprimer un bien qui a un historique de baux', async () => {
    prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    prismaMock.bailLocatif.count.mockResolvedValue(2);

    await expect(biens.remove('bien-1', responsableGL)).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.bienLocatif.delete).not.toHaveBeenCalled();
  });
});
