import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createVentesTestContext } from './ventes.test-support';

describe('VentesPaiementsService', () => {
  let prismaMock: ReturnType<typeof createVentesTestContext>['prismaMock'];
  let paiements: ReturnType<typeof createVentesTestContext>['paiements'];
  let notifierMock: ReturnType<typeof createVentesTestContext>['notifierMock'];

  beforeEach(() => {
    ({ prismaMock, paiements, notifierMock } = createVentesTestContext());
  });

  it('refuse un nouveau paiement sur un dossier déjà soldé ou annulé', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      statut: 'solde',
      prixVente: 1000,
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });

    await expect(
      paiements.createPaiement(
        'd1',
        { montant: 100, mode: 'virement', reference: 'REF-1' },
        { id: 'u1', roles: ['commercial'], permissions: ['ventes:payer'] },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('valider un paiement sur un dossier « en cours » le passe en paiement partiel et bloque le terrain', async () => {
    const user = {
      id: 'u1',
      roles: ['manager'],
      permissions: ['ventes:valider', 'ventes:administrer'],
    };
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.paiement.findFirst.mockResolvedValue({
      id: 'p1',
      montant: 5_000_000,
      dossierVenteId: 'd1',
    });
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      prixVente: 15_000_000,
      statut: 'en_cours',
      terrainId: 't1',
    });
    prismaMock.paiement.aggregate.mockResolvedValue({ _sum: { montant: 0 } });
    prismaMock.paiement.update.mockResolvedValue({
      id: 'p1',
      statut: 'valide',
      montant: 5_000_000,
    });
    prismaMock.echeancePaiement.findMany.mockResolvedValue([]);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.dossierVente.update.mockResolvedValue({});
    prismaMock.terrain.updateMany.mockResolvedValue({ count: 1 });

    const result = await paiements.validatePaiement('d1', 'p1', user);

    expect(result.montantPaye).toBe(5_000_000);
    expect(prismaMock.dossierVente.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statut: 'paiement_partiel' } }),
    );
    expect(prismaMock.terrain.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statutCommercial: 'Réservé' } }),
    );
  });

  it('prévient l’acheteur dans son espace quand son paiement est validé', async () => {
    const user = {
      id: 'u1',
      roles: ['manager'],
      permissions: ['ventes:valider', 'ventes:administrer'],
    };
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.paiement.findFirst.mockResolvedValue({
      id: 'p1',
      montant: 5_000_000,
      dossierVenteId: 'd1',
    });
    prismaMock.dossierVente.findUnique
      .mockResolvedValueOnce({
        prixVente: 15_000_000,
        statut: 'en_cours',
        terrainId: 't1',
      })
      .mockResolvedValueOnce({
        prospectId: 'pros-1',
        referenceInterne: 'VTE-2026-0004',
      });
    prismaMock.paiement.aggregate.mockResolvedValue({ _sum: { montant: 0 } });
    prismaMock.paiement.update.mockResolvedValue({
      id: 'p1',
      statut: 'valide',
      montant: 5_000_000,
    });
    prismaMock.echeancePaiement.findMany.mockResolvedValue([]);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.dossierVente.update.mockResolvedValue({});
    prismaMock.terrain.updateMany.mockResolvedValue({ count: 1 });

    await paiements.validatePaiement('d1', 'p1', user);

    expect(notifierMock.notifierClient).toHaveBeenCalledWith(
      { prospectId: 'pros-1' },
      expect.objectContaining({
        type: 'paiement_valide',
        titre: 'Paiement validé',
        lien: '/espace-client/dossiers',
        dedupeKey: 'paiement-valide:p1',
        message: expect.stringContaining('VTE-2026-0004'),
      }),
    );
  });

  it('refuse de valider un paiement sur un dossier annulé, avec un message lisible', async () => {
    const user = {
      id: 'u1',
      roles: ['manager'],
      permissions: ['ventes:valider', 'ventes:administrer'],
    };
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.paiement.findFirst.mockResolvedValue({
      id: 'p1',
      montant: 100,
      dossierVenteId: 'd1',
    });
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      prixVente: 1000,
      statut: 'annule',
      terrainId: null,
    });
    prismaMock.paiement.aggregate.mockResolvedValue({ _sum: { montant: 0 } });
    prismaMock.paiement.update.mockResolvedValue({
      id: 'p1',
      statut: 'valide',
    });
    prismaMock.echeancePaiement.findMany.mockResolvedValue([]);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await expect(paiements.validatePaiement('d1', 'p1', user)).rejects.toThrow(
      /Annulé/,
    );
  });

  it('accepte un second versement sur un dossier déjà en paiement partiel', async () => {
    const user = {
      id: 'u1',
      roles: ['manager'],
      permissions: ['ventes:valider', 'ventes:administrer'],
    };
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.paiement.findFirst.mockResolvedValue({
      id: 'p2',
      montant: 5_000_000,
      dossierVenteId: 'd1',
    });
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      prixVente: 15_000_000,
      statut: 'paiement_partiel',
      terrainId: 't1',
    });
    prismaMock.paiement.aggregate.mockResolvedValue({
      _sum: { montant: 5_000_000 },
    });
    prismaMock.paiement.update.mockResolvedValue({
      id: 'p2',
      statut: 'valide',
      montant: 5_000_000,
    });
    prismaMock.echeancePaiement.findMany.mockResolvedValue([]);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.dossierVente.update.mockResolvedValue({});

    const result = await paiements.validatePaiement('d1', 'p2', user);

    expect(result.montantPaye).toBe(10_000_000);
    expect(prismaMock.terrain.updateMany).not.toHaveBeenCalled();
  });
  describe('contre-passation', () => {
    const admin = {
      id: 'u-admin',
      roles: ['direction'],
      permissions: ['ventes:administrer'],
    };

    it('refuse tant qu’une commission a été payée sur le dossier', async () => {
      prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
      prismaMock.paiement.findFirst.mockResolvedValue({
        id: 'p1',
        montant: 100,
        statut: 'valide',
        notes: null,
      });
      prismaMock.dossierVente.findUnique.mockResolvedValue({
        statut: 'solde',
        prixVente: 100,
        terrainId: 't1',
        reservations: [],
      });
      prismaMock.commissionVente.count.mockResolvedValue(1);

      await expect(
        paiements.reversePaiement(
          'd1',
          'p1',
          { motif: 'Erreur de saisie' },
          admin,
        ),
      ).rejects.toThrow(/commission a déjà été payée/);
      expect(prismaMock.paiement.update).not.toHaveBeenCalled();
    });
  });

  describe('refus et séparation des tâches', () => {
    const user = {
      id: 'u-valideur',
      roles: ['manager'],
      permissions: ['ventes:valider'],
    };

    it('refuse un paiement en attente et conserve le motif', async () => {
      prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
      prismaMock.paiement.findFirst.mockResolvedValue({
        id: 'p1',
        statut: 'en_attente',
        notes: 'Reçu par WhatsApp',
      });
      prismaMock.paiement.updateMany.mockResolvedValue({ count: 1 });

      const result = await paiements.refusePaiement(
        'd1',
        'p1',
        { motif: ' Virement introuvable ' },
        user,
      );

      expect(result).toEqual({
        id: 'p1',
        statut: 'refuse',
        motif: 'Virement introuvable',
      });
      expect(prismaMock.paiement.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', statut: 'en_attente' },
        data: {
          statut: 'refuse',
          notes: 'Reçu par WhatsApp\nRefusé : Virement introuvable',
        },
      });
    });

    it('ne refuse pas un paiement déjà validé', async () => {
      prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
      prismaMock.paiement.findFirst.mockResolvedValue({
        id: 'p1',
        statut: 'valide',
        notes: null,
      });

      await expect(
        paiements.refusePaiement('d1', 'p1', { motif: 'Erreur' }, user),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.paiement.updateMany).not.toHaveBeenCalled();
    });

    it('signale un refus perdu face à une validation concurrente', async () => {
      prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
      prismaMock.paiement.findFirst.mockResolvedValue({
        id: 'p1',
        statut: 'en_attente',
        notes: null,
      });
      prismaMock.paiement.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        paiements.refusePaiement('d1', 'p1', { motif: 'Erreur' }, user),
      ).rejects.toThrow(ConflictException);
    });

    it('empêche de valider son propre paiement quand le contrôle à deux personnes est actif', async () => {
      prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
      prismaMock.paiement.findFirst.mockResolvedValue({
        id: 'p1',
        montant: 100,
        statut: 'en_attente',
        recordedById: 'u-valideur',
      });
      prismaMock.systemSetting.findUnique.mockResolvedValue({
        key: 'paiements.validationParUnAutre',
        value: true,
      });

      await expect(
        paiements.validatePaiement('d1', 'p1', user),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.paiement.update).not.toHaveBeenCalled();
    });
  });
});
