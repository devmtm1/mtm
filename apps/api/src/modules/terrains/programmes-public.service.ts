import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import type { QueryProgrammesPublicDto } from './dto/query-programmes-public.dto';

/** Ce que le site public montre d'un programme : rien d'interne (propriétaire, commission, marge, prix d'acquisition). */
const champsPublics = {
  reference: true,
  nom: true,
  region: true,
  commune: true,
  localisationDetail: true,
  description: true,
  statutJuridique: true,
  niveauVerification: true,
} as const;

/** Les lots qu'un visiteur peut voir : à vendre, réservés ou vendus. Un brouillon ou un lot suspendu n'existe pas pour lui. */
const STATUTS_VISIBLES = ['Disponible', 'Réservé', 'Vendu'] as const;

type LotStat = {
  statutCommercial: string;
  prixPublic: unknown;
  superficie: unknown;
  uniteSuperficie: string | null;
};

const nombre = (valeur: unknown): number | null =>
  valeur === null || valeur === undefined ? null : Number(valeur);

/** Compteurs, fourchettes de prix et de superficie d'un programme, calculés sur ses lots visibles. */
export function syntheseLots(lots: LotStat[]) {
  const visibles = lots.filter((l) =>
    (STATUTS_VISIBLES as readonly string[]).includes(l.statutCommercial),
  );
  const libres = visibles.filter((l) => l.statutCommercial === 'Disponible');
  const prix = libres
    .map((l) => nombre(l.prixPublic))
    .filter((n): n is number => n !== null && n > 0);
  // Les superficies de tous les lots visibles : elles décrivent le lotissement, pas seulement ce qui reste.
  const surfaces = visibles
    .map((l) => nombre(l.superficie))
    .filter((n): n is number => n !== null && n > 0);
  const compte = (statut: string) =>
    visibles.filter((l) => l.statutCommercial === statut).length;
  return {
    lotsTotal: visibles.length,
    lotsDisponibles: libres.length,
    lotsReserves: compte('Réservé'),
    lotsVendus: compte('Vendu'),
    prixMin: prix.length ? Math.min(...prix) : null,
    prixMax: prix.length ? Math.max(...prix) : null,
    superficieMin: surfaces.length ? Math.min(...surfaces) : null,
    superficieMax: surfaces.length ? Math.max(...surfaces) : null,
    uniteSuperficie:
      visibles.find((l) => l.uniteSuperficie)?.uniteSuperficie ?? null,
  };
}

const parNumero = <T extends { numeroLot: string | null }>(a: T, b: T) =>
  (a.numeroLot ?? '').localeCompare(b.numeroLot ?? '', 'fr', { numeric: true });

/**
 * Les programmes (lotissements) tels que le site public les montre : une carte par programme dans le
 * catalogue, et une page de vente avec ses lots, son plan et ses conditions.
 */
