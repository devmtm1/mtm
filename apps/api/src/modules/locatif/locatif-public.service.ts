import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { QueryLocationPublicDto } from './dto/annonce.dto';

/**
 * Ce que le site public peut lire d'un bien en location. Liste blanche : le
 * propriétaire, l'adresse exacte, les notes internes, le responsable et les
 * baux n'en font jamais partie. Ce service est le seul point de sortie des
 * données locatives vers le site vitrine.
 */
const publicSelect = {
  id: true,
  referenceInterne: true,
  type: true,
  // Le logement dans sa propriété (villa divisée, résidence) : le nom et les autres logements encore libres, jamais
  // le propriétaire ni l'adresse exacte.
  numeroLot: true,
  immeuble: {
    select: {
      nom: true,
      type: true,
      logements: {
        where: { publie: true, statut: 'disponible' },
        orderBy: [
          { numeroLot: 'asc' as const },
          { referenceInterne: 'asc' as const },
        ],
        take: 9,
        select: {
          id: true,
          titre: true,
          type: true,
          numeroLot: true,
          loyerMensuel: true,
          prixNuit: true,
          modeLocation: true,
          nombreChambres: true,
        },
      },
    },
  },
  commune: true,
  region: true,
  superficie: true,
  titre: true,
  description: true,
  loyerMensuel: true,
  charges: true,
  moisCaution: true,
  nombrePieces: true,
  nombreChambres: true,
  nombreSallesEau: true,
  meuble: true,
  equipements: true,
  latitude: true,
  longitude: true,
  disponibleLe: true,
  modeLocation: true,
  prixNuit: true,
  cautionSejour: true,
  fraisMenage: true,
  nuitsMinimum: true,
  capaciteVoyageurs: true,
  heureArrivee: true,
  heureDepart: true,
  misEnAvant: true,
  publieLe: true,
  createdAt: true,
  medias: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: {
      id: true,
      type: true,
      title: true,
      storageKey: true,
      resourceType: true,
    },
  },
} satisfies Prisma.BienLocatifSelect;

type BienPublic = Prisma.BienLocatifGetPayload<{ select: typeof publicSelect }>;

/** Visible sur le site : publié par MTM, et réellement libre. */
const VISIBLE: Prisma.BienLocatifWhereInput = {
  publie: true,
  statut: 'disponible',
};

/**
 * Position arrondie à trois décimales (une centaine de mètres) : le visiteur
 * situe le quartier, pas la porte d'un logement encore occupé jusqu'au départ
 * du locataire.
 */
function arrondir(valeur: Prisma.Decimal | null): number | null {
  return valeur === null ? null : Math.round(Number(valeur) * 1000) / 1000;
}

