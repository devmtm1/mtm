import { createCrmTestContext } from './crm.test-support';

describe('CrmReportingService', () => {
  let prismaMock: ReturnType<typeof createCrmTestContext>['prismaMock'];
  let reporting: ReturnType<typeof createCrmTestContext>['reporting'];

  beforeEach(() => {
    ({ prismaMock, reporting } = createCrmTestContext());
  });

  it('calcule les stats avec prochaines tâches', async () => {
    prismaMock.prospect.groupBy.mockResolvedValue([]);
    prismaMock.prospect.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0);
    prismaMock.activiteCrm.count.mockResolvedValue(3);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    const stats = await reporting.getStats({ id: 'u1', roles: ['commercial'] });

    expect(stats).toEqual({
      totalProspects: 10,
      nouveaux: 0,
      upcomingTasksCount: 3,
      pipeline: {},
    });
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
