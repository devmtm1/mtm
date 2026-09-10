import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VentesService } from './ventes.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

describe('VentesService', () => {
  let service: VentesService;
  let prismaMock: {
    dossierVente: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    prospect: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    terrain: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    reservation: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    paiement: {
      aggregate: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    commissionVente: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    documentVente: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    role: {
      findUnique: jest.Mock;
    };
    reservationRequest: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    systemSetting: {
      findUnique: jest.Mock;
    };
    mandat: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let cloudinaryMock: {
    upload: jest.Mock;
    destroy: jest.Mock;
    url: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      dossierVente: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      prospect: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      terrain: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      reservation: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      paiement: {
        aggregate: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      commissionVente: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      documentVente: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      reservationRequest: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      systemSetting: {
        findUnique: jest.fn(),
      },
      mandat: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    cloudinaryMock = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'ventes/d1/generated/bon_reservation',
        resourceType: 'raw',
      }),
      destroy: jest.fn(),
      url: jest.fn().mockReturnValue('https://example.com/document.pdf'),
    };

    prismaMock.$transaction = jest.fn(async (callback) => callback(prismaMock));

    service = new VentesService(
      prismaMock as unknown as PrismaService,
      cloudinaryMock as unknown as CloudinaryService,
    );
  });

  it('calcule une commission avec bonus et palier selon les règles commerciales', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      prixVente: 1000000,
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
      roles: [{ role: { name: 'commercial' } }],
    });
    prismaMock.commissionVente.create.mockResolvedValue({
      id: 'c1',
      montantEstime: 25000,
      commercial: { id: 'u1', firstName: 'Jean', lastName: 'Dupont' },
    });
    prismaMock.dossierVente.update.mockResolvedValue({});

    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: [
        {
          id: 'commercial-standard',
          typeRegle: 'pourcentage',
          taux: 2,
          bonus: 5000,
          palier: 500000,
        },
      ],
    });

    const result = await service.createCommission(
      'd1',
      { commercialId: 'u1', regleId: 'commercial-standard' },
      { id: 'u1', roles: ['commercial'], permissions: ['ventes:modifier'] },
    );

    expect(prismaMock.commissionVente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commercialId: 'u1',
          bonus: 5000,
          palier: 500000,
          montantEstime: 25000,
        }),
      }),
    );
    expect(result.montantEstime).toBe(25000);
  });

  it('génère un document de vente conforme au type métier supporté', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      referenceInterne: 'DV-001',
      prospect: { nom: 'Martin', prenom: 'Alice' },
      terrain: { nom: 'Parcelle A', referenceInterne: 'T-001' },
      prixVente: 1000000,
      reservations: [],
      paiements: [],
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['bon_reservation', 'recu', 'facture', 'contrat', 'etat_paiement', 'justificatif', 'autre'],
    });
    prismaMock.documentVente.create.mockResolvedValue({
      id: 'doc1',
      type: 'bon_reservation',
      isGenerated: true,
    });

    const result = await service.generateDocument(
      'd1',
      { type: 'bon_reservation', title: 'Bon de réservation' },
      { id: 'u1', roles: ['commercial'], permissions: ['ventes:modifier'] },
    );

    expect(cloudinaryMock.upload).toHaveBeenCalled();
    expect(prismaMock.documentVente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'bon_reservation',
          isGenerated: true,
          title: 'Bon de réservation',
          dossierVenteId: 'd1',
        }),
      }),
    );
    expect(result.type).toBe('bon_reservation');
  });

  it('refuse de passer un dossier à soldé sans paiement total validé', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      statut: 'paiement_partiel',
      prixVente: 1000,
      reservations: [{ id: 'r1', statut: 'active', dateExpiration: new Date(Date.now() + 86400000) }],
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

  it('affiche les documents de son propre dossier lors d’une recherche et masque les fichiers sensibles', async () => {
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.documentVente.findMany.mockResolvedValue([
      { id: 'doc-public', isPublic: true, storageKey: 'doc-public', resourceType: 'raw' },
      { id: 'doc-private', isPublic: false, storageKey: 'doc-private', resourceType: 'raw' },
    ]);

    const result = await service.searchDocuments(
      { dossierVenteId: 'd1' },
      { id: 'u1', roles: ['commercial'], permissions: ['ventes:consulter'] },
    );

    expect(result).toHaveLength(2);
    expect(result.every((document) => document.id.startsWith('doc-'))).toBe(true);
    expect(result.every((document) => !('storageKey' in document))).toBe(true);
    expect(result[0].secureUrl).toBe('https://example.com/document.pdf');
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
        prospect: { id: 'p1', nom: 'Martin', prenom: 'Alice', email: 'alice@test.fr' },
        terrain: { id: 't1', referenceInterne: 'T-001', nom: 'Parcelle A', statutCommercial: 'Réservé' },
        mandat: null,
        commercialResponsable: { id: 'u1', firstName: 'Jean', lastName: 'Dupont' },
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

  it('refuse un nouveau paiement sur un dossier déjà soldé ou annulé', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      statut: 'solde',
      prixVente: 1000,
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });

    await expect(
      service.createPaiement(
        'd1',
        { montant: 100, mode: 'virement', reference: 'REF-1' },
        { id: 'u1', roles: ['commercial'], permissions: ['ventes:payer'] },
      ),
    ).rejects.toThrow(ConflictException);
  });
});
