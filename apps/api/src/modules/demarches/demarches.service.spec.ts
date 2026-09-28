import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createDemarchesTestContext } from './demarches.test-support';

describe('DemarchesService', () => {
  it('refuse de publier une mission sans la permission dédiée', async () => {
    const { prismaMock, missions } = createDemarchesTestContext();
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });

    await expect(
      missions.update(
        'm1',
        { visibleClient: true },
        { id: 'u-com', roles: ['commercial'], permissions: [] },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  const responsable = {
    id: 'u-dem',
    roles: ['responsable_demarches'],
    permissions: ['demarches:valider'],
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
    prismaMock.missionVerification.create.mockResolvedValue({
      id: 'm1',
      documents: [],
    });

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
    prismaMock.missionVerification.update.mockResolvedValue({
      id: 'm1',
      documents: [],
    });

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

  it('refuse à un commercial sans demarches:valider de fixer la décision', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });

    await expect(
      missions.update('m1', { decision: 'favorable' }, commercial),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuse à un commercial sans demarches:valider de clôturer une mission', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });

    await expect(
      missions.transition('m1', { statut: 'cloturee' }, commercial),
    ).rejects.toThrow(ForbiddenException);
  });

  // --- Familles de prestation : un dépôt ne suit pas le parcours d'une
  // vérification, et réciproquement.

  it('refuse à un dépôt de bail une étape du parcours de vérification', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'demande',
      typeVerification: 'depot_bail',
      decision: null,
      conclusion: null,
      _count: { etapes: 0 },
    });

    await expect(
      missions.transition('m1', { statut: 'verification_physique' }, responsable),
    ).rejects.toThrow(/n’appartient pas au parcours/);
  });

  it('laisse un dépôt de bail avancer sur son propre parcours', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'constitution_dossier',
      typeVerification: 'depot_bail',
      decision: null,
      conclusion: null,
      _count: { etapes: 0 },
    });
    prismaMock.missionVerification.update.mockResolvedValue({
      id: 'm1',
      documents: [],
    });

    await missions.transition('m1', { statut: 'depot' }, responsable);

    expect(prismaMock.missionVerification.update.mock.calls[0][0].data.statut).toBe(
      'depot',
    );
  });

  it('clôture un dépôt sur sa conclusion, sans exiger de décision de conformité', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'retrait',
      typeVerification: 'depot_mutation',
      decision: null,
      conclusion: null,
      _count: { etapes: 2 },
    });

    // Sans conclusion, on ne sait pas ce que le client a obtenu.
    await expect(
      missions.transition('m1', { statut: 'cloturee' }, responsable),
    ).rejects.toThrow(/obtenu ou livré/);

    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'retrait',
      typeVerification: 'depot_mutation',
      decision: null,
      conclusion: 'Acte de mutation retiré et remis au client le 12/03',
      _count: { etapes: 2 },
    });
    prismaMock.missionVerification.update.mockResolvedValue({
      id: 'm1',
      documents: [],
    });

    await missions.transition('m1', { statut: 'cloturee' }, responsable);

    expect(prismaMock.missionVerification.update).toHaveBeenCalled();
  });

  it('refuse un plan de géomètre clôturé sans rien avoir livré', async () => {
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      statut: 'production',
      typeVerification: 'plan_geometre',
      decision: null,
      conclusion: '   ',
      _count: { etapes: 1 },
    });

    await expect(
      missions.transition('m1', { statut: 'cloturee' }, responsable),
    ).rejects.toThrow(/obtenu ou livré/);
  });
});
