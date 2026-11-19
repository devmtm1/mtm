import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProtocolesService } from './protocoles.service';

const direction = {
  id: 'dir-1',
  roles: ['direction'],
  permissions: [
    'protocoles:consulter',
    'protocoles:modifier',
    'protocoles:valider',
  ],
};
const secretaire = {
  id: 'sec-1',
  roles: ['secretaire'],
  permissions: [
    'protocoles:consulter',
    'protocoles:creer',
    'protocoles:modifier',
  ],
};

function montage() {
  const prisma = {
    dossierVente: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    protocoleDossier: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    protocoleHistorique: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    Promise.resolve(fn(prisma)),
  );
  const documents = { addDocument: jest.fn() };
  const cloudinary = {
    url: jest.fn().mockReturnValue('https://exemple.test/doc.pdf'),
  };
  const audit = { record: jest.fn() };
  const notifications = { notifierPermission: jest.fn().mockResolvedValue(1) };
  const settings = {
    getPositiveNumber: jest.fn().mockResolvedValue(7),
    getRawValue: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ProtocolesService(
    prisma as never,
    documents as never,
    cloudinary as never,
    audit as never,
    notifications as never,
    settings as never,
  );
  return { service, prisma, documents, audit, notifications, settings };
}

const dossierResume = {
  id: 'dv-1',
  referenceInterne: 'VTE-0001',
  statut: 'reserve',
  prixVente: 10_000_000,
  createdAt: new Date(),
  commercialResponsable: null,
  prospect: { nom: 'Diop', prenom: 'Awa', telephone: '771234567', email: null },
  terrain: { nom: 'Terrain Saly', referenceInterne: 'T-1' },
  paiements: [
    { montant: 2_000_000, statut: 'valide', datePaiement: new Date() },
  ],
};

function protocoleEnBase(surcharge: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    dossierVenteId: 'dv-1',
    type: 'protocole_accord',
    titre: null,
    statut: 'a_preparer',
    documentPrepareId: null,
    documentSigneId: null,
    documentPrepare: null,
    documentSigne: null,
    dateEnvoi: null,
    moyenEnvoi: null,
    dateReceptionSignee: null,
    dateSignatureMtm: null,
    motif: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    dossierVente: dossierResume,
    ...surcharge,
  };
}

