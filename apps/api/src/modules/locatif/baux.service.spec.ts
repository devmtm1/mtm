import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';
import { LOT_ECHEANCES } from './echeance-loyer.helper';

describe('BauxService', () => {
  const responsable = {
    id: 'u-loc',
    roles: ['responsable_gestion_locative'],
    permissions: ['locatif:modifier'],
  };
  const payeur = {
    ...responsable,
    permissions: ['locatif:modifier', 'locatif:payer'],
  };

  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let baux: ReturnType<typeof createLocatifTestContext>['baux'];

  beforeEach(() => {
    ({ prismaMock, baux } = createLocatifTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.bailLocatif.update.mockResolvedValue({ id: 'bail-1' });
    prismaMock.bienLocatif.update.mockResolvedValue({ id: 'bien-1' });
    prismaMock.echeanceLoyer.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([]);
    prismaMock.mouvementCaution.findMany.mockResolvedValue([]);
    prismaMock.mouvementCaution.create.mockResolvedValue({ id: 'mvt-1' });
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
    prismaMock.echeanceLoyer.aggregate.mockResolvedValue({
      _sum: { montantPaye: 0 },
    });
  });

  describe('création', () => {
    beforeEach(() => {
      prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bienLocatif.findUnique.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bailLocatif.findFirst.mockResolvedValue(null);
      prismaMock.locataire.findUnique.mockResolvedValue({ id: 'loc-1' });
      prismaMock.bailLocatif.count.mockResolvedValue(0);
      prismaMock.bailLocatif.findUnique.mockResolvedValue(null);
      prismaMock.bailLocatif.create.mockResolvedValue({ id: 'bail-1' });
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue(null);
      prismaMock.echeanceLoyer.createMany.mockResolvedValue({
        count: LOT_ECHEANCES,
      });
      prismaMock.bailLocatif.findUniqueOrThrow.mockResolvedValue({
        id: 'bail-1',
        referenceInterne: 'B-2026-0001',
        cautionMontant: 150000,
      });
    });

    it('génère les échéances du bail à sa création et loue le bien', async () => {
      await baux.create(
        'bien-1',
        {
          locataireId: 'loc-1',
          loyerMensuel: 150000,
          dateDebut: '2026-10-01',
        },
        responsable,
      );

      // Douze mois générés d'un coup : c'est le lot par défaut, pas un par un.
      expect(
        prismaMock.echeanceLoyer.createMany.mock.calls[0][0].data,
      ).toHaveLength(LOT_ECHEANCES);
      // Le bien passe loué : sans ça, il resterait affiché comme disponible.
      expect(prismaMock.bienLocatif.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'loue' } }),
      );
    });

    it('ouvre l’historique de caution quand elle est encaissée à la signature', async () => {
      await baux.create(
        'bien-1',
        {
          locataireId: 'loc-1',
          loyerMensuel: 150000,
          dateDebut: '2026-10-01',
          cautionMontant: 150000,
          cautionDate: '2026-09-28',
        },
        responsable,
      );

      // Sans ce mouvement, la caution resterait « non versée » alors que
      // l'argent est encaissé (section 15).
      expect(prismaMock.mouvementCaution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'versement', montant: 150000 }),
        }),
      );
    });

    it('refuse un second bail actif sur un bien déjà loué', async () => {
      prismaMock.bailLocatif.findFirst.mockResolvedValue({
        id: 'bail-existant',
      });

      await expect(
        baux.create(
          'bien-1',
          {
            locataireId: 'loc-2',
            loyerMensuel: 100000,
            dateDebut: '2026-10-01',
          },
          responsable,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.bailLocatif.create).not.toHaveBeenCalled();
    });
  });

  describe('révision de loyer', () => {
    it('applique le nouveau loyer aux échéances futures encore dues', async () => {
      prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'actif',
        loyerMensuel: 150000,
        jourEcheance: 5,
        dateDebut: new Date('2026-10-01T00:00:00Z'),
        dateFin: null,
      });
      prismaMock.echeanceLoyer.findMany.mockResolvedValue([
        {
          id: 'ech-futur',
          montantPrevu: 150000,
          montantPaye: 0,
          dateEcheance: new Date('2099-01-05'),
          statut: 'a_venir',
        },
      ]);
      prismaMock.echeanceLoyer.update.mockResolvedValue({});
      prismaMock.bailLocatif.findUniqueOrThrow.mockResolvedValue({
        id: 'bail-1',
        cautionMontant: 0,
      });

      await baux.update('bail-1', { loyerMensuel: 170000 }, responsable);

      expect(prismaMock.echeanceLoyer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ech-futur' },
          data: expect.objectContaining({ montantPrevu: 170000 }),
        }),
      );
    });

    it('refuse de modifier un bail déjà clôturé', async () => {
      prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'termine',
        loyerMensuel: 150000,
        jourEcheance: 5,
        dateDebut: new Date('2026-10-01T00:00:00Z'),
        dateFin: null,
      });

      await expect(
        baux.update('bail-1', { loyerMensuel: 170000 }, responsable),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('sortie', () => {
    beforeEach(() => {
      prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'actif',
        cautionMontant: 150000,
      });
      prismaMock.bailLocatif.findUniqueOrThrow.mockResolvedValue({
        id: 'bail-1',
        statut: 'termine',
        cautionMontant: 150000,
        regularisationMontant: 0,
        cautionStatut: 'remboursee',
      });
    });

    it('refuse de donner préavis sur un bail déjà clôturé', async () => {
      prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'termine',
      });

      await expect(
        baux.donnerPreavis(
          'bail-1',
          { preavisDonneLe: '2026-10-01', preavisDepartPrevu: '2026-11-01' },
          responsable,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('neutralise les mois postérieurs au départ et libère le bien', async () => {
      prismaMock.mouvementCaution.findMany.mockResolvedValue([
        { type: 'versement', montant: 150000, date: new Date() },
      ]);

      await baux.cloturer('bail-1', { dateSortieReelle: '2026-12-01' }, payeur);

      // Les mois suivants ne sont plus dus : sans ça, le bail continuerait
      // d'accumuler des impayés au nom d'un locataire parti.
      expect(prismaMock.echeanceLoyer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { statut: 'annulee', montantPrevu: 0, montantPaye: 0 },
        }),
      );
      expect(prismaMock.bienLocatif.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bien-1' },
          data: { statut: 'disponible' },
        }),
      );
    });

    it('réserve la restitution de caution à la permission « payer »', async () => {
      prismaMock.mouvementCaution.findMany.mockResolvedValue([
        { type: 'versement', montant: 150000, date: new Date() },
      ]);

      // Rien n'est dû : le calcul propose de rendre la caution, ce que le
      // gestionnaire sans permission « payer » ne peut pas faire (section 24).
      await expect(
        baux.cloturer(
          'bail-1',
          { dateSortieReelle: '2026-12-01' },
          responsable,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('exige un motif pour une résiliation sans préavis et neutralise les échéances', async () => {
      prismaMock.bailLocatif.update.mockResolvedValue({
        id: 'bail-1',
        statut: 'resilie_sans_preavis',
      });

      const resultat = await baux.resilierSansPreavis(
        'bail-1',
        {
          motifCloture: 'Départ constaté sans préavis ni restitution des clés',
        },
        responsable,
      );

      expect(resultat.statut).toBe('resilie_sans_preavis');
      expect(prismaMock.echeanceLoyer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { statut: 'annulee', montantPrevu: 0, montantPaye: 0 },
        }),
      );
    });
  });

  describe('changement de locataire', () => {
    it('clôt l’ancien bail et ouvre le nouveau dans une seule transaction', async () => {
      prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bienLocatif.findUnique.mockResolvedValue({ id: 'bien-1' });
      prismaMock.bailLocatif.findFirst
        .mockResolvedValueOnce({ id: 'bail-ancien' }) // bail en cours
        .mockResolvedValue(null); // plus de bail actif pour la création
      prismaMock.locataire.findUnique.mockResolvedValue({ id: 'loc-2' });
      prismaMock.bailLocatif.count.mockResolvedValue(1);
      prismaMock.bailLocatif.findUnique.mockResolvedValue(null);
      prismaMock.bailLocatif.create.mockResolvedValue({ id: 'bail-nouveau' });
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue(null);
      prismaMock.echeanceLoyer.createMany.mockResolvedValue({ count: 12 });
      prismaMock.bailLocatif.findUniqueOrThrow.mockResolvedValue({
        id: 'bail-nouveau',
        referenceInterne: 'B-2026-0002',
      });

      const resultat = await baux.changerLocataire(
        'bien-1',
        {
          dateSortieReelle: '2026-11-15',
          nouveauBail: {
            locataireId: 'loc-2',
            loyerMensuel: 95000,
            dateDebut: '2026-11-16',
          },
        },
        responsable,
      );

      expect(resultat.id).toBe('bail-nouveau');
      // Une seule transaction : si l'ouverture échoue, l'ancien bail n'est pas
      // clôturé pour rien et le bien ne reste pas « loué » sans bail.
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.bailLocatif.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bail-ancien' },
          data: expect.objectContaining({ statut: 'termine' }),
        }),
      );
    });
  });
});
