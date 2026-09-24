import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';

describe('CautionService', () => {
  const gestionnaire = {
    id: 'u-loc',
    roles: ['responsable_gestion_locative'],
    permissions: ['locatif:modifier'],
  };
  const payeur = {
    ...gestionnaire,
    permissions: ['locatif:modifier', 'locatif:payer'],
  };

  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let caution: ReturnType<typeof createLocatifTestContext>['caution'];

  beforeEach(() => {
    ({ prismaMock, caution } = createLocatifTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
      statut: 'actif',
      cautionMontant: 150000,
    });
    prismaMock.bailLocatif.findUniqueOrThrow.mockResolvedValue({
      cautionMontant: 150000,
    });
    prismaMock.bailLocatif.update.mockResolvedValue({});
    prismaMock.mouvementCaution.create.mockResolvedValue({ id: 'mvt-1' });
    prismaMock.mouvementCaution.findMany.mockResolvedValue([]);
  });

  it('enregistre un versement et en déduit le statut « versée »', async () => {
    prismaMock.mouvementCaution.findMany
      .mockResolvedValueOnce([]) // état avant
      .mockResolvedValue([
        {
          type: 'versement',
          montant: 150000,
          date: new Date(),
          justification: null,
        },
      ]);

    const resultat = await caution.enregistrer(
      'bail-1',
      { type: 'versement', montant: 150000 },
      gestionnaire,
    );

    expect(prismaMock.mouvementCaution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'versement', montant: 150000 }),
      }),
    );
    expect(resultat.etat.statut).toBe('versee');
  });

  it('refuse un versement qui dépasse la caution prévue au bail', async () => {
    prismaMock.mouvementCaution.findMany.mockResolvedValue([
      { type: 'versement', montant: 150000 },
    ]);

    await expect(
      caution.enregistrer(
        'bail-1',
        { type: 'versement', montant: 50000 },
        gestionnaire,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('exige une justification pour une retenue (section 15)', async () => {
    await expect(
      caution.enregistrer(
        'bail-1',
        { type: 'retenue', montant: 20000 },
        gestionnaire,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse de retenir plus que la caution détenue', async () => {
    prismaMock.mouvementCaution.findMany.mockResolvedValue([
      { type: 'versement', montant: 100000 },
    ]);

    await expect(
      caution.enregistrer(
        'bail-1',
        {
          type: 'retenue',
          montant: 150000,
          justification: 'Dégâts constatés à la sortie',
        },
        gestionnaire,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('réserve le remboursement à la permission « payer » (section 24)', async () => {
    prismaMock.mouvementCaution.findMany.mockResolvedValue([
      { type: 'versement', montant: 150000 },
    ]);

    await expect(
      caution.enregistrer(
        'bail-1',
        { type: 'remboursement', montant: 150000 },
        gestionnaire,
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      caution.enregistrer(
        'bail-1',
        { type: 'remboursement', montant: 150000 },
        payeur,
      ),
    ).resolves.toBeDefined();
  });

  it('interdit un versement de caution sur un bail clôturé', async () => {
    prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
      statut: 'termine',
      cautionMontant: 150000,
    });

    await expect(
      caution.enregistrer(
        'bail-1',
        { type: 'versement', montant: 50000 },
        gestionnaire,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
