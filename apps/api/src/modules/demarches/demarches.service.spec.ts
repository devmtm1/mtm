import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createDemarchesTestContext } from './demarches.test-support';

describe('DemarchesService', () => {
  const responsable = {
    id: 'u-dem',
    roles: ['responsable_demarches'],
    permissions: [],
  };
  const commercial = { id: 'u-com', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createDemarchesTestContext>['prismaMock'];
  let missions: ReturnType<typeof createDemarchesTestContext>['missions'];

  beforeEach(() => {
    ({ prismaMock, missions } = createDemarchesTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  });

  it('attribue une référence lisible à la mission créée', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.missionVerification.count.mockResolvedValue(6);
    prismaMock.missionVerification.findUnique.mockResolvedValue(null);
    prismaMock.missionVerification.create.mockResolvedValue({ id: 'm1' });

    await missions.create(
      {
        prospectId: 'p1',
        typeVerification: 'verification_fonciere',
        localisation: 'Mbour, quartier Golf',
      },
      responsable,
    );

    const data = prismaMock.missionVerification.create.mock.calls[0][0].data;
    expect(data.referenceInterne).toBe(`V-${new Date().getFullYear()}-0007`);
    // Le demandeur devient responsable par défaut : une mission sans porteur
    // est une mission que personne ne fait.
    expect(data.responsableId).toBe('u-dem');
    expect(data.statut).toBe('demande');
  });

  it('refuse un type de vérification hors référentiel', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({ id: 'p1' });

    await expect(
      missions.create(
        { prospectId: 'p1', typeVerification: 'expertise_lunaire' },
        responsable,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.missionVerification.create).not.toHaveBeenCalled();
  });

  it('refuse à un collaborateur de confier une mission à quelqu’un d’autre', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({ id: 'p1' });

    await expect(
      missions.create(
        {
          prospectId: 'p1',
          typeVerification: 'verification_fonciere',
          responsableId: 'u-autre',
        },
        commercial,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('limite un collaborateur aux missions dont il est responsable', async () => {
    prismaMock.missionVerification.findMany.mockResolvedValue([]);
    prismaMock.missionVerification.count.mockResolvedValue(0);

    await missions.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      commercial,
    );

    const where =
      prismaMock.missionVerification.findMany.mock.calls[0][0].where;
    expect(where.responsableId).toBe('u-com');
  });

  it('donne au responsable des démarches la vue sur toutes les missions', async () => {
    prismaMock.missionVerification.findMany.mockResolvedValue([]);
    prismaMock.missionVerification.count.mockResolvedValue(0);

    await missions.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      responsable,
    );

    const where =
      prismaMock.missionVerification.findMany.mock.calls[0][0].where;
    expect(where.responsableId).toBeUndefined();
  });

  it('refuse de passer au rapport sans la moindre vérification', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'verification_physique',
      decision: null,
      conclusion: null,
      _count: { etapes: 0 },
    });

    await expect(
      missions.transition('m1', { statut: 'rapport' }, responsable),
    ).rejects.toThrow(/Aucune vérification enregistrée/);
  });

  it('refuse de clôturer une mission sans décision de MTM', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'rapport',
      decision: null,
      conclusion: null,
      _count: { etapes: 3 },
    });

    await expect(
      missions.transition('m1', { statut: 'cloturee' }, responsable),
    ).rejects.toThrow(/décision de MTM/);
  });

  it('exige un motif pour abandonner une mission, et le conserve', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'faisabilite',
      decision: null,
      conclusion: null,
      _count: { etapes: 1 },
    });
    prismaMock.missionVerification.update.mockResolvedValue({ id: 'm1' });

    await expect(
      missions.transition('m1', { statut: 'abandonnee' }, responsable),
    ).rejects.toThrow(/motif/);

    await missions.transition(
      'm1',
      {
        statut: 'abandonnee',
        justification: 'Client injoignable depuis un mois',
      },
      responsable,
    );
    expect(prismaMock.missionVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statut: 'abandonnee',
          conclusion: 'Client injoignable depuis un mois',
        }),
      }),
    );
  });

  it('cache une mission qui n’est pas dans le périmètre de l’utilisateur', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue(null);

    await expect(missions.findOne('m1', commercial)).rejects.toThrow(
      NotFoundException,
    );
  });
});
