import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';
import type { LogementInitialDto } from './dto/immeuble.dto';

describe('ImmeublesService', () => {
  const gestionnaire = {
    id: 'u-rgl',
    roles: ['responsable_gestion_locative'],
    permissions: [],
  };
  const commercial = { id: 'u-com', roles: ['commercial'], permissions: [] };
  const annee = new Date().getFullYear();

  let ctx: ReturnType<typeof createLocatifTestContext>;

  beforeEach(() => {
    ctx = createLocatifTestContext();
    ctx.prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    ctx.prismaMock.immeubleLocatif.findMany.mockResolvedValue([]);
    ctx.prismaMock.bienLocatif.findMany.mockResolvedValue([]);
    ctx.prismaMock.proprietaire.findUnique.mockResolvedValue({ id: 'prop-1' });
  });

  const villa = (logements: Partial<LogementInitialDto>[] = []) => ({
    nom: 'Villa Fall',
    type: 'villa',
    proprietaireId: 'prop-1',
    adresse: 'Sacré-Cœur 3, Dakar',
    commune: 'Sacré-Cœur',
    logements: logements as LogementInitialDto[],
  });

  const immeubleCree = {
    id: 'imm-1',
    referenceInterne: `IM-${annee}-0001`,
    proprietaireId: 'prop-1',
    responsableId: 'u-rgl',
    adresse: 'Sacré-Cœur 3, Dakar',
    commune: 'Sacré-Cœur',
    region: null,
    latitude: null,
    longitude: null,
    tauxGestion: null,
  };

  describe('création', () => {
    it('crée la propriété et ses logements, qui reprennent propriétaire, adresse et responsable', async () => {
      ctx.prismaMock.immeubleLocatif.create.mockResolvedValue(immeubleCree);

      await ctx.immeubles.create(
        villa([
          {
            numeroLot: 'A1',
            type: 'appartement',
            nombreChambres: 2,
            loyerMensuel: 250000,
          },
          {
            numeroLot: 'A2',
            type: 'appartement',
            nombreChambres: 1,
            loyerMensuel: 180000,
          },
        ]),
        gestionnaire,
      );

      expect(
        ctx.prismaMock.immeubleLocatif.create.mock.calls[0][0].data,
      ).toMatchObject({
        referenceInterne: `IM-${annee}-0001`,
        nom: 'Villa Fall',
        proprietaireId: 'prop-1',
      });
      const logements = ctx.prismaMock.bienLocatif.create.mock.calls.map(
        (appel) => appel[0].data,
      );
      expect(logements).toHaveLength(2);
      expect(logements[0]).toMatchObject({
        immeubleId: 'imm-1',
        numeroLot: 'A1',
        proprietaireId: 'prop-1',
        adresse: 'Sacré-Cœur 3, Dakar',
        responsableId: 'u-rgl',
        loyerMensuel: 250000,
        referenceInterne: `L-${annee}-0001`,
      });
      // des références distinctes, qui se suivent
      expect(logements[1].referenceInterne).toBe(`L-${annee}-0002`);
    });

    it('continue la numérotation des biens déjà émis', async () => {
      ctx.prismaMock.bienLocatif.findMany.mockResolvedValue([
        { referenceInterne: `L-${annee}-0007` },
      ]);
      ctx.prismaMock.immeubleLocatif.create.mockResolvedValue(immeubleCree);

      await ctx.immeubles.create(
        villa([
          { numeroLot: 'A1', type: 'appartement' },
          { numeroLot: 'A2', type: 'appartement' },
        ]),
        gestionnaire,
      );

      const refs = ctx.prismaMock.bienLocatif.create.mock.calls.map(
        (appel) => appel[0].data.referenceInterne,
      );
      expect(refs).toEqual([`L-${annee}-0008`, `L-${annee}-0009`]);
    });

    it('refuse deux logements avec le même repère', async () => {
      await expect(
        ctx.immeubles.create(
          villa([
            { numeroLot: 'A1', type: 'appartement' },
            { numeroLot: ' a1 ', type: 'appartement' },
          ]),
          gestionnaire,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(ctx.prismaMock.immeubleLocatif.create).not.toHaveBeenCalled();
    });

    it('refuse un propriétaire inconnu', async () => {
      ctx.prismaMock.proprietaire.findUnique.mockResolvedValue(null);
      await expect(ctx.immeubles.create(villa(), gestionnaire)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse un type de logement inconnu', async () => {
      await expect(
        ctx.immeubles.create(villa([{ type: 'chateau' }]), gestionnaire),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ajout de logements', () => {
    beforeEach(() => {
      ctx.prismaMock.immeubleLocatif.findFirst.mockResolvedValue({
        id: 'imm-1',
      });
      ctx.prismaMock.immeubleLocatif.findUnique.mockResolvedValue({
        id: 'imm-1',
        proprietaireId: 'prop-1',
        responsableId: null,
        adresse: 'Sacré-Cœur 3',
        commune: null,
        region: null,
        latitude: null,
        longitude: null,
        tauxGestion: null,
      });
    });

    it('refuse un repère déjà utilisé dans la propriété', async () => {
      ctx.prismaMock.bienLocatif.findMany.mockResolvedValueOnce([
        { numeroLot: 'A1' },
      ]);
      await expect(
        ctx.immeubles.ajouterLogements(
          'imm-1',
          [{ numeroLot: 'A1', type: 'appartement' }],
          gestionnaire,
        ),
      ).rejects.toThrow(ConflictException);
      expect(ctx.prismaMock.bienLocatif.create).not.toHaveBeenCalled();
    });

    it('crée les logements demandés', async () => {
      ctx.prismaMock.bienLocatif.create.mockResolvedValue({
        id: 'b',
        referenceInterne: 'L',
        numeroLot: 'A3',
      });
      const crees = await ctx.immeubles.ajouterLogements(
        'imm-1',
        [{ numeroLot: 'A3', type: 'studio' }],
        gestionnaire,
      );
      expect(crees).toHaveLength(1);
      expect(
        ctx.prismaMock.bienLocatif.create.mock.calls[0][0].data,
      ).toMatchObject({
        immeubleId: 'imm-1',
        numeroLot: 'A3',
        type: 'studio',
      });
    });
  });

  describe('périmètre', () => {
    it('limite un collaborateur aux propriétés qu’il porte ou dont il porte un logement', async () => {
      ctx.prismaMock.immeubleLocatif.count.mockResolvedValue(0);
      await ctx.immeubles.findAll({ page: 1, pageSize: 25 }, commercial);
      const where =
        ctx.prismaMock.immeubleLocatif.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { responsableId: 'u-com' },
        { logements: { some: { responsableId: 'u-com' } } },
      ]);
    });

    it('donne la vue sur tout le portefeuille au responsable gestion locative', async () => {
      ctx.prismaMock.immeubleLocatif.count.mockResolvedValue(0);
      await ctx.immeubles.findAll({ page: 1, pageSize: 25 }, gestionnaire);
      expect(
        ctx.prismaMock.immeubleLocatif.findMany.mock.calls[0][0].where.OR,
      ).toBeUndefined();
    });

    it('cache une propriété hors du périmètre', async () => {
      ctx.prismaMock.immeubleLocatif.findFirst.mockResolvedValue(null);
      await expect(ctx.immeubles.findOne('imm-1', commercial)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('lecture', () => {
    it('calcule la synthèse de la propriété à partir de ses logements', async () => {
      ctx.prismaMock.immeubleLocatif.findFirst.mockResolvedValue({
        id: 'imm-1',
      });
      ctx.prismaMock.immeubleLocatif.findUnique.mockResolvedValue({
        id: 'imm-1',
        nom: 'Villa Fall',
        logements: [
          {
            id: 'b1',
            statut: 'loue',
            modeLocation: 'longue_duree',
            loyerMensuel: 250000,
            baux: [
              {
                id: 'bail-1',
                statut: 'actif',
                loyerMensuel: 250000,
                locataire: {
                  id: 'l1',
                  firstName: 'A',
                  lastName: 'B',
                  phone: null,
                },
                echeances: [{ montantPrevu: 250000, montantPaye: 50000 }],
              },
            ],
          },
          {
            id: 'b2',
            statut: 'disponible',
            modeLocation: 'longue_duree',
            loyerMensuel: 180000,
            baux: [],
          },
        ],
      });

      const fiche = await ctx.immeubles.findOne('imm-1', gestionnaire);

      expect(fiche.synthese).toMatchObject({
        logements: 2,
        loues: 1,
        disponibles: 1,
        tauxOccupation: 50,
        loyerMensuelAttendu: 250000,
        loyerMensuelPotentiel: 430000,
        impayes: 200000,
        logementsEnRetard: 1,
      });
      expect(fiche.logements[0].bail).toMatchObject({
        loyerMensuel: 250000,
        impaye: 200000,
      });
      expect(fiche.logements[1].bail).toBeNull();
    });
  });

  describe('modification', () => {
    beforeEach(() => {
      ctx.prismaMock.immeubleLocatif.findFirst.mockResolvedValue({
        id: 'imm-1',
      });
      ctx.prismaMock.immeubleLocatif.findUniqueOrThrow.mockResolvedValue({
        proprietaireId: 'prop-1',
      });
    });

    it('déplace tous les logements quand le propriétaire change, tant qu’aucun bail n’existe', async () => {
      ctx.prismaMock.proprietaire.findUnique.mockResolvedValue({
        id: 'prop-2',
      });
      ctx.prismaMock.bailLocatif.count.mockResolvedValue(0);
      ctx.prismaMock.immeubleLocatif.update.mockResolvedValue({ id: 'imm-1' });

      await ctx.immeubles.update(
        'imm-1',
        { proprietaireId: 'prop-2' },
        gestionnaire,
      );

      expect(ctx.prismaMock.bienLocatif.updateMany).toHaveBeenCalledWith({
        where: { immeubleId: 'imm-1' },
        data: { proprietaireId: 'prop-2' },
      });
    });

    it('refuse de changer le propriétaire quand des baux existent déjà', async () => {
      ctx.prismaMock.proprietaire.findUnique.mockResolvedValue({
        id: 'prop-2',
      });
      ctx.prismaMock.bailLocatif.count.mockResolvedValue(3);

      await expect(
        ctx.immeubles.update(
          'imm-1',
          { proprietaireId: 'prop-2' },
          gestionnaire,
        ),
      ).rejects.toThrow(ConflictException);
      expect(ctx.prismaMock.immeubleLocatif.update).not.toHaveBeenCalled();
    });

    it('ne touche pas aux logements quand le propriétaire ne change pas', async () => {
      ctx.prismaMock.immeubleLocatif.update.mockResolvedValue({ id: 'imm-1' });
      await ctx.immeubles.update(
        'imm-1',
        { nom: 'Villa Fall — Sacré-Cœur' },
        gestionnaire,
      );
      expect(ctx.prismaMock.bienLocatif.updateMany).not.toHaveBeenCalled();
    });
  });
});
