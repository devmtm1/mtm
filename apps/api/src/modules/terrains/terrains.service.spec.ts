import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createTerrainsTestContext } from './terrains.test-support';

describe('TerrainsService', () => {
  const internalUser = { id: 'u-com', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createTerrainsTestContext>['prismaMock'];
  let service: ReturnType<typeof createTerrainsTestContext>['service'];

  beforeEach(() => {
    ({ prismaMock, service } = createTerrainsTestContext());
  });

  it('refuse une référence interne déjà utilisée', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          referenceInterne: 'T-001',
          nom: 'Terrain test',
          statutJuridique: 'Bail',
          niveauVerification: 'Non vérifié',
          statutCommercial: 'Brouillon',
        },
        internalUser,
      ),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('refuse un statut commercial absent du paramétrage', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          referenceInterne: 'T-001',
          nom: 'Terrain test',
          statutJuridique: 'Bail',
          niveauVerification: 'Non vérifié',
          statutCommercial: 'Statut inconnu',
        },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('propose au commercial tout le catalogue encore vendable, même les terrains dont il n’est pas responsable', async () => {
    prismaMock.terrain.findMany.mockResolvedValue([
      {
        id: 't1',
        referenceInterne: 'T-010',
        nom: 'Parcelle Mbour',
        commune: 'Mbour',
        region: 'Thiès',
        superficie: { toString: () => '300' },
        prixPublic: { toString: () => '12000000' },
        statutCommercial: 'Disponible',
      },
    ]);

    const items = await service.catalogueProposition('mbour');

    const where = prismaMock.terrain.findMany.mock.calls[0][0].where;
    expect(where.statutCommercial).toEqual({ not: 'Vendu' });
    expect(where.commercialResponsableId).toBeUndefined();
    expect(items).toEqual([
      expect.objectContaining({
        id: 't1',
        referenceInterne: 'T-010',
        superficie: 300,
        prixPublic: 12000000,
      }),
    ]);
  });

  it('laisse un commercial ouvrir la fiche d’un terrain qu’il ne gère pas, pour le proposer', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue({
      id: 't1',
      referenceInterne: 'T-010',
      commercialResponsableId: 'autre-commercial',
      prixAcquisition: 5000000,
      marge: 1000000,
    });

    const terrain = await service.findOne('t1', internalUser);

    expect(terrain.id).toBe('t1');
    // Le portefeuille n'est plus un filtre de lecture...
    expect(prismaMock.terrain.findUnique.mock.calls[0][0].where).toEqual({
      id: 't1',
    });
    // ...mais les données sensibles restent masquées.
    expect(terrain.prixAcquisition).toBeNull();
    expect(terrain.marge).toBeNull();
  });

  it('lève une erreur si le terrain à modifier est introuvable', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing', { nom: 'Nouveau nom' }, internalUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('rattache le terrain créé au commercial connecté', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.create.mockResolvedValue({
      id: 't1',
      referenceInterne: 'T-001',
      medias: [],
      documents: [],
      pointsInteret: [],
    });

    await service.create(
      {
        referenceInterne: 'T-001',
        nom: 'Terrain test',
        statutJuridique: 'Titre foncier',
        niveauVerification: 'Non vérifié',
        statutCommercial: 'Brouillon',
      },
      internalUser,
    );

    expect(prismaMock.terrain.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ commercialResponsableId: 'u-com' }),
      }),
    );
  });

  it('refuse à un commercial d’affecter un terrain à quelqu’un d’autre', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          referenceInterne: 'T-002',
          nom: 'Terrain test',
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Non vérifié',
          statutCommercial: 'Brouillon',
          commercialResponsableId: 'u-autre',
        },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // --- Champs sensibles : la justification suit un vrai changement ---

  it('laisse enregistrer sans justification quand le prix n’a pas bougé', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    // La fiche renvoie tout son formulaire : le prix d'acquisition repart
    // identique sans que personne n'y ait touché.
    prismaMock.terrain.findUnique.mockResolvedValue({
      prixAcquisition: 5_000_000,
      marge: null,
      commission: null,
      proprietaireId: null,
    });
    prismaMock.terrain.update.mockResolvedValue({ id: 't1', medias: [] });

    await service.update(
      't1',
      { nom: 'Nom corrigé', prixAcquisition: 5_000_000 },
      { id: 'u-dir', roles: ['direction'], permissions: [] },
    );

    expect(prismaMock.terrain.update).toHaveBeenCalled();
  });

  it('exige une justification dès que le prix change vraiment', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.findUnique.mockResolvedValue({
      prixAcquisition: 5_000_000,
      marge: null,
      commission: null,
      proprietaireId: null,
    });

    await expect(
      service.update(
        't1',
        { prixAcquisition: 6_000_000 },
        { id: 'u-dir', roles: ['direction'], permissions: [] },
      ),
    ).rejects.toThrow(/justification est obligatoire/);
  });

  it('accepte le changement de prix quand une justification est fournie', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.findUnique.mockResolvedValue({
      prixAcquisition: 5_000_000,
      marge: null,
      commission: null,
      proprietaireId: null,
    });
    prismaMock.terrain.update.mockResolvedValue({ id: 't1', medias: [] });

    await service.update(
      't1',
      { prixAcquisition: 6_000_000, justification: 'Réévaluation' },
      { id: 'u-dir', roles: ['direction'], permissions: [] },
    );

    // La justification sert au contrôle et à l'audit ; elle n'est pas une
    // colonne du terrain.
    const donnees = prismaMock.terrain.update.mock.calls[0][0].data;
    expect(donnees.prixAcquisition).toBe(6_000_000);
    expect(donnees).not.toHaveProperty('justification');
  });

  it('n’efface pas les montants quand l’auteur n’a pas accès au financier', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.findUnique.mockResolvedValue({
      prixAcquisition: 5_000_000,
      marge: 1_000_000,
      commission: 200_000,
      proprietaireId: null,
    });
    prismaMock.terrain.update.mockResolvedValue({ id: 't1', medias: [] });

    // La fiche lui a renvoyé des montants à `null` : son formulaire les
    // réexpédie tels quels, et ils effaceraient les vrais.
    await service.update(
      't1',
      {
        nom: 'Nom corrigé',
        prixAcquisition: null as unknown as number,
        marge: null as unknown as number,
        commission: null as unknown as number,
      },
      internalUser,
    );

    const data = prismaMock.terrain.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('prixAcquisition');
    expect(data).not.toHaveProperty('marge');
    expect(data).not.toHaveProperty('commission');
    expect(data.nom).toBe('Nom corrigé');
  });

  it('ne déduit pas une marge à partir d’un prix d’acquisition masqué', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.findUnique.mockResolvedValue({
      prixAcquisition: 5_000_000,
      marge: 1_000_000,
      commission: null,
      proprietaireId: null,
    });
    prismaMock.terrain.update.mockResolvedValue({ id: 't1', medias: [] });

    // Sans accès financier, le prix d'acquisition arrive à `null` : déduire
    // la marge de ce `null` la rendrait égale au prix public.
    await service.update(
      't1',
      {
        prixPublic: 8_000_000,
        prixAcquisition: null as unknown as number,
        marge: null as unknown as number,
      },
      internalUser,
    );

    const data = prismaMock.terrain.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('marge');
  });

  // --- Biens bâtis : MTM vend aussi des villas, pas que du foncier ---

  const ficheMinimale = {
    referenceInterne: 'V-001',
    nom: 'Villa Saly',
    statutJuridique: 'Titre foncier',
    niveauVerification: 'Vérifié',
    statutCommercial: 'Disponible',
  };

  it('refuse les caractéristiques du bâti sur un terrain nu', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    // Sans type explicite, la fiche est un terrain : « F3 » sur une parcelle
    // vide décrirait une maison qui n'existe pas.
    await expect(
      service.create(
        { ...ficheMinimale, nombrePieces: 'F3', surfaceHabitable: 120 },
        internalUser,
      ),
    ).rejects.toThrow(/ne s’appliquent pas à un bien de type/);
    expect(prismaMock.terrain.create).not.toHaveBeenCalled();
  });

  it('accepte les caractéristiques du bâti sur une villa', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.create.mockResolvedValue({ id: 'v1', medias: [] });

    await service.create(
      {
        ...ficheMinimale,
        typeBien: 'villa',
        superficie: 300,
        surfaceHabitable: 120,
        nombrePieces: 'F3',
        nombreChambres: 2,
      },
      internalUser,
    );

    const data = prismaMock.terrain.create.mock.calls[0][0].data;
    expect(data.typeBien).toBe('villa');
    // Les deux surfaces coexistent : la parcelle et l'habitable.
    expect(data.superficie).toBe(300);
    expect(data.surfaceHabitable).toBe(120);
  });

  it('refuse une vocation absente du référentiel', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    // La vocation était un champ libre : « Residentiel » et « residentiel »
    // cohabitaient en base et le filtre public les proposait séparément.
    await expect(
      service.create(
        { ...ficheMinimale, vocation: 'Residentiel' },
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse un type de bien absent du référentiel', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ ...ficheMinimale, typeBien: 'chateau' }, internalUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('confronte une surface habitable au type déjà enregistré', async () => {
    // La requête ne porte pas de type : il faut aller lire la fiche, sinon
    // on laisserait passer une surface habitable sur un terrain nu.
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.terrain.findUnique.mockResolvedValue({ typeBien: 'terrain' });

    await expect(
      service.update('t1', { surfaceHabitable: 90 }, internalUser),
    ).rejects.toThrow(/ne s’appliquent pas à un bien de type/);
  });

  describe('référence vendue', () => {
    const user = {
      roles: ['manager'],
      permissions: ['terrains:modifier', 'terrains:administrer'],
    };

    it('affiche un bien vendu sur le site, et le retire à la demande', async () => {
      prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
      prismaMock.terrain.findUnique.mockResolvedValue({
        statutCommercial: 'Vendu',
      });
      prismaMock.terrain.update.mockResolvedValue({
        id: 't1',
        referenceVendue: true,
      });

      await service.setReferenceVendue('t1', true, user);
      expect(prismaMock.terrain.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { referenceVendue: true } }),
      );

      await service.setReferenceVendue('t1', false, user);
      expect(prismaMock.terrain.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { referenceVendue: false } }),
      );
    });

    it('refuse d’afficher comme vendu un bien qui ne l’est pas', async () => {
      prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
      prismaMock.terrain.findUnique.mockResolvedValue({
        statutCommercial: 'Disponible',
      });
      await expect(
        service.setReferenceVendue('t1', true, user),
      ).rejects.toThrow(
        'Seul un bien vendu peut être affiché comme référence vendue',
      );
      expect(prismaMock.terrain.update).not.toHaveBeenCalled();
    });

    it('un bien qui quitte le statut « Vendu » cesse d’être une référence', async () => {
      prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
      prismaMock.terrain.update.mockResolvedValue({ id: 't1' });

      await service.updateStatus(
        't1',
        'statutCommercial',
        'Disponible',
        undefined,
        user,
      );

      expect(prismaMock.terrain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { statutCommercial: 'Disponible', referenceVendue: false },
        }),
      );
    });
  });
});
