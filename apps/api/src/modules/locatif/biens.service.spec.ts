import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

  describe('rattachement à une propriété', () => {
    const bien = { proprietaireId: 'prop-1', immeubleId: null };

    beforeEach(() => {
      prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bienLocatif.findUnique.mockResolvedValue(bien);
      prismaMock.bienLocatif.update.mockResolvedValue({ id: 'bien-1' });
    });

    it('rattache un bien à la propriété de son propre propriétaire', async () => {
      prismaMock.immeubleLocatif.findFirst.mockResolvedValue({
        proprietaireId: 'prop-1',
      });

      await biens.update(
        'bien-1',
        { immeubleId: 'imm-1', numeroLot: 'A2' },
        responsableGL,
      );

      expect(prismaMock.bienLocatif.update.mock.calls[0][0].data).toMatchObject(
        {
          immeubleId: 'imm-1',
          numeroLot: 'A2',
        },
      );
    });

    it('refuse de rattacher le bien d’un propriétaire à la propriété d’un autre', async () => {
      prismaMock.immeubleLocatif.findFirst.mockResolvedValue({
        proprietaireId: 'prop-2',
      });

      await expect(
        biens.update('bien-1', { immeubleId: 'imm-1' }, responsableGL),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.bienLocatif.update).not.toHaveBeenCalled();
    });

    it('refuse une propriété hors du périmètre', async () => {
      prismaMock.immeubleLocatif.findFirst.mockResolvedValue(null);

      await expect(
        biens.update('bien-1', { immeubleId: 'imm-1' }, commercial),
      ).rejects.toThrow(NotFoundException);
    });

    it('sort un bien de sa propriété avec immeubleId nul', async () => {
      await biens.update(
        'bien-1',
        { immeubleId: null, numeroLot: null },
        responsableGL,
      );

      expect(prismaMock.bienLocatif.update.mock.calls[0][0].data).toMatchObject(
        {
          immeubleId: null,
          numeroLot: null,
        },
      );
      expect(prismaMock.immeubleLocatif.findFirst).not.toHaveBeenCalled();
    });

    it('un logement ne change pas de propriétaire tout seul', async () => {
      prismaMock.bienLocatif.findUnique.mockResolvedValue({
        proprietaireId: 'prop-1',
        immeubleId: 'imm-1',
      });
      prismaMock.proprietaire.findUnique.mockResolvedValue({ id: 'prop-2' });

      await expect(
        biens.update('bien-1', { proprietaireId: 'prop-2' }, responsableGL),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée un bien directement dans une propriété', async () => {
      prismaMock.proprietaire.findUnique.mockResolvedValue({ id: 'prop-1' });
      prismaMock.immeubleLocatif.findFirst.mockResolvedValue({
        proprietaireId: 'prop-1',
      });
      prismaMock.bienLocatif.count.mockResolvedValue(0);
      prismaMock.bienLocatif.findUnique.mockResolvedValue(null);
      prismaMock.bienLocatif.create.mockResolvedValue({ id: 'nouveau' });

      await biens.create(
        {
          proprietaireId: 'prop-1',
          type: 'appartement',
          adresse: 'Rue 1',
          immeubleId: 'imm-1',
          numeroLot: 'A1',
        },
        responsableGL,
      );

      expect(prismaMock.bienLocatif.create.mock.calls[0][0].data).toMatchObject(
        {
          immeubleId: 'imm-1',
          numeroLot: 'A1',
        },
      );
    });
  });
});
