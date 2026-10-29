import { BadRequestException } from '@nestjs/common';
import { LocatairesService } from '../../modules/locatif/locataires.service';
import { ProprietairesService } from '../../modules/proprietaires/proprietaires.service';
import { exposerPiece, validerPiecePdf } from './piece-identite';

const pdf = {
  buffer: Buffer.from('%PDF-1.4 contenu'),
  mimetype: 'application/pdf',
  size: 16,
} as Express.Multer.File;

describe('pièce d’identité', () => {
  const cloudinary = {
    url: jest.fn(
      (cle: string, type: string) =>
        `https://api.test/files/private?key=${cle}&rt=${type}`,
    ),
    upload: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => jest.clearAllMocks());

  it('ne laisse jamais sortir la clé de stockage : seul un lien signé est rendu', () => {
    const fiche = exposerPiece(
      { id: 'p1', pieceStorageKey: 'dossier/cni', pieceResourceType: 'raw' },
      cloudinary as never,
    );

    expect(fiche).toEqual({
      id: 'p1',
      pieceUrl: 'https://api.test/files/private?key=dossier/cni&rt=raw',
    });
    expect(fiche).not.toHaveProperty('pieceStorageKey');
  });

  it('rend un lien vide quand aucune copie n’est déposée', () => {
    expect(
      exposerPiece({ id: 'p1', pieceStorageKey: null }, cloudinary as never),
    ).toEqual({ id: 'p1', pieceUrl: null });
  });

  it('refuse une copie qui n’est pas un PDF', () => {
    const image = { ...pdf, mimetype: 'image/png' } as Express.Multer.File;
    expect(() => validerPiecePdf(image)).toThrow(BadRequestException);
    expect(() => validerPiecePdf(undefined as never)).toThrow(
      BadRequestException,
    );
  });

  it('refuse un faux PDF dont le contenu ne commence pas par %PDF-', () => {
    const faux = {
      ...pdf,
      buffer: Buffer.from('MZ exécutable'),
    } as Express.Multer.File;
    expect(() => validerPiecePdf(faux)).toThrow(BadRequestException);
    expect(() => validerPiecePdf(pdf)).not.toThrow();
  });

  describe('propriétaire', () => {
    const prisma = {
      proprietaire: { findUnique: jest.fn(), update: jest.fn() },
    };
    const service = new ProprietairesService(
      prisma as never,
      {} as never,
      cloudinary as never,
    );

    it('remplace la copie et supprime l’ancienne du stockage', async () => {
      prisma.proprietaire.findUnique.mockResolvedValue({
        pieceStorageKey: 'ancienne',
        pieceResourceType: 'raw',
      });
      cloudinary.upload.mockResolvedValue({
        publicId: 'nouvelle',
        resourceType: 'raw',
      });
      prisma.proprietaire.update.mockResolvedValue({
        id: 'p1',
        pieceStorageKey: 'nouvelle',
        pieceResourceType: 'raw',
      });

      const fiche = await service.deposerPiece('p1', pdf);

      expect(cloudinary.upload).toHaveBeenCalledWith(
        pdf,
        'proprietaires/p1/piece-identite',
        false,
      );
      expect(cloudinary.destroy).toHaveBeenCalledWith('ancienne', 'raw', false);
      expect(fiche.pieceUrl).toContain('nouvelle');
    });

    it('n’envoie rien au stockage quand le fichier est refusé', async () => {
      prisma.proprietaire.findUnique.mockResolvedValue({
        pieceStorageKey: null,
      });

      await expect(
        service.deposerPiece('p1', {
          ...pdf,
          mimetype: 'image/png',
        } as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      expect(cloudinary.upload).not.toHaveBeenCalled();
    });

    it('un non-administrateur ne peut pas réécrire le type ni le numéro de pièce', async () => {
      prisma.proprietaire.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.proprietaire.update.mockResolvedValue({ id: 'p1' });

      await service.update(
        'p1',
        { notes: 'ok', typePiece: 'cni', numeroPiece: '123' },
        { roles: ['gestionnaire'] },
      );

      expect(prisma.proprietaire.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { notes: 'ok' },
      });
    });

    it('masque la pièce à qui n’est pas administrateur', async () => {
      prisma.proprietaire.findUnique.mockResolvedValue({
        id: 'p1',
        typePiece: 'cni',
        numeroPiece: '123',
        urgenceNom: 'Fatou',
        pieceValiditeLe: new Date('2030-01-01'),
        pieceStorageKey: 'cle',
        pieceResourceType: 'raw',
      });

      const vue = await service.findById('p1', { roles: ['gestionnaire'] });
      const admin = await service.findById('p1', { roles: ['administrateur'] });

      expect(vue).toMatchObject({
        typePiece: null,
        numeroPiece: null,
        urgenceNom: null,
        pieceValiditeLe: null,
        pieceUrl: null,
        coordonneesMasquees: true,
      });
      expect(admin).toMatchObject({ typePiece: 'cni', numeroPiece: '123' });
      expect(admin.pieceUrl).toContain('cle');
    });
  });

  describe('locataire', () => {
    const prisma = { locataire: { findUnique: jest.fn(), update: jest.fn() } };
    const service = new LocatairesService(
      prisma as never,
      {} as never,
      cloudinary as never,
    );

    it('retire la copie et la supprime du stockage', async () => {
      prisma.locataire.findUnique.mockResolvedValue({
        pieceStorageKey: 'cle',
        pieceResourceType: 'raw',
      });
      prisma.locataire.update.mockResolvedValue({
        id: 'l1',
        pieceStorageKey: null,
      });

      const fiche = await service.retirerPiece('l1');

      expect(prisma.locataire.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: { pieceStorageKey: null, pieceResourceType: null },
      });
      expect(cloudinary.destroy).toHaveBeenCalledWith('cle', 'raw', false);
      expect(fiche.pieceUrl).toBeNull();
    });
  });
});
