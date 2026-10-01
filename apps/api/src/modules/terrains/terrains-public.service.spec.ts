import { createTerrainsTestContext } from './terrains.test-support';

describe('TerrainsPublicService', () => {
  let publicCatalog: ReturnType<
    typeof createTerrainsTestContext
  >['publicCatalog'];
  let prismaMock: ReturnType<typeof createTerrainsTestContext>['prismaMock'];

  beforeEach(() => {
    ({ publicCatalog, prismaMock } = createTerrainsTestContext());
  });

  // --- Filtres du catalogue : MTM vend des terrains et des villas ---

  it('filtre le catalogue sur la nature du bien et sa typologie', async () => {
    prismaMock.terrain.findMany.mockResolvedValue([]);
    prismaMock.terrain.count.mockResolvedValue(0);

    await publicCatalog.findPublic({
      typeBien: 'villa',
      nombrePieces: 'F3',
      page: 1,
      pageSize: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const where = prismaMock.terrain.findMany.mock.calls[0][0].where;
    expect(where.typeBien).toBe('villa');
    expect(where.nombrePieces).toBe('F3');
    // Le catalogue public ne montre jamais autre chose que du disponible.
    expect(where.statutCommercial).toBe('Disponible');
  });

  it('propose comme filtres les natures réellement en vente', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.findMany.mockResolvedValue([
      {
        region: 'Thiès',
        commune: 'Saly',
        vocation: null,
        typeBien: 'villa',
        nombrePieces: 'F3',
      },
      {
        region: 'Thiès',
        commune: 'Saly',
        vocation: null,
        typeBien: 'terrain',
        nombrePieces: null,
      },
      {
        region: 'Thiès',
        commune: 'Saly',
        vocation: null,
        typeBien: 'villa',
        nombrePieces: 'F4',
      },
    ]);

    const options = await publicCatalog.getPublicFilterOptions();

    // Dédoublonné et trié, comme les zones : proposer « appartement » quand
    // aucun n'est en vente n'offrirait au visiteur qu'une liste vide.
    expect(options.typeBien).toEqual(['terrain', 'villa']);
    expect(options.nombrePieces).toEqual(['F3', 'F4']);
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