@Injectable()
export class LocatifPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findPublic(query: QueryLocationPublicDto) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 12, 100);
    const search = query.search?.trim();
    const contains = (valeur: string) => ({
      contains: valeur,
      mode: 'insensitive' as const,
    });

    const where: Prisma.BienLocatifWhereInput = {
      ...VISIBLE,
      ...(query.type ? { type: query.type } : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.commune ? { commune: query.commune } : {}),
      ...(query.meuble !== undefined ? { meuble: query.meuble } : {}),
      ...(query.misEnAvant !== undefined
        ? { misEnAvant: query.misEnAvant }
        : {}),
      ...(query.chambresMin !== undefined
        ? { nombreChambres: { gte: query.chambresMin } }
        : {}),
      ...(query.superficieMin !== undefined
        ? { superficie: { gte: query.superficieMin } }
        : {}),
      ...(query.mode ? { modeLocation: query.mode } : {}),
      ...(query.voyageurs !== undefined
        ? { capaciteVoyageurs: { gte: query.voyageurs } }
        : {}),
      // Les prix de la nuit et le loyer mensuel ne se comparent pas : chaque
      // filtre ne vise que son mode de location.
      ...(query.mode === 'courte_duree'
        ? query.prixNuitMax !== undefined
          ? { prixNuit: { lte: query.prixNuitMax } }
          : {}
        : query.loyerMin !== undefined || query.loyerMax !== undefined
          ? {
              loyerMensuel: {
                ...(query.loyerMin !== undefined
                  ? { gte: query.loyerMin }
                  : {}),
                ...(query.loyerMax !== undefined
                  ? { lte: query.loyerMax }
                  : {}),
              },
            }
          : {}),
      // Recherche libre limitée aux champs publics : jamais l'adresse exacte.
      ...(search
        ? {
            OR: [
              { titre: contains(search) },
              { commune: contains(search) },
              { region: contains(search) },
              { referenceInterne: contains(search) },
              { description: contains(search) },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.bienLocatif.findMany({
        where,
        select: publicSelect,
        // Les annonces mises en avant d'abord, puis le tri demandé.
        orderBy: [
          { misEnAvant: 'desc' },
          { [query.sortBy]: query.sortOrder },
          { id: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bienLocatif.count({ where }),
    ]);

    return {
      items: items.map((bien) => this.toPublic(bien)),
      total,
      page,
      pageSize,
    };
  }

  async findPublicOne(id: string) {
    const bien = await this.prisma.bienLocatif.findFirst({
      where: { id, ...VISIBLE },
      select: publicSelect,
    });
    if (!bien) throw new NotFoundException('Annonce introuvable');
    return this.toPublic(bien);
  }

  /**
   * Valeurs proposées par les filtres : dérivées des annonces réellement
   * visibles, pour ne jamais proposer un critère qui ne renvoie rien.
   */
  async getPublicFilterOptions() {
    const visibles = await this.prisma.bienLocatif.findMany({
      where: VISIBLE,
      select: {
        type: true,
        region: true,
        commune: true,
        loyerMensuel: true,
        nombreChambres: true,
        modeLocation: true,
        prixNuit: true,
      },
    });
    const distinct = (valeurs: (string | null)[]): string[] =>
      [
        ...new Set(
          valeurs.filter((valeur): valeur is string => Boolean(valeur?.trim())),
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr'));

    const loyers = visibles
      .filter((bien) => bien.modeLocation !== 'courte_duree')
      .map((bien) =>
        bien.loyerMensuel === null ? null : Number(bien.loyerMensuel),
      )
      .filter((loyer): loyer is number => loyer !== null);
    const chambres = [
      ...new Set(
        visibles
          .map((bien) => bien.nombreChambres)
          .filter((nombre): nombre is number => nombre !== null && nombre > 0),
      ),
    ].sort((a, b) => a - b);

    const prixNuits = visibles
      .map((bien) => (bien.prixNuit === null ? null : Number(bien.prixNuit)))
      .filter((prix): prix is number => prix !== null);
    const sejours = visibles.filter(
      (bien) => bien.modeLocation === 'courte_duree',
    ).length;

    return {
      // Le site n'affiche le sélecteur « Courte durée » que s'il y a de quoi montrer.
      sejours,
      longueDuree: visibles.length - sejours,
      prixNuitMin: prixNuits.length ? Math.min(...prixNuits) : null,
      prixNuitMax: prixNuits.length ? Math.max(...prixNuits) : null,
      type: distinct(visibles.map((bien) => bien.type)),
      region: distinct(visibles.map((bien) => bien.region)),
      commune: distinct(visibles.map((bien) => bien.commune)),
      chambres,
      loyerMin: loyers.length ? Math.min(...loyers) : null,
      loyerMax: loyers.length ? Math.max(...loyers) : null,
      total: visibles.length,
    };
  }

  /** Un bien est-il demandable depuis le site ? Sert à la demande de location. */
  async estVisible(
    id: string,
  ): Promise<{ referenceInterne: string; label: string } | null> {
    const bien = await this.prisma.bienLocatif.findFirst({
      where: { id, ...VISIBLE },
      select: {
        referenceInterne: true,
        titre: true,
        type: true,
        commune: true,
      },
    });
    if (!bien) return null;
    return {
      referenceInterne: bien.referenceInterne,
      label: [bien.titre ?? bien.type, bien.commune]
        .filter(Boolean)
        .join(' — '),
    };
  }

  private toPublic(bien: BienPublic) {
    const loyer = bien.loyerMensuel === null ? null : Number(bien.loyerMensuel);
    const charges = bien.charges === null ? null : Number(bien.charges);
    const courte = bien.modeLocation === 'courte_duree';
    const nombre = (valeur: Prisma.Decimal | null): number | null =>
      valeur === null ? null : Number(valeur);
    return {
      id: bien.id,
      referenceInterne: bien.referenceInterne,
      type: bien.type,
      titre: bien.titre,
      description: bien.description,
      commune: bien.commune,
      region: bien.region,
      superficie: bien.superficie === null ? null : Number(bien.superficie),
      loyerMensuel: loyer,
      charges,
      moisCaution: bien.moisCaution,
      // Montant de la caution : lu par le visiteur avant de contacter.
      montantCaution: courte
        ? nombre(bien.cautionSejour)
        : loyer !== null && bien.moisCaution !== null
          ? loyer * bien.moisCaution
          : null,
      modeLocation: bien.modeLocation,
      prixNuit: nombre(bien.prixNuit),
      fraisMenage: nombre(bien.fraisMenage),
      nuitsMinimum: bien.nuitsMinimum,
      capaciteVoyageurs: bien.capaciteVoyageurs,
      heureArrivee: bien.heureArrivee,
      heureDepart: bien.heureDepart,
      nombrePieces: bien.nombrePieces,
      nombreChambres: bien.nombreChambres,
      nombreSallesEau: bien.nombreSallesEau,
      meuble: bien.meuble,
      equipements: bien.equipements,
      latitude: arrondir(bien.latitude),
      longitude: arrondir(bien.longitude),
      disponibleLe: bien.disponibleLe,
      numeroLot: bien.numeroLot,
      immeuble: bien.immeuble
        ? {
            nom: bien.immeuble.nom,
            type: bien.immeuble.type,
            autresLogements: bien.immeuble.logements
              .filter((logement) => logement.id !== bien.id)
              .slice(0, 8)
              .map((logement) => ({
                id: logement.id,
                titre: logement.titre,
                type: logement.type,
                numeroLot: logement.numeroLot,
                modeLocation: logement.modeLocation,
                nombreChambres: logement.nombreChambres,
                loyerMensuel: nombre(logement.loyerMensuel),
                prixNuit: nombre(logement.prixNuit),
              })),
          }
        : null,
      misEnAvant: bien.misEnAvant,
      publieLe: bien.publieLe,
      medias: bien.medias.map((media) => ({
        id: media.id,
        type: media.type,
        title: media.title,
        secureUrl: this.cloudinary.url(
          media.storageKey,
          media.resourceType,
          true,
        ),
      })),
    };
  }
}
