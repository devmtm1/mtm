import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import {
  ProgrammesPublicService,
  syntheseLots,
} from './programmes-public.service';

function contexte() {
  const prismaMock = createPrismaMock();
  const cloudinary = {
    url: (cle: string) => `https://cdn.test/${cle}`,
  } as unknown as CloudinaryService;
  const service = new ProgrammesPublicService(
    prismaMock as unknown as PrismaService,
    cloudinary,
  );
  return { prismaMock, service };
}

const lot = (
  statut: string,
  prix: number | null,
  superficie: number | null = 250,
) => ({
  statutCommercial: statut,
  prixPublic: prix,
  superficie,
  uniteSuperficie: 'm²',
});

describe('syntheseLots', () => {
  it('compte les lots visibles et donne les fourchettes ; un brouillon ou un lot suspendu n’existe pas', () => {
    const s = syntheseLots([
      lot('Disponible', 10_000_000, 250),
      lot('Disponible', 12_000_000, 300),
      lot('Réservé', 11_000_000, 400),
      lot('Vendu', 9_000_000, 200),
      lot('Brouillon', 1_000_000, 100),
      lot('Suspendu', 2_000_000, 50),
    ]);
    expect(s).toMatchObject({
      lotsTotal: 4,
      lotsDisponibles: 2,
      lotsReserves: 1,
      lotsVendus: 1,
      // Le prix se lit sur ce qui reste à vendre...
      prixMin: 10_000_000,
      prixMax: 12_000_000,
      // ...la superficie décrit tout le lotissement.
      superficieMin: 200,
      superficieMax: 400,
      uniteSuperficie: 'm²',
    });
  });

  it('sans prix ni superficie renseignés, les fourchettes sont vides', () => {
    const s = syntheseLots([lot('Disponible', null, null)]);
    expect(s.prixMin).toBeNull();
    expect(s.superficieMax).toBeNull();
  });
});

describe('ProgrammesPublicService.findPublic', () => {
  it('ne liste que les programmes publiés qui ont un lot à vendre, et applique les filtres du catalogue aux lots libres', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findMany.mockResolvedValue([]);
    await service.findPublic({
      commune: 'Thiès',
      prixPublicMax: 11_000_000,
      superficieMin: 200,
      search: 'cité',
    });
    const { where } = prismaMock.programmeLotissement.findMany.mock.calls[0][0];
    expect(where).toMatchObject({
      publie: true,
      archiveLe: null,
      commune: { equals: 'Thiès' },
      lots: {
        some: {
          statutCommercial: 'Disponible',
          prixPublic: { lte: 11_000_000 },
          superficie: { gte: 200 },
        },
      },
    });
    expect(where.OR).toHaveLength(5);
  });

  it('résume chaque programme et prend la photo du programme, sinon celle d’un lot à vendre', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findMany.mockResolvedValue([
      { id: 'p1', nom: 'Avec photo' },
      { id: 'p2', nom: 'Photo d’un lot' },
      { id: 'p3', nom: 'Sans photo' },
    ]);
    prismaMock.terrain.findMany.mockResolvedValue([
      { programmeId: 'p1', ...lot('Disponible', 10_000_000) },
      { programmeId: 'p1', ...lot('Vendu', 9_000_000) },
      { programmeId: 'p2', ...lot('Disponible', 8_000_000) },
      { programmeId: 'p3', ...lot('Disponible', 7_000_000) },
    ]);
    prismaMock.programmeMedia.findMany.mockResolvedValue([
      { programmeId: 'p1', storageKey: 'couv-p1', resourceType: 'image' },
    ]);
    prismaMock.terrainMedia.findMany.mockResolvedValue([
      {
        storageKey: 'lot-p2',
        resourceType: 'image',
        terrain: { programmeId: 'p2' },
      },
    ]);
    const [p1, p2, p3] = await service.findPublic();
    expect(p1).toMatchObject({
      couverture: 'https://cdn.test/couv-p1',
      lotsDisponibles: 1,
      lotsVendus: 1,
      lotsTotal: 2,
    });
    expect(p2.couverture).toBe('https://cdn.test/lot-p2');
    expect(p3.couverture).toBeNull();
  });

  it('n’expose jamais rien d’interne', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findMany.mockResolvedValue([]);
    await service.findPublic();
    const { select } =
      prismaMock.programmeLotissement.findMany.mock.calls[0][0];
    for (const interne of [
      'proprietaireId',
      'commissionLot',
      'margeLot',
      'proprietaire',
      'produitDirect',
    ]) {
      expect(select).not.toHaveProperty(interne);
    }
  });
});