describe('ProtocolesService', () => {
  describe('créer', () => {
    it('crée un protocole « à préparer » et son premier historique', async () => {
      const { service, prisma, audit } = montage();
      prisma.dossierVente.findUnique.mockResolvedValue({
        id: 'dv-1',
        statut: 'reserve',
        referenceInterne: 'VTE-0001',
      });
      prisma.protocoleDossier.create.mockResolvedValue({ id: 'p-1' });
      prisma.protocoleDossier.findUnique.mockResolvedValue(protocoleEnBase());
      const protocole = await service.creer(
        { dossierVenteId: 'dv-1' },
        secretaire,
      );
      expect(prisma.protocoleDossier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dossierVenteId: 'dv-1',
          createdById: 'sec-1',
        }),
      });
      expect(prisma.protocoleHistorique.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          versStatut: 'a_preparer',
          userId: 'sec-1',
        }),
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'protocole.created' }),
      );
      expect(protocole.statut).toBe('a_preparer');
      expect(protocole.dossier.soldeRestant).toBe(8_000_000);
    });

    it('refuse un dossier introuvable ou annulé', async () => {
      const { service, prisma } = montage();
      prisma.dossierVente.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.creer({ dossierVenteId: 'x' }, secretaire),
      ).rejects.toBeInstanceOf(NotFoundException);
      prisma.dossierVente.findUnique.mockResolvedValueOnce({
        id: 'dv-1',
        statut: 'annule',
        referenceInterne: null,
      });
      await expect(
        service.creer({ dossierVenteId: 'dv-1' }, secretaire),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('changerStatut', () => {
    it('refuse « signé par le client » sans copie signée, même sur un protocole envoyé', async () => {
      const { service, prisma } = montage();
      prisma.protocoleDossier.findUnique.mockResolvedValue({
        ...protocoleEnBase({
          statut: 'envoye',
          dateEnvoi: new Date(),
          moyenEnvoi: 'email',
          documentPrepareId: 'd1',
        }),
      });
      await expect(
        service.changerStatut(
          'p-1',
          { statut: 'signe_client', dateReceptionSignee: new Date() },
          secretaire,
        ),
      ).rejects.toThrow(/copie signée/);
      expect(prisma.protocoleDossier.updateMany).not.toHaveBeenCalled();
    });

    it('accepte « signé par le client » avec la copie et la date, historise et prévient la Direction', async () => {
      const { service, prisma, notifications, audit } = montage();
      const enBase = protocoleEnBase({
        statut: 'envoye',
        dateEnvoi: new Date(),
        moyenEnvoi: 'email',
        documentPrepareId: 'd1',
        documentSigneId: 'd2',
      });
      prisma.protocoleDossier.findUnique.mockResolvedValue(enBase);
      await service.changerStatut(
        'p-1',
        { statut: 'signe_client', dateReceptionSignee: new Date('2026-11-18') },
        secretaire,
      );
      expect(prisma.protocoleDossier.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1', statut: 'envoye' },
          data: expect.objectContaining({ statut: 'signe_client' }),
        }),
      );
      expect(prisma.protocoleHistorique.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deStatut: 'envoye',
          versStatut: 'signe_client',
          userId: 'sec-1',
        }),
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'protocole.status_changed' }),
      );
      expect(notifications.notifierPermission).toHaveBeenCalledWith(
        'protocoles:valider',
        expect.objectContaining({ type: 'protocole_statut' }),
        'sec-1',
      );
    });

    it('la secrétaire ne peut pas valider, la Direction oui', async () => {
      const { service, prisma } = montage();
      prisma.protocoleDossier.findUnique.mockResolvedValue(
        protocoleEnBase({
          statut: 'a_valider_direction',
          documentSigneId: 'd2',
          dateReceptionSignee: new Date(),
        }),
      );
      await expect(
        service.changerStatut('p-1', { statut: 'valide' }, secretaire),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.changerStatut('p-1', { statut: 'valide' }, direction),
      ).resolves.toBeDefined();
    });

    it('signale un conflit quand quelqu’un d’autre a déjà fait avancer le protocole', async () => {
      const { service, prisma } = montage();
      prisma.protocoleDossier.findUnique.mockResolvedValue(
        protocoleEnBase({ statut: 'a_preparer', documentPrepareId: 'd1' }),
      );
      prisma.protocoleDossier.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.changerStatut(
          'p-1',
          { statut: 'prepare_a_verifier' },
          secretaire,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.protocoleHistorique.create).not.toHaveBeenCalled();
    });
  });

  describe('deposerDocument', () => {
    it('range la copie signée dans le dossier de vente et la rattache au protocole', async () => {
      const { service, prisma, documents } = montage();
      prisma.protocoleDossier.findUnique
        .mockResolvedValueOnce({
          id: 'p-1',
          dossierVenteId: 'dv-1',
          statut: 'envoye',
        })
        .mockResolvedValueOnce(
          protocoleEnBase({ statut: 'envoye', documentSigneId: 'doc-9' }),
        );
      documents.addDocument.mockResolvedValue({ id: 'doc-9' });
      await service.deposerDocument(
        'p-1',
        { role: 'signe' },
        { originalname: 'signe.pdf' } as Express.Multer.File,
        secretaire,
      );
      expect(documents.addDocument).toHaveBeenCalledWith(
        'dv-1',
        expect.objectContaining({ type: 'protocole_signe' }),
        expect.anything(),
        secretaire,
        false,
      );
      expect(prisma.protocoleDossier.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { documentSigneId: 'doc-9' },
      });
    });

    it('refuse un dépôt sur un protocole clos', async () => {
      const { service, prisma } = montage();
      prisma.protocoleDossier.findUnique.mockResolvedValue({
        id: 'p-1',
        dossierVenteId: 'dv-1',
        statut: 'valide',
      });
      await expect(
        service.deposerDocument(
          'p-1',
          { role: 'prepare' },
          {} as Express.Multer.File,
          secretaire,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('alertes et tableau', () => {
    it('cherche les dossiers où un paiement est enregistré sans aucun protocole signé', async () => {
      const { service, prisma } = montage();
      prisma.dossierVente.findMany.mockResolvedValue([
        { ...dossierResume, protocoles: [{ statut: 'envoye' }] },
      ]);
      const alertes = await service.alertes();
      const where = prisma.dossierVente.findMany.mock.calls[0][0].where;
      expect(where.paiements).toEqual({
        some: { statut: { in: ['valide', 'en_attente'] } },
      });
      expect(where.protocoles).toEqual({
        none: {
          statut: {
            in: ['signe_client', 'signe_mtm', 'a_valider_direction', 'valide'],
          },
        },
      });
      expect(where.statut).toEqual({ not: 'annule' });
      expect(alertes[0]).toMatchObject({
        reference: 'VTE-0001',
        montantEncaisse: 2_000_000,
        soldeRestant: 8_000_000,
        protocoleActuel: 'Envoyé au client',
      });
    });

    it('un dossier sans aucun protocole est signalé « Aucun protocole »', async () => {
      const { service, prisma } = montage();
      prisma.dossierVente.findMany.mockResolvedValue([
        { ...dossierResume, protocoles: [] },
      ]);
      expect((await service.alertes())[0].protocoleActuel).toBe(
        'Aucun protocole',
      );
    });

    it('le tableau de bord regroupe les statuts en indicateurs', async () => {
      const { service, prisma } = montage();
      prisma.protocoleDossier.groupBy.mockResolvedValue([
        { statut: 'a_preparer', _count: { _all: 2 } },
        { statut: 'envoye', _count: { _all: 3 } },
        { statut: 'en_attente_signature', _count: { _all: 1 } },
        { statut: 'signe_client', _count: { _all: 4 } },
        { statut: 'a_valider_direction', _count: { _all: 2 } },
      ]);
      const tableau = await service.tableau();
      expect(tableau.protocoles).toMatchObject({
        aPreparer: 2,
        envoyes: 3,
        enAttenteSignature: 4,
        signesClient: 6,
        aValider: 2,
      });
      expect(tableau.delaiRappelJours).toBe(7);
    });

    it('sans réglage, tous les dossiers sont suivis ; avec « suivi depuis », seuls les dossiers récents comptent', async () => {
      const { service, prisma, settings } = montage();
      prisma.dossierVente.findMany.mockResolvedValue([]);
      prisma.dossierVente.count.mockResolvedValue(0);
      prisma.protocoleDossier.groupBy.mockResolvedValue([]);

      await service.alertes();
      expect(prisma.dossierVente.findMany.mock.calls[0][0].where.AND).toBe(
        undefined,
      );
      expect((await service.tableau()).suiviDepuis).toBeNull();

      settings.getRawValue.mockResolvedValue('2026-11-01');
      prisma.dossierVente.findMany.mockClear();
      await service.alertes();
      const where = prisma.dossierVente.findMany.mock.calls[0][0].where;
      expect(where.AND[1]).toEqual({
        createdAt: { gte: new Date('2026-11-01T00:00:00.000Z') },
      });
      // Le filtre garde l'essentiel : dossier non annulé, avec paiement, sans protocole signé.
      expect(where.AND[0].statut).toEqual({ not: 'annule' });
      expect((await service.tableau()).suiviDepuis).toBe('2026-11-01');
    });
  });
});
