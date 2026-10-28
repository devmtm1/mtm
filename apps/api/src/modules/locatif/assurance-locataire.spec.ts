import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';
import { LocatairePortalService } from './locataire-portal.service';

/** Un PDF minimal, assez pour passer le contrôle de signature des fichiers. */
const pdf = (): Express.Multer.File =>
  ({
    buffer: Buffer.from('%PDF-1.4\n%test'),
    mimetype: 'application/pdf',
    originalname: 'attestation.pdf',
    size: 14,
  }) as Express.Multer.File;

const demain = () =>
  new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const hier = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

function montage() {
  const ctx = createLocatifTestContext();
  const service = new LocatairePortalService(
    ctx.prismaMock as never,
    ctx.cloudinaryMock as never,
    ctx.incidents,
    ctx.notificationsMock as never,
  );
  return { ctx, service };
}

const bailActif = {
  id: 'bail-1',
  bienLocatif: { id: 'bien-1', referenceInterne: 'L-2026-0001' },
  locataire: { firstName: 'Aminata', lastName: 'Diallo' },
};

describe('Assurance du locataire — dépôt', () => {
  it('refuse un compte qui n’est pas rattaché à un locataire', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.user.findUnique.mockResolvedValue({
      clientLocataireId: null,
    });

    await expect(
      service.deposerAssurance('u1', pdf(), { dateExpiration: demain() }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('exige un bail en cours', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.user.findUnique.mockResolvedValue({
      clientLocataireId: 'loc-1',
    });
    ctx.prismaMock.bailLocatif.findFirst.mockResolvedValue(null);

    await expect(
      service.deposerAssurance('u1', pdf(), { dateExpiration: demain() }),
    ).rejects.toThrow(/bail en cours/);
  });

  it('refuse une attestation déjà expirée', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.user.findUnique.mockResolvedValue({
      clientLocataireId: 'loc-1',
    });
    ctx.prismaMock.bailLocatif.findFirst.mockResolvedValue(bailActif);

    await expect(
      service.deposerAssurance('u1', pdf(), { dateExpiration: hier() }),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it('refuse un fichier dont le contenu n’est pas celui annoncé', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.user.findUnique.mockResolvedValue({
      clientLocataireId: 'loc-1',
    });
    ctx.prismaMock.bailLocatif.findFirst.mockResolvedValue(bailActif);
    const faux = {
      ...pdf(),
      buffer: Buffer.from('pas un pdf'),
    } as Express.Multer.File;

    await expect(
      service.deposerAssurance('u1', faux, { dateExpiration: demain() }),
    ).rejects.toThrow(/contenu/);
  });

  it('enregistre l’attestation « en attente », invisible du propriétaire, et prévient l’équipe', async () => {
    const { ctx, service } = montage();
    ctx.prismaMock.user.findUnique.mockResolvedValue({
      clientLocataireId: 'loc-1',
    });
    ctx.prismaMock.bailLocatif.findFirst.mockResolvedValue(bailActif);
    ctx.prismaMock.documentLocatif.create.mockResolvedValue({
      id: 'doc-1',
      createdAt: new Date(),
      dateExpiration: new Date(demain()),
    });

    const etat = await service.deposerAssurance('u1', pdf(), {
      dateExpiration: demain(),
    });

    expect(ctx.prismaMock.documentLocatif.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'assurance_habitation',
          controleStatut: 'en_attente',
          deposeParLocataire: true,
          visibleLocataire: true,
          visibleProprietaire: false,
          bailLocatifId: 'bail-1',
        }),
      }),
    );
    expect(ctx.notificationsMock.notifierPermission).toHaveBeenCalledWith(
      'locatif:modifier',
      expect.objectContaining({
        type: 'assurance_a_controler',
        lien: '/locatif/biens/bien-1',
      }),
    );
    expect(etat).toMatchObject({ statut: 'en_attente', expiree: false });
  });
});

describe('Assurance du locataire — contrôle par MTM', () => {
  const doc = (extra = {}) => ({
    id: 'doc-1',
    title: 'Attestation',
    type: 'assurance_habitation',
    controleStatut: 'en_attente',
    bailLocatif: { locataireId: 'loc-1' },
    ...extra,
  });
  const utilisateur = {
    id: 'staff-1',
    roles: ['administrateur'],
    permissions: [],
  } as never;

  it('valide le document et prévient le locataire', async () => {
    const ctx = createLocatifTestContext();
    ctx.prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
    });
    ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue(doc());
    ctx.prismaMock.documentLocatif.update.mockResolvedValue({
      id: 'doc-1',
      storageKey: 'k',
      resourceType: 'raw',
      controleStatut: 'valide',
    });

    await ctx.documents.controlerDocument(
      'bail-1',
      'doc-1',
      { decision: 'valide' },
      utilisateur,
    );

    expect(ctx.prismaMock.documentLocatif.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          controleStatut: 'valide',
          motifRejet: null,
          controleParId: 'staff-1',
        }),
      }),
    );
    expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
      { locataireId: 'loc-1' },
      expect.objectContaining({
        type: 'assurance_controlee',
        titre: expect.stringContaining('validée'),
      }),
    );
  });

  it('exige un motif pour refuser', async () => {
    const ctx = createLocatifTestContext();
    ctx.prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
    });
    ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue(doc());

    await expect(
      ctx.documents.controlerDocument(
        'bail-1',
        'doc-1',
        { decision: 'rejete' },
        utilisateur,
      ),
    ).rejects.toThrow(/motif/);
    expect(ctx.prismaMock.documentLocatif.update).not.toHaveBeenCalled();
  });

  it('refuse avec un motif que le locataire pourra lire', async () => {
    const ctx = createLocatifTestContext();
    ctx.prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
    });
    ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue(doc());
    ctx.prismaMock.documentLocatif.update.mockResolvedValue({
      id: 'doc-1',
      storageKey: 'k',
      resourceType: 'raw',
    });

    await ctx.documents.controlerDocument(
      'bail-1',
      'doc-1',
      { decision: 'rejete', motif: 'Document illisible' },
      utilisateur,
    );

    expect(ctx.prismaMock.documentLocatif.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          controleStatut: 'rejete',
          motifRejet: 'Document illisible',
        }),
      }),
    );
    expect(ctx.notificationsMock.notifierClient).toHaveBeenCalledWith(
      { locataireId: 'loc-1' },
      expect.objectContaining({
        message: expect.stringContaining('Document illisible'),
      }),
    );
  });

  it('ne contrôle pas un document qui n’est pas soumis à contrôle', async () => {
    const ctx = createLocatifTestContext();
    ctx.prismaMock.bailLocatif.findUnique.mockResolvedValue({
      id: 'bail-1',
      bienLocatifId: 'bien-1',
    });
    ctx.prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
    ctx.prismaMock.documentLocatif.findFirst.mockResolvedValue(
      doc({ controleStatut: null, type: 'contrat' }),
    );

    await expect(
      ctx.documents.controlerDocument(
        'bail-1',
        'doc-1',
        { decision: 'valide' },
        utilisateur,
      ),
    ).rejects.toThrow(/pas soumis à contrôle/);
  });
});