describe('ProgrammesPublicService.findPublicOne', () => {
  const programme = (lots: unknown[], medias: unknown[] = []) => ({
    id: 'p1',
    reference: 'P-2026-0001',
    nom: 'Cité',
    region: 'Dakar',
    commune: 'Thiès',
    localisationDetail: null,
    description: null,
    statutJuridique: 'Titre foncier',
    niveauVerification: 'Vérifié',
    medias,
    lots,
  });
  const l = (
    id: string,
    numero: string,
    statut: string,
    prix: number | null,
    extra = {},
  ) => ({
    id,
    numeroLot: numero,
    statutCommercial: statut,
    superficie: 250,
    uniteSuperficie: 'm²',
    prixPublic: prix,
    modalitePaiement: 'Échelonné',
    dureeMoratoireMois: 6,
    acompteMontant: 2_000_000,
    categorieLot: null,
    medias: [],
    ...extra,
  });

  it('montre les lots réservés et vendus grisés : ni prix, ni conditions, ni photo', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findFirst.mockResolvedValue(
      programme([
        l('a', 'A-10', 'Disponible', 10_000_000),
        l('b', 'A-2', 'Réservé', 10_000_000),
        l('c', 'A-3', 'Vendu', 10_000_000),
      ]),
    );
    const p = await service.findPublicOne('p1');
    // Tri naturel : A-2 avant A-10.
    expect(p.lots.map((x) => x.numeroLot)).toEqual(['A-2', 'A-3', 'A-10']);
    const [reserve, vendu, libre] = p.lots;
    for (const grise of [reserve, vendu]) {
      expect(grise.prixPublic).toBeNull();
      expect(grise.modalitePaiement).toBeNull();
      expect(grise.acompteMontant).toBeNull();
    }
    expect(libre.prixPublic).toBe(10_000_000);
    expect(p).toMatchObject({
      lotsTotal: 3,
      lotsDisponibles: 1,
      lotsReserves: 1,
      lotsVendus: 1,
    });
  });

  it('résume les catégories et les conditions de paiement des lots à vendre', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findFirst.mockResolvedValue(
      programme([
        l('a', 'A-1', 'Disponible', 12_000_000, {
          categorieLot: { nom: 'Angle' },
        }),
        l('b', 'A-2', 'Disponible', 14_000_000, {
          categorieLot: { nom: 'Angle' },
        }),
        l('c', 'A-3', 'Disponible', 10_000_000, {
          categorieLot: { nom: 'Standard' },
        }),
      ]),
    );
    const p = await service.findPublicOne('p1');
    expect(p.categories).toEqual([
      {
        nom: 'Angle',
        lotsDisponibles: 2,
        prixMin: 12_000_000,
        prixMax: 14_000_000,
      },
      {
        nom: 'Standard',
        lotsDisponibles: 1,
        prixMin: 10_000_000,
        prixMax: 10_000_000,
      },
    ]);
    expect(p.conditions).toEqual({
      modalites: ['Échelonné'],
      acompteMin: 2_000_000,
      moratoireMax: 6,
    });
  });

  it('sépare les photos et le plan de masse, et prend la première photo pour couverture', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findFirst.mockResolvedValue(
      programme(
        [l('a', 'A-1', 'Disponible', 10_000_000)],
        [
          {
            id: 'm1',
            type: 'plan',
            title: 'Plan de masse',
            storageKey: 'plan',
            resourceType: 'image',
          },
          {
            id: 'm2',
            type: 'photo',
            title: null,
            storageKey: 'photo',
            resourceType: 'image',
          },
        ],
      ),
    );
    const p = await service.findPublicOne('p1');
    expect(p.couverture).toBe('https://cdn.test/photo');
    expect(p.medias.map((m) => m.type)).toEqual(['plan', 'photo']);
  });

  it('un programme non publié, archivé ou sans lot à vendre est introuvable', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findFirst.mockResolvedValue(null);
    await expect(service.findPublicOne('p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      prismaMock.programmeLotissement.findFirst.mock.calls[0][0].where,
    ).toMatchObject({
      publie: true,
      archiveLe: null,
    });
    prismaMock.programmeLotissement.findFirst.mockResolvedValue(
      programme([l('b', 'A-2', 'Vendu', null)]),
    );
    await expect(service.findPublicOne('p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
