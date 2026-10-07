import { createLocatifTestContext } from './locatif.test-support';

const responsable = {
  id: 'u-loc',
  roles: ['responsable_gestion_locative'],
  permissions: ['locatif:modifier'],
};

describe('Notifications de l’espace client — gestion locative', () => {
  let ctx: ReturnType<typeof createLocatifTestContext>;

  /** L'accès au bail passe d'abord, la recherche du compte à notifier ensuite. */
  const bailAccessibleEtCible = (cible: Record<string, unknown>) => {
    ctx.prismaMock.bailLocatif.findUnique
      .mockResolvedValueOnce({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'actif',
      })
      .mockResolvedValueOnce(cible);
    ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
  };

  beforeEach(() => {
    ctx = createLocatifTestContext();
    ctx.prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  });

  describe('signalements et demandes', () => {
    const avant = {
      id: 'inc-1',
      statut: 'signale',
      resolutionNotes: null,
      nature: 'incident',
    };

    it('prévient le locataire quand MTM répond à son signalement', async () => {
      bailAccessibleEtCible({ locataireId: 'loc-1' });
      ctx.prismaMock.incidentLocatif.findFirst.mockResolvedValue(avant);
      ctx.prismaMock.incidentLocatif.update.mockResolvedValue({ id: 'inc-1' });

      await ctx.incidents.update(
        'bail-1',
        'inc-1',
        { resolutionNotes: 'Le plombier passe demain matin.' },
        responsable,
      );

      expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
        { locataireId: 'loc-1' },
        expect.objectContaining({
          type: 'incident_maj',
          titre: 'MTM a répondu à votre signalement',
          message: 'Le plombier passe demain matin.',
          lien: '/espace-client/ma-location',
        }),
      );
    });

    it('prévient aussi quand le statut change, en parlant de « demande » pour une demande', async () => {
      bailAccessibleEtCible({ locataireId: 'loc-1' });
      ctx.prismaMock.incidentLocatif.findFirst.mockResolvedValue({
        ...avant,
        nature: 'demande',
      });
      ctx.prismaMock.incidentLocatif.update.mockResolvedValue({ id: 'inc-1' });

      await ctx.incidents.update(
        'bail-1',
        'inc-1',
        { statut: 'resolu' },
        responsable,
      );

      expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
        { locataireId: 'loc-1' },
        expect.objectContaining({ titre: 'Votre demande est résolue' }),
      );
    });

    it('ne prévient pas quand rien ne change', async () => {
      ctx.prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'actif',
      });
      ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      ctx.prismaMock.incidentLocatif.findFirst.mockResolvedValue({
        ...avant,
        resolutionNotes: 'Déjà répondu',
      });
      ctx.prismaMock.incidentLocatif.update.mockResolvedValue({ id: 'inc-1' });

      await ctx.incidents.update(
        'bail-1',
        'inc-1',
        { statut: 'signale', resolutionNotes: 'Déjà répondu' },
        responsable,
      );

      expect(ctx.notificationsMock.notifierClient).not.toHaveBeenCalled();
    });
  });

  describe('documents', () => {
    const document = {
      id: 'doc-1',
      type: 'contrat',
      title: 'Contrat de bail',
      visibleLocataire: false,
      visibleProprietaire: false,
    };

    it('prévient le locataire quand un document lui est rendu visible', async () => {
      bailAccessibleEtCible({
        locataireId: 'loc-1',
        bienLocatif: { proprietaireId: 'prop-1' },
      });
      ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue(document);
      ctx.prismaMock.documentLocatif.update.mockResolvedValue({ id: 'doc-1' });

      await ctx.documents.setVisibility(
        'bail-1',
        'doc-1',
        { visibleLocataire: true },
        responsable,
      );

      expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledTimes(1);
      expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
        { locataireId: 'loc-1' },
        expect.objectContaining({
          type: 'document_disponible',
          message: 'Contrat de bail',
          dedupeKey: 'document-visible:doc-1:locataire',
        }),
      );
    });

    it('prévient le propriétaire quand le document lui est destiné', async () => {
      bailAccessibleEtCible({
        locataireId: 'loc-1',
        bienLocatif: { proprietaireId: 'prop-1' },
      });
      ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue(document);
      ctx.prismaMock.documentLocatif.update.mockResolvedValue({ id: 'doc-1' });

      await ctx.documents.setVisibility(
        'bail-1',
        'doc-1',
        { visibleProprietaire: true },
        responsable,
      );

      expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
        { proprietaireId: 'prop-1' },
        expect.objectContaining({ lien: '/espace-client/mon-bien' }),
      );
    });

    it('ne prévient pas quand le document est retiré ou l’était déjà', async () => {
      ctx.prismaMock.bailLocatif.findUnique.mockResolvedValue({
        id: 'bail-1',
        bienLocatifId: 'bien-1',
        statut: 'actif',
      });
      ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
      ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue({
        ...document,
        visibleLocataire: true,
      });
      ctx.prismaMock.documentLocatif.update.mockResolvedValue({ id: 'doc-1' });

      await ctx.documents.setVisibility(
        'bail-1',
        'doc-1',
        { visibleLocataire: true },
        responsable,
      );
      await ctx.documents.setVisibility(
        'bail-1',
        'doc-1',
        { visibleLocataire: false },
        responsable,
      );

      expect(ctx.notificationsMock.notifierClient).not.toHaveBeenCalled();
    });
  });
});
