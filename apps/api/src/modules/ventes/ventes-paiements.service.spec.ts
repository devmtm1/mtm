import { ConflictException } from '@nestjs/common';
import { createVentesTestContext } from './ventes.test-support';

describe('VentesPaiementsService', () => {
  let prismaMock: ReturnType<typeof createVentesTestContext>['prismaMock'];
  let paiements: ReturnType<typeof createVentesTestContext>['paiements'];

  beforeEach(() => {
    ({ prismaMock, paiements } = createVentesTestContext());
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
});