@Injectable()
export class ProgrammesPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private url(key: string, resourceType: string): string {
    return this.cloudinary.url(key, resourceType, true);
  }

  /**
   * Les programmes qui ont encore au moins un lot à vendre et qui correspondent aux filtres du
   * catalogue. Prix et superficie se lisent sur les lots à vendre : un budget de 9 M ne ramène pas un
   * programme dont les lots coûtent 10 M.
   */
  async findPublic(query: QueryProgrammesPublicDto = {}) {
    const lotLibre: Prisma.TerrainWhereInput = {
      statutCommercial: 'Disponible',
      archiveLe: null,
      ...(query.prixPublicMin !== undefined || query.prixPublicMax !== undefined
        ? {
            prixPublic: {
              ...(query.prixPublicMin !== undefined
                ? { gte: query.prixPublicMin }
                : {}),
              ...(query.prixPublicMax !== undefined
                ? { lte: query.prixPublicMax }
                : {}),
            },
          }
        : {}),
      ...(query.superficieMin !== undefined || query.superficieMax !== undefined
        ? {
            superficie: {
              ...(query.superficieMin !== undefined
                ? { gte: query.superficieMin }
                : {}),
              ...(query.superficieMax !== undefined
                ? { lte: query.superficieMax }
                : {}),
            },
          }
        : {}),
    };
    const recherche = query.search?.trim();
    const programmes = await this.prisma.programmeLotissement.findMany({
      where: {
        publie: true,
        archiveLe: null,
        lots: { some: lotLibre },
        ...(query.region
          ? { region: { equals: query.region, mode: 'insensitive' as const } }
          : {}),
        ...(query.commune
          ? { commune: { equals: query.commune, mode: 'insensitive' as const } }
          : {}),
        ...(query.statutJuridique
          ? { statutJuridique: query.statutJuridique }
          : {}),
        ...(recherche
          ? {
              OR: [
                'nom',
                'reference',
                'commune',
                'region',
                'localisationDetail',
              ].map((champ) => ({
                [champ]: { contains: recherche, mode: 'insensitive' as const },
              })),
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ...champsPublics },
    });
    if (programmes.length === 0) return [];
    const ids = programmes.map((p) => p.id);

    const [lots, medias, photosLots] = await Promise.all([
      this.prisma.terrain.findMany({
        where: {
          programmeId: { in: ids },
          archiveLe: null,
          statutCommercial: { in: [...STATUTS_VISIBLES] },
        },
        select: {
          programmeId: true,
          statutCommercial: true,
          prixPublic: true,
          superficie: true,
          uniteSuperficie: true,
        },
      }),
      this.prisma.programmeMedia.findMany({
        where: { programmeId: { in: ids }, type: 'photo' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      // Sans photo propre, le programme emprunte celle d'un de ses lots à vendre.
      this.prisma.terrainMedia.findMany({
        where: {
          isPublic: true,
          type: 'photo',
          terrain: {
            programmeId: { in: ids },
            statutCommercial: 'Disponible',
            archiveLe: null,
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          storageKey: true,
          resourceType: true,
          terrain: { select: { programmeId: true } },
        },
        take: 300,
      }),
    ]);

    return programmes.map((p) => {
      const siens = (lots ?? []).filter((l) => l.programmeId === p.id);
      const propre = (medias ?? []).find((m) => m.programmeId === p.id);
      const emprunt = (photosLots ?? []).find(
        (m) => m.terrain.programmeId === p.id,
      );
      const couverture = propre
        ? this.url(propre.storageKey, propre.resourceType)
        : emprunt
          ? this.url(emprunt.storageKey, emprunt.resourceType)
          : null;
      return { ...p, couverture, ...syntheseLots(siens) };
    });
  }

  /** La page de vente d'un programme : ses lots (libres, réservés, vendus), ses visuels et ses conditions. */
  async findPublicOne(id: string) {
    const programme = await this.prisma.programmeLotissement.findFirst({
      where: { id, publie: true, archiveLe: null },
      select: {
        id: true,
        ...champsPublics,
        medias: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        lots: {
          where: {
            archiveLe: null,
            statutCommercial: { in: [...STATUTS_VISIBLES] },
          },
          select: {
            id: true,
            numeroLot: true,
            statutCommercial: true,
            superficie: true,
            uniteSuperficie: true,
            prixPublic: true,
            modalitePaiement: true,
            dureeMoratoireMois: true,
            acompteMontant: true,
            categorieLot: { select: { nom: true } },
            medias: {
              where: { isPublic: true, type: 'photo' },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              take: 1,
              select: { storageKey: true, resourceType: true },
            },
          },
        },
      },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');
    const synthese = syntheseLots(programme.lots);
    if (synthese.lotsDisponibles === 0) {
      throw new NotFoundException('Programme introuvable');
    }
    programme.lots.sort(parNumero);

    // Les lots libres montrent tout ; un lot réservé ou vendu reste visible, grisé, sans prix ni conditions.
    const lots = programme.lots.map((l) => {
      const libre = l.statutCommercial === 'Disponible';
      return {
        id: l.id,
        numeroLot: l.numeroLot,
        statut: l.statutCommercial,
        superficie: nombre(l.superficie),
        uniteSuperficie: l.uniteSuperficie,
        categorieLot: l.categorieLot,
        prixPublic: libre ? nombre(l.prixPublic) : null,
        modalitePaiement: libre ? l.modalitePaiement : null,
        dureeMoratoireMois: libre ? l.dureeMoratoireMois : null,
        acompteMontant: libre ? nombre(l.acompteMontant) : null,
        photo:
          libre && l.medias[0]
            ? this.url(l.medias[0].storageKey, l.medias[0].resourceType)
            : null,
      };
    });
    const libres = lots.filter((l) => l.statut === 'Disponible');

    // Les catégories : combien de lots à vendre, et à quel prix.
    const categories = [
      ...new Set(lots.map((l) => l.categorieLot?.nom).filter(Boolean)),
    ].map((nom) => {
      const siens = libres.filter((l) => l.categorieLot?.nom === nom);
      const prix = siens
        .map((l) => l.prixPublic)
        .filter((n): n is number => n !== null && n > 0);
      return {
        nom: nom as string,
        lotsDisponibles: siens.length,
        prixMin: prix.length ? Math.min(...prix) : null,
        prixMax: prix.length ? Math.max(...prix) : null,
      };
    });

    const modalites = [
      ...new Set(libres.map((l) => l.modalitePaiement).filter(Boolean)),
    ] as string[];
    const acomptes = libres
      .map((l) => l.acompteMontant)
      .filter((n): n is number => n !== null && n > 0);
    const moratoires = libres
      .map((l) => l.dureeMoratoireMois)
      .filter((n): n is number => n !== null && n > 0);

    const medias = programme.medias.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      secureUrl: this.url(m.storageKey, m.resourceType),
    }));
    const premierePhoto = medias.find((m) => m.type === 'photo');
    const photoDeLot = libres.find((l) => l.photo)?.photo ?? null;
    const { medias: _medias, lots: _lots, ...base } = programme;
    void _medias;
    void _lots;
    return {
      ...base,
      couverture: premierePhoto?.secureUrl ?? photoDeLot,
      medias,
      ...synthese,
      categories,
      conditions: {
        modalites,
        acompteMin: acomptes.length ? Math.min(...acomptes) : null,
        moratoireMax: moratoires.length ? Math.max(...moratoires) : null,
      },
      lots,
    };
  }
}
