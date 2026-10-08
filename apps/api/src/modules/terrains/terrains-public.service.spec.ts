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
      { region: 'Thiès', commune: 'Saly', vocation: null, typeBien: 'villa' },
      { region: 'Thiès', commune: 'Saly', vocation: null, typeBien: 'terrain' },
      { region: 'Thiès', commune: 'Saly', vocation: null, typeBien: 'villa' },
    ]);

    const options = await publicCatalog.getPublicFilterOptions();

    // Dédoublonné et trié, comme les zones : proposer « appartement » quand
    // aucun n'est en vente n'offrirait au visiteur qu'une liste vide.
    expect(options.typeBien).toEqual(['terrain', 'villa']);
  });

  it('propose toujours les typologies, même si aucune fiche ne la porte', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    // Le cas réel qui faisait disparaître le filtre : une villa publiée sans
    // typologie renseignée. F1 à F6 est une liste fermée et connue d'avance ;
    // la déduire des fiches empêchait de chercher un F3 tant que personne
    // n'en avait saisi un, sans rien dire au visiteur.
    prismaMock.terrain.findMany.mockResolvedValue([
      {
        region: 'Fatick',
        commune: 'Fatick',
        vocation: null,
        typeBien: 'villa',
      },
    ]);

    const options = await publicCatalog.getPublicFilterOptions();

    expect(options.nombrePieces).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
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

  // --- Références vendues : affichées seulement si MTM les a cochées ---

  describe('références vendues', () => {
    const requete = {
      statut: 'vendu' as const,
      page: 1,
      pageSize: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    const vendu = (extra: Record<string, unknown> = {}) => ({
      id: 't9',
      statutCommercial: 'Vendu',
      referenceInterne: 'MTM-TH-009',
      nom: 'Villa vendue à Saly',
      statutJuridique: 'Titre foncier',
      niveauVerification: 'Vérifié',
      region: 'Thiès',
      commune: 'Saly',
      localisationDetail: 'Rue 12, derrière la mosquée',
      latitude: 14.44,
      longitude: -17.0,
      typeBien: 'villa',
      superficie: 400,
      uniteSuperficie: 'm²',
      prixPublic: 120_000_000,
      description: 'Une description complète',
      accesRoutier: 'Route goudronnée',
      voisinage: 'Calme',
      proximiteAxes: 'À 5 min',
      pointsInteret: [{ nom: 'Plage', distanceKm: 1 }],
      misEnAvant: true,
      medias: [
        {
          id: 'm1',
          type: 'photo',
          title: null,
          isPublic: true,
          sortOrder: 0,
          storageKey: 'k1',
          resourceType: 'image',
          capturedAt: null,
          createdAt: 'x',
        },
        {
          id: 'm2',
          type: 'video',
          title: null,
          isPublic: true,
          sortOrder: 1,
          storageKey: 'k2',
          resourceType: 'video',
          capturedAt: null,
          createdAt: 'x',
        },
      ],
      documents: [
        {
          id: 'd1',
          type: 'titre',
          title: 'Titre',
          isPublic: true,
          version: 1,
          storageKey: 'kd',
          resourceType: 'raw',
          createdAt: 'x',
        },
      ],
      dossiers: [{ dateVente: new Date('2026-09-15T00:00:00Z') }],
      createdAt: 'x',
      updatedAt: 'x',
      ...extra,
    });

    it('« tous » mêle les biens à vendre et les références vendues cochées, les biens à vendre d’abord', async () => {
      prismaMock.terrain.findMany.mockResolvedValue([
        vendu({ id: 't1', statutCommercial: 'Disponible', dossiers: [] }),
        vendu(),
      ]);
      prismaMock.terrain.count.mockResolvedValue(2);

      const { items } = await publicCatalog.findPublic({
        ...requete,
        statut: 'tous',
      });

      const appel = prismaMock.terrain.findMany.mock.calls[0][0];
      expect(appel.where.OR).toEqual([
        expect.objectContaining({ statutCommercial: 'Disponible' }),
        expect.objectContaining({
          statutCommercial: 'Vendu',
          referenceVendue: true,
        }),
      ]);
      expect(appel.orderBy[0]).toEqual({ statutCommercial: 'asc' });
      // Chaque bien a la projection qui lui convient : complet, ou réduit.
      expect(items[0]).toMatchObject({
        statutCommercial: 'Disponible',
        prixPublic: 120_000_000,
      });
      expect(items[1]).toMatchObject({
        statutCommercial: 'Vendu',
        prixPublic: null,
      });
    });

    it('« tous » n’inclut pas les références vendues quand le visiteur filtre sur le prix', async () => {
      prismaMock.terrain.findMany.mockResolvedValue([]);
      prismaMock.terrain.count.mockResolvedValue(0);

      await publicCatalog.findPublic({
        ...requete,
        statut: 'tous',
        prixPublicMax: 30_000_000,
      });

      const appel = prismaMock.terrain.findMany.mock.calls[0][0];
      expect(appel.where.statutCommercial).toBe('Disponible');
      expect(appel.where.OR).toBeUndefined();
    });

    it('la recherche libre s’applique aux deux séries à la fois', async () => {
      prismaMock.terrain.findMany.mockResolvedValue([]);
      prismaMock.terrain.count.mockResolvedValue(0);

      await publicCatalog.findPublic({
        ...requete,
        statut: 'tous',
        search: 'Saly',
      });

      const [dispo, vend] =
        prismaMock.terrain.findMany.mock.calls[0][0].where.OR;
      expect(dispo.OR).toBeDefined();
      expect(vend.OR).toBeDefined();
    });

    it('ne liste que les biens vendus que MTM a cochés, jamais ceux à vendre', async () => {
      prismaMock.terrain.findMany.mockResolvedValue([]);
      prismaMock.terrain.count.mockResolvedValue(0);

      await publicCatalog.findPublic({
        ...requete,
        prixPublicMin: 1000,
        prixPublicMax: 5000,
      });

      const appel = prismaMock.terrain.findMany.mock.calls[0][0];
      expect(appel.where.statutCommercial).toBe('Vendu');
      expect(appel.where.referenceVendue).toBe(true);
      // Le prix n'est pas public : on ne filtre pas dessus.
      expect(appel.where.prixPublic).toBeUndefined();
    });

    it('réduit la fiche : ni prix, ni position exacte, ni documents, mais la date de vente', async () => {
      prismaMock.terrain.findMany.mockResolvedValue([vendu()]);
      prismaMock.terrain.count.mockResolvedValue(1);

      const { items } = await publicCatalog.findPublic(requete);

      expect(items[0]).toMatchObject({
        statutCommercial: 'Vendu',
        venduLe: '2026-09-15T00:00:00.000Z',
        nom: 'Villa vendue à Saly',
        commune: 'Saly',
        prixPublic: null,
        latitude: null,
        longitude: null,
        localisationDetail: null,
        description: null,
        pointsInteret: null,
        misEnAvant: false,
        documents: [],
      });
      // Des photos seulement.
      expect(items[0].medias.map((media) => media.type)).toEqual(['photo']);
    });

    it('une vente sans dossier soldé n’invente pas de date', async () => {
      prismaMock.terrain.findMany.mockResolvedValue([vendu({ dossiers: [] })]);
      prismaMock.terrain.count.mockResolvedValue(1);
      const { items } = await publicCatalog.findPublic(requete);
      expect(items[0].venduLe).toBeNull();
    });

    it('la fiche d’un bien vendu coché est réduite ; celle d’un bien disponible reste complète', async () => {
      prismaMock.terrain.findFirst.mockResolvedValueOnce(vendu());
      const reduit = await publicCatalog.findPublicOne('t9');
      expect(reduit.statutCommercial).toBe('Vendu');
      expect(reduit.prixPublic).toBeNull();
      expect(prismaMock.terrain.findFirst.mock.calls[0][0].where).toEqual({
        id: 't9',
        OR: [
          { statutCommercial: 'Disponible' },
          { statutCommercial: 'Vendu', referenceVendue: true },
        ],
      });

      prismaMock.terrain.findFirst.mockResolvedValueOnce(
        vendu({ statutCommercial: 'Disponible', dossiers: [] }),
      );
      const complet = await publicCatalog.findPublicOne('t9');
      expect(complet.statutCommercial).toBe('Disponible');
      expect(complet.prixPublic).toBe(120_000_000);
      expect(complet.documents).toHaveLength(1);
    });

    it('un bien vendu non coché reste introuvable', async () => {
      prismaMock.terrain.findFirst.mockResolvedValue(null);
      await expect(publicCatalog.findPublicOne('t9')).rejects.toThrow(
        'Bien introuvable',
      );
    });

    it('annonce combien de références vendues le site peut proposer', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);
      prismaMock.terrain.findMany.mockResolvedValue([]);
      prismaMock.terrain.count.mockResolvedValue(3);
      const options = await publicCatalog.getPublicFilterOptions();
      expect(options.vendus).toBe(3);
      expect(prismaMock.terrain.count).toHaveBeenCalledWith({
        where: { statutCommercial: 'Vendu', referenceVendue: true },
      });
    });
  });
});
