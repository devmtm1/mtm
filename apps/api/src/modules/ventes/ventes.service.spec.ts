import { ConflictException } from '@nestjs/common';
import { createVentesTestContext } from './ventes.test-support';

describe('VentesService', () => {
  let prismaMock: ReturnType<typeof createVentesTestContext>['prismaMock'];
  let service: ReturnType<typeof createVentesTestContext>['service'];

  beforeEach(() => {
    ({ prismaMock, service } = createVentesTestContext());
  });

  it('refuse de passer un dossier à soldé sans paiement total validé', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      statut: 'paiement_partiel',
      prixVente: 1000,
      reservations: [
        {
          id: 'r1',
          statut: 'active',
          dateExpiration: new Date(Date.now() + 86400000),
        },
      ],
      paiements: [{ montant: 600, statut: 'valide' }],
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.paiement.aggregate.mockResolvedValue({
      _sum: { montant: 600 },
    });

    await expect(
      service.updateStatus(
        'd1',
        { statut: 'solde' },
        { id: 'u1', roles: ['commercial'], permissions: ['ventes:modifier'] },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('masque les détails financiers des paiements pour un commercial standard', async () => {
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      prospectId: 'p1',
      terrainId: 't1',
      mandatId: null,
      commercialResponsableId: 'u1',
      referenceInterne: 'DV-001',
      prixVente: 1000,
      commissionEstimee: 100,
      notes: null,
      statut: 'reserve',
      dateVente: null,
      reservationRequestId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      prospect: {
        id: 'p1',
        nom: 'Martin',
        prenom: 'Alice',
        email: 'alice@test.fr',
        telephone: null,
        paysResidence: null,
        besoins: null,
        preferences: null,
      },
      terrain: {
        id: 't1',
        referenceInterne: 'T-001',
        nom: 'Parcelle A',
        parcelleMatricule: null,
        statutJuridique: null,
        typeDocumentFoncier: null,
        niveauVerification: null,
        region: null,
        commune: null,
        localisationDetail: null,
        latitude: null,
        longitude: null,
        superficie: null,
        uniteSuperficie: null,
        dimensions: null,
        prixPublic: null,
        statutCommercial: 'Réservé',
        accesRoutier: null,
        eauDisponible: null,
        electriciteDisponible: null,
        voisinage: null,
        vocation: null,
        proximiteAxes: null,
        pointsInteret: null,
      },
      mandat: null,
      commercialResponsable: {
        id: 'u1',
        firstName: 'Jean',
        lastName: 'Dupont',
      },
      reservations: [],
      paiements: [{ montant: 500, statut: 'valide' }],
      commissions: [],
      documents: [],
    });

    const result = await service.findOne('d1', {
      id: 'u1',
      roles: ['commercial'],
      permissions: ['ventes:consulter'],
    });

    expect(result.montantPaye).toBeUndefined();
    expect(result.soldeRestant).toBeUndefined();
    expect(result.paiements).toBeUndefined();
  });

  it('masque les paiements dans la liste de dossiers pour un commercial standard', async () => {
    prismaMock.dossierVente.findMany.mockResolvedValue([
      {
        id: 'd1',
        prospectId: 'p1',
        terrainId: 't1',
        mandatId: null,
        commercialResponsableId: 'u1',
        referenceInterne: 'DV-001',
        prixVente: 1000,
        commissionEstimee: 100,
        notes: null,
        statut: 'reserve',
        dateVente: null,
        reservationRequestId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        prospect: {
          id: 'p1',
          nom: 'Martin',
          prenom: 'Alice',
          email: 'alice@test.fr',
        },
        terrain: {
          id: 't1',
          referenceInterne: 'T-001',
          nom: 'Parcelle A',
          statutCommercial: 'Réservé',
        },
        mandat: null,
        commercialResponsable: {
          id: 'u1',
          firstName: 'Jean',
          lastName: 'Dupont',
        },
        reservations: [],
        paiements: [{ montant: 500, statut: 'valide' }],
        _count: { documents: 0, commissions: 0 },
      },
    ]);

    const result = await service.findAll({
      id: 'u1',
      roles: ['commercial'],
      permissions: ['ventes:consulter'],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('paiements');
    expect(result[0].montantPaye).toBeUndefined();
    expect(result[0].soldeRestant).toBeUndefined();
  });
});
