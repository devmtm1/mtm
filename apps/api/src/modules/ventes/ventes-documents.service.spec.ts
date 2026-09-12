import { createVentesTestContext } from './ventes.test-support';

describe('VentesDocumentsService', () => {
  let prismaMock: ReturnType<typeof createVentesTestContext>['prismaMock'];
  let cloudinaryMock: ReturnType<
    typeof createVentesTestContext
  >['cloudinaryMock'];
  let documents: ReturnType<typeof createVentesTestContext>['documents'];

  beforeEach(() => {
    ({ prismaMock, cloudinaryMock, documents } = createVentesTestContext());
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
      value: [
        'bon_reservation',
        'recu',
        'facture',
        'contrat',
        'etat_paiement',
        'justificatif',
        'autre',
      ],
    });
    prismaMock.documentVente.create.mockResolvedValue({
      id: 'doc1',
      type: 'bon_reservation',
      isGenerated: true,
    });

    const result = await documents.generateDocument(
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

  it('affiche les documents de son propre dossier lors d’une recherche et masque les fichiers sensibles', async () => {
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });
    prismaMock.documentVente.findMany.mockResolvedValue([
      {
        id: 'doc-public',
        isPublic: true,
        storageKey: 'doc-public',
        resourceType: 'raw',
      },
      {
        id: 'doc-private',
        isPublic: false,
        storageKey: 'doc-private',
        resourceType: 'raw',
      },
    ]);

    const result = await documents.searchDocuments(
      { dossierVenteId: 'd1' },
      { id: 'u1', roles: ['commercial'], permissions: ['ventes:consulter'] },
    );

    expect(result).toHaveLength(2);
    expect(result.every((document) => document.id.startsWith('doc-'))).toBe(
      true,
    );
    expect(result.every((document) => !('storageKey' in document))).toBe(true);
    expect(result[0].secureUrl).toBe('https://example.com/document.pdf');
  });
});
