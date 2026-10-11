import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createDemarchesTestContext } from './demarches.test-support';

const user = {
  id: 'u-dem',
  roles: ['responsable_demarches'],
  permissions: ['demarches:valider'],
};

/** Le dossier réel : 250 000 F convenus, deux transferts Wave. */
const wave = [
  {
    datePaiement: new Date('2026-10-02T17:08:00Z'),
    montantEnvoye: 150000,
    frais: 1485,
    montantNet: 148515,
    mode: 'mobile_money',
    reference: 'T_EEYDM5J7P7OEM-S2T',
  },
  {
    datePaiement: new Date('2026-10-03T19:36:00Z'),
    montantEnvoye: 50000,
    frais: 500,
    montantNet: 49500,
    mode: 'mobile_money',
    reference: 'T_TLEMB7J7OH35ZGZX',
  },
];

describe('DemarchesDocumentsService — facture de mission', () => {
  let ctx: ReturnType<typeof createDemarchesTestContext>;
  const annee = new Date().getFullYear();

  const mission = {
    id: 'm1',
    referenceInterne: `MTM-VF-001/${annee}`,
    typeVerification: 'verification_fonciere',
    objectif: null,
    localisation: 'Bambilor, près de la VDN 3',
    commune: 'Bambilor',
    montantDevis: 250000,
    factureReference: null as string | null,
    factureEmiseLe: null as Date | null,
    prospect: {
      nom: 'Sow',
      prenom: 'Alassane',
      email: null,
      telephone: '77 276 67 98',
      dateNaissance: new Date('1974-11-03'),
      lieuNaissance: 'Pikine',
    },
    responsable: null,
    paiements: wave,
  };

  const pdfEnvoye = (): string =>
    (
      (ctx.documents as unknown as { cloudinary: { upload: jest.Mock } })
        .cloudinary.upload.mock.calls[0][0] as { buffer: Buffer }
    ).buffer.toString('latin1');

  beforeEach(() => {
    ctx = createDemarchesTestContext();
    ctx.prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    ctx.prismaMock.missionVerification.findFirst.mockImplementation(
      ({ where }: { where: { id?: string } }) =>
        Promise.resolve(where.id === 'm1' ? { id: 'm1' } : null),
    );
    ctx.prismaMock.missionVerification.findMany.mockResolvedValue([]);
    ctx.prismaMock.missionVerification.update.mockResolvedValue({ id: 'm1' });
    ctx.prismaMock.contentBlock.findMany.mockResolvedValue([]);
    ctx.prismaMock.documentMission.count.mockResolvedValue(0);
    ctx.prismaMock.documentMission.create.mockResolvedValue({
      id: 'd1',
      version: 1,
    });
  });

  it('attribue le numéro MTM-FAC-VF-001/année et le retient sur la mission', async () => {
    ctx.prismaMock.missionVerification.findUnique.mockResolvedValue(mission);

    await ctx.documents.generateFacture('m1', user);

    const maj = ctx.prismaMock.missionVerification.update.mock.calls[0][0];
    expect(maj.data.factureReference).toBe(`MTM-FAC-VF-001/${annee}`);
    expect(maj.data.factureEmiseLe).toBeInstanceOf(Date);
    const document =
      ctx.prismaMock.documentMission.create.mock.calls[0][0].data;
    expect(document).toMatchObject({
      type: 'facture',
      isGenerated: true,
      // Une facture ne part chez le client que publiée volontairement.
      isPublic: false,
    });
  });

  it('montre le solde, les frais et les identifiants de transaction', async () => {
    ctx.prismaMock.missionVerification.findUnique.mockResolvedValue(mission);

    await ctx.documents.generateFacture('m1', user);

    const contenu = pdfEnvoye();
    expect(contenu.startsWith('%PDF')).toBe(true);
    expect(contenu).toContain('PARTIELLEMENT R');
    expect(contenu).toContain('SOLDE 50 000 FCFA');
    expect(contenu).toContain('200 000 FCFA');
    expect(contenu).toContain('1 985 FCFA');
    expect(contenu).toContain('T_EEYDM5J7P7OEM-S2T');
    expect(contenu).toContain('T_TLEMB7J7OH35ZGZX');
  });

  it('conserve le numéro et la date en régénérant la facture', async () => {
    const emise = new Date('2026-10-03T10:00:00Z');
    ctx.prismaMock.missionVerification.findUnique.mockResolvedValue({
      ...mission,
      factureReference: `MTM-FAC-VF-001/${annee}`,
      factureEmiseLe: emise,
    });
    ctx.prismaMock.documentMission.count.mockResolvedValue(1);

    await ctx.documents.generateFacture('m1', user);

    // Aucune mise à jour du numéro : il est déjà acquis.
    expect(ctx.prismaMock.missionVerification.update).not.toHaveBeenCalled();
    expect(
      ctx.prismaMock.documentMission.create.mock.calls[0][0].data.version,
    ).toBe(2);
    expect(pdfEnvoye()).toContain(`MTM-FAC-VF-001/${annee}`);
  });

  it('refuse une facture sans prix convenu', async () => {
    ctx.prismaMock.missionVerification.findUnique.mockResolvedValue({
      ...mission,
      montantDevis: null,
    });

    await expect(ctx.documents.generateFacture('m1', user)).rejects.toThrow(
      BadRequestException,
    );
    expect(ctx.cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it('ne grille pas de numéro quand l’archivage échoue', async () => {
    ctx.prismaMock.missionVerification.findUnique.mockResolvedValue(mission);
    ctx.cloudinaryMock.upload.mockRejectedValueOnce(new Error('503'));

    await expect(ctx.documents.generateFacture('m1', user)).rejects.toThrow();
    expect(ctx.prismaMock.missionVerification.update).not.toHaveBeenCalled();
  });
});

describe('DemarchesPaiementsService', () => {
  let ctx: ReturnType<typeof createDemarchesTestContext>;

  beforeEach(() => {
    ctx = createDemarchesTestContext();
    ctx.prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    ctx.prismaMock.missionVerification.findFirst.mockResolvedValue({
      id: 'm1',
    });
    ctx.prismaMock.paiementMission.findFirst.mockResolvedValue(null);
    ctx.prismaMock.paiementMission.create.mockResolvedValue({
      id: 'p1',
      montantEnvoye: 150000,
    });
    ctx.prismaMock.paiementMission.aggregate.mockResolvedValue({
      _sum: { montantEnvoye: 150000 },
      _count: 1,
    });
    ctx.prismaMock.missionVerification.findUnique.mockResolvedValue({
      prospectId: 'pr1',
      referenceInterne: 'MTM-VF-001/2026',
      montantDevis: 250000,
      visibleClient: true,
      paiements: [{ montantEnvoye: 150000, frais: 1485, montantNet: 148515 }],
    });
  });

  it('enregistre le règlement, en déduit le net et recalcule le total réglé', async () => {
    await ctx.paiements.create(
      'm1',
      {
        montantEnvoye: 150000,
        frais: 1485,
        mode: 'mobile_money',
        reference: ' T_EEYDM5J7P7OEM-S2T ',
      },
      user,
    );

    const data = ctx.prismaMock.paiementMission.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      missionId: 'm1',
      montantEnvoye: 150000,
      frais: 1485,
      montantNet: 148515,
      reference: 'T_EEYDM5J7P7OEM-S2T',
    });
    expect(
      ctx.prismaMock.missionVerification.update.mock.calls[0][0].data
        .montantPaye,
    ).toBe(150000);
  });

  it('prévient le client et lui dit ce qu’il reste à payer', async () => {
    await ctx.paiements.create(
      'm1',
      { montantEnvoye: 150000, mode: 'mobile_money' },
      user,
    );

    const [cible, notification] = ctx.notificationsMock.notifierClient.mock
      .calls[0] as [{ prospectId: string }, { message: string; lien: string }];
    expect(cible).toEqual({ prospectId: 'pr1' });
    expect(notification.message).toContain('Reste à régler');
    expect(notification.message).toContain('100');
    expect(notification.lien).toBe('/espace-client/verifications');
  });

  it('refuse des frais supérieurs au montant envoyé', async () => {
    await expect(
      ctx.paiements.create(
        'm1',
        { montantEnvoye: 1000, frais: 2000, mode: 'mobile_money' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.prismaMock.paiementMission.create).not.toHaveBeenCalled();
  });

  it('refuse deux fois le même identifiant de transaction', async () => {
    ctx.prismaMock.paiementMission.findFirst.mockResolvedValue({ id: 'p0' });

    await expect(
      ctx.paiements.create(
        'm1',
        {
          montantEnvoye: 50000,
          mode: 'mobile_money',
          reference: 'T_EEYDM5J7P7OEM-S2T',
        },
        user,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse un mode de paiement hors référentiel', async () => {
    await expect(
      ctx.paiements.create('m1', { montantEnvoye: 1000, mode: 'troc' }, user),
    ).rejects.toThrow(BadRequestException);
  });

  it('remet le total réglé à zéro quand le dernier règlement est supprimé', async () => {
    ctx.prismaMock.paiementMission.findFirst.mockResolvedValue({
      id: 'p1',
      montantEnvoye: 150000,
      reference: 'T',
    });
    ctx.prismaMock.paiementMission.aggregate.mockResolvedValue({
      _sum: { montantEnvoye: null },
      _count: 0,
    });

    await ctx.paiements.remove('m1', 'p1', user);

    expect(
      ctx.prismaMock.missionVerification.update.mock.calls[0][0].data
        .montantPaye,
    ).toBeNull();
  });

  it('signale un règlement inconnu', async () => {
    ctx.prismaMock.paiementMission.findFirst.mockResolvedValue(null);

    await expect(ctx.paiements.remove('m1', 'inconnu', user)).rejects.toThrow(
      NotFoundException,
    );
  });
});
