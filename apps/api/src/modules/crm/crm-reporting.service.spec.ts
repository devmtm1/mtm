import { createCrmTestContext } from './crm.test-support';

describe('CrmReportingService', () => {
  let prismaMock: ReturnType<typeof createCrmTestContext>['prismaMock'];
  let reporting: ReturnType<typeof createCrmTestContext>['reporting'];

  beforeEach(() => {
    ({ prismaMock, reporting } = createCrmTestContext());
  });

  it('calcule les indicateurs du parcours commercial', async () => {
    // 5 prospects vendus sur 8 parcours terminés → 63 % de conversion.
    prismaMock.prospect.groupBy.mockResolvedValue([
      { statutPipeline: 'vente', _count: { statutPipeline: 5 } },
      { statutPipeline: 'refuse', _count: { statutPipeline: 2 } },
      { statutPipeline: 'abandonne', _count: { statutPipeline: 1 } },
      { statutPipeline: 'negociation', _count: { statutPipeline: 4 } },
      { statutPipeline: 'en_reflexion', _count: { statutPipeline: 2 } },
      { statutPipeline: 'reservation', _count: { statutPipeline: 1 } },
    ]);
    // totalProspects, nouveaux, aContacter, relancesDuJour, relancesEnRetard, sansProchaineAction
    prismaMock.prospect.count
      .mockResolvedValueOnce(15)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    prismaMock.visiteProspect.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(2);
    prismaMock.activiteCrm.count.mockResolvedValue(3);
    prismaMock.dossierVente.aggregate.mockResolvedValue({
      _sum: { prixVente: 42000000 },
      _count: { _all: 5 },
    });
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    const stats = await reporting.getStats({ id: 'u1', roles: ['commercial'] });

    expect(stats).toEqual(
      expect.objectContaining({
        totalProspects: 15,
        nouveaux: 3,
        aContacter: 4,
        relancesDuJour: 6,
        relancesEnRetard: 2,
        sansProchaineAction: 1,
        visitesProgrammees: 7,
        visitesRealisees: 9,
        retoursASaisir: 2,
        enReflexion: 2,
        negociations: 4,
        reservations: 1,
        ventesConclues: 5,
        montantVentes: 42000000,
        tauxConversion: 63,
        upcomingTasksCount: 3,
        // Un commercial ne voit pas la performance de ses collègues.
        parCommercial: [],
      }),
    );
  });

  it('exporte les prospects du périmètre de l’utilisateur en traçant la demande', async () => {
    prismaMock.prospect.findMany.mockResolvedValue([
      {
        referenceInterne: 'P-2026-0001',
        nom: 'Diallo',
        prenom: 'Awa',
        telephone: '+221771112233',
        whatsapp: true,
        email: null,
        villeResidence: 'Dakar',
        sourceAcquisition: 'tiktok',
        niveauInteret: 'fort',
        statutPipeline: 'negociation',
        commercialResponsable: { firstName: 'Moussa', lastName: 'Fall' },
        zoneRecherchee: 'Mbour; Saly',
        budgetMax: 12000000,
        prochaineAction: 'Rappeler',
        prochaineRelanceLe: new Date('2026-09-23T00:00:00.000Z'),
        terrainChoisi: { referenceInterne: 'T-010' },
        prixNegocie: 10500000,
        motifSortie: null,
        createdAt: new Date('2026-09-18T00:00:00.000Z'),
        _count: { visites: 2 },
      },
    ]);

    const csv = await reporting.exportCsv(
      { id: 'u1', roles: ['commercial'] },
      'Reporting hebdomadaire',
    );

    // Périmètre : un commercial n'exporte que ses prospects.
    expect(prismaMock.prospect.findMany.mock.calls[0][0].where).toEqual({
      commercialResponsableId: 'u1',
    });
    const [entete, ligne] = csv.split('\n');
    expect(entete.startsWith('reference;nom;prenom')).toBe(true);
    // Le point-virgule de la zone recherchée ne doit pas casser les colonnes.
    expect(ligne).toContain('"Mbour; Saly"');
    expect(ligne).toContain('P-2026-0001');
    expect(ligne).toContain('oui');
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'prospect.exported',
          justification: 'Reporting hebdomadaire',
        }),
      }),
    );
  });

  it('retourne la timeline', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      nom: 'Dupont',
      commercialResponsableId: 'u1',
    });
    prismaMock.activiteCrm.findMany.mockResolvedValue([
      {
        id: 'a1',
        titre: 'Appel',
        statut: 'a_faire',
        dateEcheance: new Date(Date.now() + 86400000),
      },
    ]);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.dossierVente.findMany.mockResolvedValue([]);

    const timeline = await reporting.getTimeline('p1', {
      id: 'u1',
      roles: ['commercial'],
    });

    expect(timeline.prospect?.id).toBe('p1');
    expect(timeline.upcoming).toHaveLength(1);
    expect(timeline.overdue).toHaveLength(0);
  });
});
