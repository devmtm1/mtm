import { createTerrainsTestContext } from './terrains.test-support';

describe('TerrainsPublicService', () => {
  let publicCatalog: ReturnType<
    typeof createTerrainsTestContext
  >['publicCatalog'];

  beforeEach(() => {
    ({ publicCatalog } = createTerrainsTestContext());
  });

  it('retire les champs internes de la projection publique', () => {
    const result = publicCatalog.toPublic({
      id: 't1',
      referenceInterne: 'REF-001',
      nom: 'Terrain public',
      statutJuridique: 'Titre foncier',
      niveauVerification: 'Vérifié',
      region: 'Dakar',
      commune: 'Dakar',
      localisationDetail: 'Corniche',
      latitude: 14.7,
      longitude: -17.4,
      superficie: 500,
      uniteSuperficie: 'm²',
      dimensions: { largeur: 20, profondeur: 25 },
      prixPublic: 1000000,
      misEnAvant: true,
      accesRoutier: 'Bitumé',
      eauDisponible: true,
      electriciteDisponible: true,
      voisinage: 'Résidentiel',
      vocation: 'Habitation',
      proximiteAxes: '500m de la route',
      pointsInteret: { ecole: '200m' },
      medias: [
        {
          id: 'm1',
          type: 'photo',
          title: 'Vue principale',
          isPublic: true,
          sortOrder: 0,
          storageKey: 'terrains/t1/photo',
          resourceType: 'image',
          capturedAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      documents: [
        {
          id: 'd1',
          type: 'titre_foncier',
          title: 'Titre foncier',
          isPublic: true,
          version: 1,
          storageKey: 'terrains/t1/doc',
          resourceType: 'raw',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      prixAcquisition: 500000,
      marge: 500000,
      commission: 100000,
      notesInternes: 'Confidentiel',
      proprietaire: { lastName: 'Sensible' },
      commercialResponsable: { id: 'u1' },
    });

    expect(result.id).toBe('t1');
    expect(result.nom).toBe('Terrain public');
    expect(result.prixPublic).toBe(1000000);
    expect(result).not.toHaveProperty('prixAcquisition');
    expect(result).not.toHaveProperty('marge');
    expect(result).not.toHaveProperty('commission');
    expect(result).not.toHaveProperty('notesInternes');
    expect(result).not.toHaveProperty('proprietaire');
    expect(result).not.toHaveProperty('commercialResponsable');
    expect(result.medias[0]).not.toHaveProperty('storageKey');
    expect(result.medias[0]).not.toHaveProperty('resourceType');
    expect(result.medias[0]).toHaveProperty('secureUrl');
    expect(result.documents[0]).not.toHaveProperty('storageKey');
    expect(result.documents[0]).not.toHaveProperty('resourceType');
    expect(result.documents[0]).toHaveProperty('secureUrl');
  });
});
