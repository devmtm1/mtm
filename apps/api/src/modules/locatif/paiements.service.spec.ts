import { BadRequestException } from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';

describe('PaiementsLoyerService', () => {
  const responsable = {
    id: 'u-loc',
    roles: ['responsable_gestion_locative'],
    permissions: ['locatif:valider'],
  };

  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let paiements: ReturnType<typeof createLocatifTestContext>['paiements'];

  beforeEach(() => {
    ({ prismaMock, paiements } = createLocatifTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    // Accès : le bail existe et appartient au périmètre du responsable.
    prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
      statut: 'actif',
    });
    prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    prismaMock.bailLocatif.findUniqueOrThrow.mockResolvedValue({
      id: 'bail-1',
      loyerMensuel: 100000,
      jourEcheance: 5,
      dateDebut: new Date('2026-10-01T00:00:00Z'),
      dateFin: null,
    });
    prismaMock.bailLocatif.update.mockResolvedValue({});
    prismaMock.echeanceLoyer.update.mockResolvedValue({});
    prismaMock.paiementLoyer.create.mockResolvedValue({ id: 'p1' });
    prismaMock.paiementLoyer.update.mockResolvedValue({ id: 'p1' });
    // Recalcul de la situation de paiement, après chaque mouvement.
    prismaMock.echeanceLoyer.findMany.mockResolvedValue([]);
    prismaMock.paiementLoyer.aggregate.mockResolvedValue({
      _sum: { montant: 0 },
    });
  });

  describe('saisie', () => {
    it('enregistre le versement en attente, sans toucher aux échéances', async () => {
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
        id: 'ech-1',
        statut: 'impayee',
      });

      await paiements.create(
        'bail-1',
        {
          type: 'normal',
          montant: 100000,
          modePaiement: 'especes',
          echeanceId: 'ech-1',
        },
        responsable,
      );

      // Section 24 : l'imputation attend la validation du contrôleur.
      expect(prismaMock.echeanceLoyer.update).not.toHaveBeenCalled();
      expect(prismaMock.paiementLoyer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ montant: 100000 }),
        }),
      );
    });

    it('refuse un encaissement de loyer sur un bail clôturé', async () => {
      prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'termine',
      });

      await expect(
        paiements.create(
          'bail-1',
          { type: 'normal', montant: 100000, modePaiement: 'especes' },
          responsable,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validation', () => {
    it('impute le versement sur l’échéance ciblée et la marque payée', async () => {
      prismaMock.paiementLoyer.findFirst.mockResolvedValue({
        id: 'p1',
        type: 'normal',
        montant: 100000,
        echeanceId: 'ech-1',
        statut: 'en_attente',
      });
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
        id: 'ech-1',
        bailLocatifId: 'bail-1',
        montantPrevu: 100000,
        montantPaye: 0,
        dateEcheance: new Date('2099-01-05'),
      });

      await paiements.valider('bail-1', 'p1', responsable);

      expect(prismaMock.echeanceLoyer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ech-1' },
          data: expect.objectContaining({
            montantPaye: 100000,
            statut: 'payee',
          }),
        }),
      );
      expect(prismaMock.paiementLoyer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'valide' }),
        }),
      );
    });

    it('refuse une validation qui dépasserait ce qui reste dû sur l’échéance', async () => {
      prismaMock.paiementLoyer.findFirst.mockResolvedValue({
        id: 'p1',
        type: 'normal',
        montant: 50000,
        echeanceId: 'ech-1',
        statut: 'en_attente',
      });
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
        id: 'ech-1',
        bailLocatifId: 'bail-1',
        montantPrevu: 100000,
        montantPaye: 80000,
        dateEcheance: new Date('2099-01-05'),
      });

      await expect(
        paiements.valider('bail-1', 'p1', responsable),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.paiementLoyer.update).not.toHaveBeenCalled();
    });

    it('répartit une avance et génère les mois manquants plutôt que de perdre le surplus', async () => {
      prismaMock.paiementLoyer.findFirst.mockResolvedValue({
        id: 'p1',
        type: 'avance',
        montant: 250000,
        echeanceId: null,
        statut: 'en_attente',
      });
      // Deux mois dus (200 000) : il reste 50 000 à imputer au-delà.
      prismaMock.echeanceLoyer.findMany
        .mockResolvedValueOnce([
          {
            id: 'ech-1',
            montantPrevu: 100000,
            montantPaye: 0,
            dateEcheance: new Date('2099-01-05'),
            statut: 'a_venir',
          },
          {
            id: 'ech-2',
            montantPrevu: 100000,
            montantPaye: 0,
            dateEcheance: new Date('2099-02-05'),
            statut: 'a_venir',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'ech-3',
            montantPrevu: 100000,
            montantPaye: 0,
            dateEcheance: new Date('2099-03-05'),
            statut: 'a_venir',
          },
        ])
        .mockResolvedValue([]);
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
        periode: new Date('2099-02-01T00:00:00Z'),
      });
      prismaMock.echeanceLoyer.createMany.mockResolvedValue({ count: 1 });

      await paiements.valider('bail-1', 'p1', responsable);

      // Un troisième mois est créé pour accueillir le reliquat de l'avance.
      expect(prismaMock.echeanceLoyer.createMany).toHaveBeenCalled();
      expect(prismaMock.echeanceLoyer.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'ech-3' },
          data: expect.objectContaining({ montantPaye: 50000 }),
        }),
      );
    });

    it('refuse un versement qui dépasse tout ce qui peut être dû', async () => {
      prismaMock.paiementLoyer.findFirst.mockResolvedValue({
        id: 'p1',
        type: 'avance',
        montant: 250000,
        echeanceId: null,
        statut: 'en_attente',
      });
      prismaMock.echeanceLoyer.findMany.mockResolvedValue([]);
      prismaMock.echeanceLoyer.findFirst.mockResolvedValue({
        periode: new Date('2026-12-01T00:00:00Z'),
      });
      // Bail borné dans le temps : aucun mois supplémentaire à générer.
      prismaMock.echeanceLoyer.createMany.mockResolvedValue({ count: 0 });

      await expect(
        paiements.valider('bail-1', 'p1', responsable),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejet', () => {
    it('retire des échéances un versement validé à tort', async () => {
      prismaMock.paiementLoyer.findFirst.mockResolvedValue({
        id: 'p1',
        type: 'normal',
        montant: 100000,
        echeanceId: 'ech-1',
        statut: 'valide',
        notes: null,
      });
      prismaMock.echeanceLoyer.findMany.mockResolvedValueOnce([
        {
          id: 'ech-1',
          montantPrevu: 100000,
          montantPaye: 100000,
          dateEcheance: new Date('2026-10-05T00:00:00Z'),
          statut: 'payee',
        },
      ]);

      await paiements.rejeter(
        'bail-1',
        'p1',
        { motif: 'Chèque sans provision' },
        responsable,
      );

      expect(prismaMock.echeanceLoyer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ech-1' },
          data: expect.objectContaining({ montantPaye: 0 }),
        }),
      );
      expect(prismaMock.paiementLoyer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'rejete' }),
        }),
      );
    });
  });
});
