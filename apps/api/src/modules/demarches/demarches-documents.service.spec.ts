import { BadRequestException } from '@nestjs/common';
import { createDemarchesTestContext } from './demarches.test-support';

describe('DemarchesDocumentsService — rapport de vérification', () => {
  const responsable = {
    id: 'u-dem',
    roles: ['responsable_demarches'],
    permissions: [],
  };

  let prismaMock: ReturnType<typeof createDemarchesTestContext>['prismaMock'];
  let documents: ReturnType<typeof createDemarchesTestContext>['documents'];

  const missionComplete = {
    id: 'm1',
    referenceInterne: 'V-2026-0001',
    typeVerification: 'verification_fonciere',
    objectif: 'Vérifier avant achat depuis la France',
    localisation: 'Mbour, quartier Golf',
    region: 'Thiès',
    commune: 'Mbour',
    latitude: 14.42,
    longitude: -16.96,
    piecesFournies: 'Copie du titre foncier',
    dateDemande: new Date('2026-09-01'),
    decision: 'favorable',
    conclusion: 'Le terrain correspond aux informations fournies.',
    reserves: null,
    recommandation: 'Achat possible sous réserve du bornage.',
    montantDevis: 150000,
    fraisEtude: 25000,
    montantPaye: 150000,
    faisabiliteConclusion: 'favorable',
    faisabiliteNotes: null,
    prospect: {
      nom: 'Diallo',
      prenom: 'Awa',
      email: 'awa@example.com',
      telephone: '+221771112233',
    },
    terrain: null,
    responsable: { firstName: 'Moussa', lastName: 'Fall' },
    etapes: [
      {
        type: 'verification_physique',
        titre: 'Visite du terrain',
        observations: 'Parcelle libre de toute occupation.',
        dateVisite: new Date('2026-09-10'),
        latitude: 14.42,
        longitude: -16.96,
        accesDescription: 'Piste latéritique praticable',
        environnement: 'Zone résidentielle en construction',
        conformiteApparente: 'conforme',
        administration: null,
        interlocuteur: null,
        resultat: null,
        realiseePar: { firstName: 'Moussa', lastName: 'Fall' },
        realiseeLe: new Date('2026-09-10'),
      },
      {
        type: 'verification_administrative',
        titre: 'Consultation du service des Domaines',
        observations: 'Titre confirmé, aucune opposition enregistrée.',
        dateVisite: null,
        latitude: null,
        longitude: null,
        accesDescription: null,
        environnement: null,
        conformiteApparente: null,
        administration: 'service_domaines',
        interlocuteur: 'M. Sarr',
        resultat: 'confirme',
        realiseePar: { firstName: 'Moussa', lastName: 'Fall' },
        realiseeLe: new Date('2026-09-12'),
      },
    ],
  };

  beforeEach(() => {
    ({ prismaMock, documents } = createDemarchesTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.contentBlock.findMany.mockResolvedValue([]);
  });

  it('génère un rapport PDF publié et daté', async () => {
    prismaMock.missionVerification.findUnique.mockResolvedValue(
      missionComplete,
    );
    prismaMock.documentMission.count.mockResolvedValue(0);
    prismaMock.documentMission.create.mockResolvedValue({
      id: 'd1',
      version: 1,
    });
    prismaMock.missionVerification.update.mockResolvedValue({ id: 'm1' });

    await documents.generateReport('m1', responsable);

    const data = prismaMock.documentMission.create.mock.calls[0][0].data;
    expect(data.type).toBe('rapport');
    expect(data.isGenerated).toBe(true);
    // Le rapport est le livrable du client : publié d'office.
    expect(data.isPublic).toBe(true);
    expect(data.version).toBe(1);
    // La mission passe à l'étape rapport et garde la date de remise.
    const miseAJour = prismaMock.missionVerification.update.mock.calls[0][0];
    expect(miseAJour.data.statut).toBe('rapport');
    expect(miseAJour.data.dateRapport).toBeInstanceOf(Date);
  });

  it('produit un PDF exploitable, avec la décision en clair', async () => {
    prismaMock.missionVerification.findUnique.mockResolvedValue(
      missionComplete,
    );
    prismaMock.documentMission.count.mockResolvedValue(0);
    prismaMock.documentMission.create.mockResolvedValue({ id: 'd1' });
    prismaMock.missionVerification.update.mockResolvedValue({ id: 'm1' });

    await documents.generateReport('m1', responsable);

    const envoi = (
      documents as unknown as { cloudinary: { upload: jest.Mock } }
    ).cloudinary.upload.mock.calls[0][0] as { buffer: Buffer };
    const contenu = envoi.buffer.toString('latin1');
    expect(envoi.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(contenu).toContain('FAVORABLE');
  });

  it('refuse de générer un rapport sans décision', async () => {
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      ...missionComplete,
      decision: null,
    });

    await expect(documents.generateReport('m1', responsable)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuse de générer un rapport sans aucun constat', async () => {
    prismaMock.missionVerification.findUnique.mockResolvedValue({
      ...missionComplete,
      etapes: [],
    });

    await expect(documents.generateReport('m1', responsable)).rejects.toThrow(
      /sans constat/,
    );
  });
});

describe('DemarchesDocumentsService — pièces rattachées à un constat', () => {
  const responsable = {
    id: 'u-dem',
    roles: ['responsable_demarches'],
    permissions: [],
  };
  const photo = {
    originalname: 'terrain.jpg',
    mimetype: 'image/jpeg',
    size: 120_000,
    // En-tête JPEG : la validation des pièces vérifie la signature du fichier.
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  } as Express.Multer.File;

  let prismaMock: ReturnType<typeof createDemarchesTestContext>['prismaMock'];
  let documents: ReturnType<typeof createDemarchesTestContext>['documents'];

  beforeEach(() => {
    ({ prismaMock, documents } = createDemarchesTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.missionVerification.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.documentMission.create.mockResolvedValue({ id: 'd1' });
  });

  it('rattache la photo au constat de visite', async () => {
    prismaMock.etapeMission.findFirst.mockResolvedValue({ id: 'e1' });

    await documents.addDocument(
      'm1',
      { type: 'photo_visite', etapeId: 'e1' },
      photo,
      responsable,
    );

    // Le constat cherché doit appartenir à la mission, pas seulement exister.
    expect(prismaMock.etapeMission.findFirst.mock.calls[0][0].where).toEqual({
      id: 'e1',
      missionId: 'm1',
    });
    expect(
      prismaMock.documentMission.create.mock.calls[0][0].data.etapeId,
    ).toBe('e1');
  });

  it('refuse un constat qui appartient à une autre mission', async () => {
    prismaMock.etapeMission.findFirst.mockResolvedValue(null);

    await expect(
      documents.addDocument(
        'm1',
        { type: 'photo_visite', etapeId: 'e-ailleurs' },
        photo,
        responsable,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.documentMission.create).not.toHaveBeenCalled();
  });

  it('accepte une pièce du dossier sans constat', async () => {
    await documents.addDocument(
      'm1',
      { type: 'piece_fournie' },
      {
        originalname: 'titre.pdf',
        mimetype: 'application/pdf',
        size: 80_000,
        buffer: Buffer.from('%PDF-1.4'),
      } as Express.Multer.File,
      responsable,
    );

    expect(prismaMock.etapeMission.findFirst).not.toHaveBeenCalled();
    expect(
      prismaMock.documentMission.create.mock.calls[0][0].data.etapeId,
    ).toBeNull();
  });
});
