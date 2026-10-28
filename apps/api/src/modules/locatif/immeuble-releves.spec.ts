import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompanyProfileService } from '../company/company-profile.service';
import { ImmeubleRelevesService } from './immeuble-releves.service';
import { createLocatifTestContext } from './locatif.test-support';

const utilisateur = {
  id: 'staff-1',
  roles: ['administrateur'],
  permissions: [],
} as never;

function montage() {
  const ctx = createLocatifTestContext();
  ctx.prismaMock.immeubleLocatif.findFirst.mockResolvedValue({ id: 'im-1' });
  // Profil de la société : aucun paramètre saisi, les valeurs par défaut s'appliquent.
  ctx.prismaMock.systemSetting.findMany.mockResolvedValue([]);
  ctx.prismaMock.contentBlock.findMany.mockResolvedValue([]);
  const service = new ImmeubleRelevesService(
    ctx.prismaMock as never,
    ctx.cloudinaryMock as never,
    ctx.access,
    ctx.notificationsMock as never,
    new CompanyProfileService(
      ctx.prismaMock as never,
      ctx.cloudinaryMock as never,
    ),
  );
  return { ctx, service };
}

const logement = (
  id: string,
  lot: string,
  loyer: number,
  superficie: number,
) => ({
  id,
  numeroLot: lot,
  referenceInterne: `L-${lot}`,
  superficie,
  loyerMensuel: loyer,
  baux: [
    {
      loyerMensuel: loyer,
      locataire: { firstName: 'Locataire', lastName: lot },
    },
  ],
});

const immeuble = (logements: ReturnType<typeof logement>[]) => ({
  id: 'im-1',
  nom: 'Villa Fall',
  type: 'villa',
  adresse: 'Sacré-Cœur 3',
  commune: 'Dakar',
  referenceInterne: 'IM-2026-0001',
  proprietaire: {
    id: 'pro-1',
    firstName: 'Cheikh',
    lastName: 'Mbaye',
    email: null,
  },
  logements,
});

describe('Charges communes d’une propriété', () => {
  it('enregistre une charge répartie en parts égales par défaut', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.chargeImmeuble.create.mockResolvedValue({
      id: 'c1',
      montant: '90000',
      repartition: 'egale',
    });

    const charge = await service.ajouterCharge(
      'im-1',
      { libelle: ' Gardien ', montant: 90000, dateCharge: '2026-10-01' },
      utilisateur,
    );

    expect(ctx.prismaMock.chargeImmeuble.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          libelle: 'Gardien',
          repartition: 'egale',
          immeubleId: 'im-1',
          createdById: 'staff-1',
        }),
      }),
    );
    expect(charge.montant).toBe(90000);
  });

  it('refuse une propriété hors du périmètre de l’utilisateur', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.immeubleLocatif.findFirst.mockResolvedValue(null);

    await expect(service.listerCharges('im-2', utilisateur)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('ne supprime pas la charge d’une autre propriété', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.chargeImmeuble.findFirst.mockResolvedValue(null);

    await expect(
      service.supprimerCharge('im-1', 'autre', utilisateur),
    ).rejects.toThrow(NotFoundException);
    expect(ctx.prismaMock.chargeImmeuble.delete).not.toHaveBeenCalled();
  });
});

describe('Relevé de gestion de la propriété', () => {
  it('totalise les loyers par logement, déduit les charges et publie le relevé au propriétaire', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.immeubleLocatif.findUnique.mockResolvedValue(
      immeuble([
        logement('b1', 'A1', 200000, 40),
        logement('b2', 'A2', 300000, 60),
      ]),
    );
    ctx.prismaMock.echeanceLoyer.findMany.mockResolvedValue([
      {
        montantPrevu: '200000',
        montantPaye: '200000',
        bailLocatif: { bienLocatifId: 'b1' },
      },
      {
        montantPrevu: '300000',
        montantPaye: '100000',
        bailLocatif: { bienLocatifId: 'b2' },
      },
    ]);
    ctx.prismaMock.chargeImmeuble.findMany.mockResolvedValue([
      {
        id: 'c1',
        libelle: 'Gardien',
        montant: '50000',
        dateCharge: new Date('2026-10-01T00:00:00Z'),
        repartition: 'surface',
      },
    ]);
    ctx.prismaMock.releveImmeuble.count.mockResolvedValue(0);
    ctx.prismaMock.releveImmeuble.create.mockImplementation(
      ({ data }: { data: object }) =>
        Promise.resolve({
          id: 'r1',
          storageKey: 'k',
          resourceType: 'raw',
          ...data,
        }),
    );

    const releve = await service.genererReleve(
      'im-1',
      { periodeDebut: '2026-10-01', periodeFin: '2026-10-01' },
      utilisateur,
    );

    expect(releve).toMatchObject({
      reference: expect.stringMatching(/^R-IM-2026-0001-202610-1$/),
      totalDu: 500000,
      totalEncaisse: 300000,
      totalCharges: 50000,
      net: 250000,
    });
    expect(ctx.cloudinaryMock.upload).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'application/pdf' }),
      'locatif/immeubles/im-1/releves',
      false,
    );
    expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
      { proprietaireId: 'pro-1' },
      expect.objectContaining({
        type: 'document_disponible',
        lien: '/espace-client/mon-bien',
      }),
    );
  });

  it('numérote les relevés d’un même mois pour que la référence reste unique', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.immeubleLocatif.findUnique.mockResolvedValue(
      immeuble([logement('b1', 'A1', 200000, 40)]),
    );
    ctx.prismaMock.echeanceLoyer.findMany.mockResolvedValue([]);
    ctx.prismaMock.chargeImmeuble.findMany.mockResolvedValue([]);
    ctx.prismaMock.releveImmeuble.count.mockResolvedValue(2);
    ctx.prismaMock.releveImmeuble.create.mockImplementation(
      ({ data }: { data: object }) =>
        Promise.resolve({
          id: 'r3',
          storageKey: 'k',
          resourceType: 'raw',
          ...data,
        }),
    );

    const releve = await service.genererReleve(
      'im-1',
      { periodeDebut: '2026-10-01', periodeFin: '2026-10-01' },
      utilisateur,
    );

    expect(releve.reference).toBe('R-IM-2026-0001-202610-3');
  });

  it('refuse une propriété sans logement', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.immeubleLocatif.findUnique.mockResolvedValue(immeuble([]));

    await expect(
      service.genererReleve('im-1', {}, utilisateur),
    ).rejects.toThrow(/aucun logement/);
  });

  it('refuse une période à l’envers', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.immeubleLocatif.findUnique.mockResolvedValue(
      immeuble([logement('b1', 'A1', 200000, 40)]),
    );

    await expect(
      service.genererReleve(
        'im-1',
        { periodeDebut: '2026-10-01', periodeFin: '2026-01-01' },
        utilisateur,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.cloudinaryMock.upload).not.toHaveBeenCalled();
  });
});
