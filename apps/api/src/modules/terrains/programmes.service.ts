import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  estConflitDeReference,
  referenceSuivante,
} from '../../common/utils/reference';
import { TerrainsAccessService } from './terrains-access.service';
import {
  aAccesFinancier,
  comptaDuLot,
  comptaProgrammeComplete,
  lotComptaComplete,
  masquerFinancier,
  montantManquant,
} from './programmes-compta';
import { DEFAULT_TERRAIN_OPTIONS } from './terrains.service';
import type {
  AffecterLotsDto,
  CreateCategorieLotDto,
  CreateProgrammeDto,
  GenererLotsDto,
  StatutLotsDto,
  UpdateCategorieLotDto,
  UpdateProgrammeDto,
} from './dto/programme.dto';

type Utilisateur = { id: string; roles: string[]; permissions: string[] };

/** Un lot réservé ou vendu n'est jamais écrasé par une mise à jour de conditions. */
const STATUTS_FIGES = ['Réservé', 'Vendu'];

/** Champs d'un programme que le site public peut montrer. */
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

const proprietaireResume = {
  select: { id: true, firstName: true, lastName: true },
};

/** Numéro de lot : préfixe + rang sur au moins deux chiffres (A-01 … A-30, A-100). */
export function numeroDeLot(prefixe: string, rang: number, largeur: number) {
  return `${prefixe}${String(rang).padStart(largeur, '0')}`;
}

type Compte = { statutCommercial: string; _count: { _all: number } };

/** Décompte des lots par statut, tel que le montrent les cartes et la grille. */
export function resumeLots(comptes: Compte[]) {
  const n = (statut: string) =>
    comptes
      .filter((c) => c.statutCommercial === statut)
      .reduce((t, c) => t + c._count._all, 0);
  return {
    nombreLots: comptes.reduce((t, c) => t + c._count._all, 0),
    lotsDisponibles: n('Disponible'),
    lotsReserves: n('Réservé'),
    lotsVendus: n('Vendu'),
    lotsBrouillon: n('Brouillon'),
  };
}

@Injectable()
export class ProgrammesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly access: TerrainsAccessService,
  ) {}

  async findAll(archives = false, user?: Utilisateur) {
    const acces = aAccesFinancier(user);
    const programmes = await this.prisma.programmeLotissement.findMany({
      where: { archiveLe: archives ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      include: {
        proprietaire: proprietaireResume,
        categories: { select: { commission: true, marge: true } },
      },
    });
    const comptes = await this.prisma.terrain.groupBy({
      by: ['programmeId', 'statutCommercial'],
      where: { programmeId: { in: programmes.map((p) => p.id) } },
      _count: { _all: true },
    });
    return programmes.map(({ categories, ...p }) => ({
      ...masquerFinancier(p, acces),
      comptaComplete: comptaProgrammeComplete(p, categories),
      ...resumeLots(comptes.filter((c) => c.programmeId === p.id)),
    }));
  }

  async findOne(id: string, user?: Utilisateur) {
    const programme = await this.prisma.programmeLotissement.findUnique({
      where: { id },
      include: {
        proprietaire: proprietaireResume,
        categories: { orderBy: { nom: 'asc' } },
        lots: {
          select: {
            id: true,
            referenceInterne: true,
            numeroLot: true,
            nom: true,
            superficie: true,
            uniteSuperficie: true,
            prixPublic: true,
            statutCommercial: true,
            categorieLotId: true,
            modalitePaiement: true,
            dureeMoratoireMois: true,
            acompteMontant: true,
            proprietaireId: true,
            produitDirect: true,
            commission: true,
            marge: true,
          },
        },
      },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');
    // Tri naturel : A-2 avant A-10, ce que l'ordre alphabétique de la base ne donne pas.
    programme.lots.sort((a, b) =>
      (a.numeroLot ?? '').localeCompare(b.numeroLot ?? '', 'fr', {
        numeric: true,
      }),
    );
    const parStatut = new Map<string, number>();
    for (const lot of programme.lots) {
      parStatut.set(
        lot.statutCommercial,
        (parStatut.get(lot.statutCommercial) ?? 0) + 1,
      );
    }
    const comptes = resumeLots(
      [...parStatut].map(([statutCommercial, n]) => ({
        statutCommercial,
        _count: { _all: n },
      })),
    );
    const montant = (statuts: string[]) =>
      programme.lots
        .filter((l) => statuts.includes(l.statutCommercial))
        .reduce((t, l) => t + Number(l.prixPublic ?? 0), 0);
    // Chaque lot dit s'il est prêt pour la comptabilité ; ses montants internes, eux, ne sortent pas.
    const lots = programme.lots.map(
      ({ proprietaireId, produitDirect, commission, marge, ...lot }) => ({
        ...lot,
        comptaComplete: lotComptaComplete({
          proprietaireId,
          produitDirect,
          commission,
          marge,
        }),
      }),
    );
    return {
      ...masquerFinancier({ ...programme, lots }, aAccesFinancier(user)),
      comptaComplete: comptaProgrammeComplete(programme, programme.categories),
      lotsSansCompta: lots.filter((l) => !l.comptaComplete).length,
      ...comptes,
      // Pilotage : ce que le stock libre représente, ce qui est déjà engagé ou vendu.
      valeurDisponible: montant(['Disponible']),
      valeurReservee: montant(['Réservé']),
      valeurVendue: montant(['Vendu']),
    };
  }

  /** Programmes à montrer au public : ceux qui ont encore au moins un lot à vendre. */
  async findPublic() {
    const programmes = await this.prisma.programmeLotissement.findMany({
      where: {
        archiveLe: null,
        lots: { some: { statutCommercial: 'Disponible', archiveLe: null } },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ...champsPublics },
    });
    const lots = await this.prisma.terrain.findMany({
      where: {
        programmeId: { in: programmes.map((p) => p.id) },
        statutCommercial: 'Disponible',
        archiveLe: null,
      },
      select: { programmeId: true, prixPublic: true },
    });
    return programmes.map((p) => {
      const siens = lots.filter((l) => l.programmeId === p.id);
      const prix = siens
        .map((l) => Number(l.prixPublic ?? 0))
        .filter((n) => n > 0);
      return {
        ...p,
        lotsDisponibles: siens.length,
        prixMin: prix.length ? Math.min(...prix) : null,
        prixMax: prix.length ? Math.max(...prix) : null,
      };
    });
  }

  /** Fiche publique : le programme et ses lots libres, sans rien d'interne (propriétaire, prix d'acquisition). */
  async findPublicOne(id: string) {
    const programme = await this.prisma.programmeLotissement.findFirst({
      where: { id, archiveLe: null },
      select: {
        id: true,
        ...champsPublics,
        lots: {
          where: { statutCommercial: 'Disponible', archiveLe: null },
          select: {
            id: true,
            numeroLot: true,
            superficie: true,
            uniteSuperficie: true,
            prixPublic: true,
            modalitePaiement: true,
            dureeMoratoireMois: true,
            acompteMontant: true,
            categorieLot: { select: { nom: true } },
          },
        },
      },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');
    programme.lots.sort((a, b) =>
      (a.numeroLot ?? '').localeCompare(b.numeroLot ?? '', 'fr', {
        numeric: true,
      }),
    );
    return programme;
  }

  /** Retire le programme des listes. Impossible tant qu'une vente est en cours sur l'un de ses lots. */
  async archiver(id: string) {
    await this.assertExiste(id);
    const enCours = await this.prisma.terrain.count({
      where: { programmeId: id, statutCommercial: 'Réservé' },
    });
    if (enCours > 0) {
      throw new ConflictException(
        `${enCours} lot${enCours > 1 ? 's sont réservés' : ' est réservé'} : terminez ou annulez ces ventes avant d'archiver le programme.`,
      );
    }
    return this.prisma.programmeLotissement.update({
      where: { id },
      data: { archiveLe: new Date() },
    });
  }

  async restaurer(id: string) {
    await this.assertExiste(id);
    return this.prisma.programmeLotissement.update({
      where: { id },
      data: { archiveLe: null },
    });
  }

  async create(dto: CreateProgrammeDto, user?: Utilisateur) {
    if (
      !aAccesFinancier(user) &&
      (dto.commissionLot != null || dto.margeLot != null || dto.produitDirect)
    ) {
      throw new ForbiddenException(REFUS_FINANCIER);
    }
    await this.verifierReferentiels(dto);
    if (dto.proprietaireId) await this.verifierProprietaire(dto.proprietaireId);
    const prefixe = `P-${new Date().getFullYear()}-`;
    for (let tentative = 1; ; tentative += 1) {
      const existantes = await this.prisma.programmeLotissement.findMany({
        where: { reference: { startsWith: prefixe } },
        select: { reference: true },
      });
      const reference = referenceSuivante(
        prefixe,
        existantes.map((e) => e.reference),
      );
      try {
        return await this.prisma.programmeLotissement.create({
          data: { ...dto, reference },
        });
      } catch (erreur) {
        if (estConflitDeReference(erreur, 'reference') && tentative < 5)
          continue;
        throw erreur;
      }
    }
  }

  async update(id: string, dto: UpdateProgrammeDto, user?: Utilisateur) {
    const { justification, ...donnees } = dto;
    const actuel = await this.prisma.programmeLotissement.findUnique({
      where: { id },
    });
    if (!actuel) throw new NotFoundException('Programme introuvable');
    await this.verifierReferentiels(donnees);
    if (donnees.proprietaireId)
      await this.verifierProprietaire(donnees.proprietaireId);

    // Ce qui change réellement parmi les données qui font les comptes : un écran qui renvoie
    // tout son formulaire ne doit pas exiger de justification pour ce qu'il n'a pas touché.
    const comparable = (valeur: unknown) =>
      valeur === null || valeur === undefined
        ? null
        : typeof valeur === 'string' || typeof valeur === 'boolean'
          ? valeur
          : Number(valeur);
    const modifies = CHAMPS_COMPTA.filter(
      (champ) =>
        donnees[champ] !== undefined &&
        comparable(donnees[champ]) !== comparable(actuel[champ]),
    );
    if (modifies.length > 0) {
      if (
        modifies.some((champ) => champ !== 'proprietaireId') &&
        !aAccesFinancier(user)
      ) {
        throw new ForbiddenException(REFUS_FINANCIER);
      }
      const lots = await this.prisma.terrain.count({
        where: { programmeId: id },
      });
      if (lots > 0 && !justification?.trim()) {
        throw new BadRequestException(
          'Une justification est obligatoire pour modifier la commission, la marge, le mode « produit direct » ou le propriétaire d’un programme qui a déjà des lots',
        );
      }
    }
    return this.prisma.programmeLotissement.update({
      where: { id },
      data: donnees,
    });
  }

  // --- Catégories -----------------------------------------------------------

  async creerCategorie(
    programmeId: string,
    dto: CreateCategorieLotDto,
    user?: Utilisateur,
  ) {
    this.refuserFinancierSiNonHabilite(dto, user);
    await this.assertExiste(programmeId);
    await this.verifierModalite(dto.modalitePaiement);
    try {
      return await this.prisma.categorieLot.create({
        data: { ...dto, programmeId },
      });
    } catch (erreur) {
      if (estDoublon(erreur)) throw new ConflictException(DOUBLON_CATEGORIE);
      throw erreur;
    }
  }

  async modifierCategorie(
    id: string,
    dto: UpdateCategorieLotDto,
    user?: Utilisateur,
  ) {
    this.refuserFinancierSiNonHabilite(dto, user);
    await this.verifierModalite(dto.modalitePaiement);
    try {
      return await this.prisma.categorieLot.update({
        where: { id },
        data: dto,
      });
    } catch (erreur) {
      if (estDoublon(erreur)) throw new ConflictException(DOUBLON_CATEGORIE);
      if (estIntrouvable(erreur))
        throw new NotFoundException('Catégorie introuvable');
      throw erreur;
    }
  }

  async supprimerCategorie(id: string) {
    const lots = await this.prisma.terrain.count({
      where: { categorieLotId: id },
    });
    if (lots > 0) {
      throw new ConflictException(
        `${lots} lot${lots > 1 ? 's sont rangés' : ' est rangé'} dans cette catégorie : changez-le${lots > 1 ? 's' : ''} de catégorie d'abord`,
      );
    }
    try {
      await this.prisma.categorieLot.delete({ where: { id } });
    } catch (erreur) {
      if (estIntrouvable(erreur))
        throw new NotFoundException('Catégorie introuvable');
      throw erreur;
    }
    return { deleted: true };
  }

  /**
   * Recopie les conditions de la catégorie sur ses lots encore libres. Les lots
   * réservés ou vendus gardent celles de leur contrat.
   */
  async appliquerCategorie(id: string) {
    const categorie = await this.prisma.categorieLot.findUnique({
      where: { id },
      include: { programme: true },
    });
    if (!categorie) throw new NotFoundException('Catégorie introuvable');
    const res = await this.prisma.terrain.updateMany({
      where: { categorieLotId: id, statutCommercial: { notIn: STATUTS_FIGES } },
      data: conditionsEffectives(categorie.programme, categorie),
    });
    return { lotsMisAJour: res.count };
  }

  /**
   * Recopie les conditions du programme (et celles de chaque catégorie, qui priment) sur tous ses
   * lots encore libres : prix, paiement, propriétaire, commission ou marge. Les lots réservés ou
   * vendus gardent celles de leur contrat : leurs écritures comptables ne changent jamais.
   */
  async appliquerProgramme(id: string) {
    const programme = await this.prisma.programmeLotissement.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');
    const libres = { statutCommercial: { notIn: STATUTS_FIGES } };
    let lotsMisAJour = (
      await this.prisma.terrain.updateMany({
        where: { programmeId: id, categorieLotId: null, ...libres },
        data: conditionsEffectives(programme),
      })
    ).count;
    for (const categorie of programme.categories) {
      lotsMisAJour += (
        await this.prisma.terrain.updateMany({
          where: { programmeId: id, categorieLotId: categorie.id, ...libres },
          data: conditionsEffectives(programme, categorie),
        })
      ).count;
    }
    return { lotsMisAJour };
  }

  /** Range plusieurs lots dans une catégorie (ou les en sort) et leur applique ses conditions. */
  async affecterLots(programmeId: string, dto: AffecterLotsDto) {
    const programme = await this.prisma.programmeLotissement.findUnique({
      where: { id: programmeId },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');
    const categorie = await this.categorieDuProgramme(
      programmeId,
      dto.categorieLotId ?? undefined,
    );
    const res = await this.prisma.terrain.updateMany({
      where: {
        id: { in: dto.lotIds },
        programmeId,
        statutCommercial: { notIn: STATUTS_FIGES },
      },
      data: {
        categorieLotId: categorie?.id ?? null,
        ...(categorie ? conditionsEffectives(programme, categorie) : {}),
      },
    });
    return { lotsMisAJour: res.count, ignores: dto.lotIds.length - res.count };
  }

  /** Met en vente (ou retire) des lots d'un coup ; les lots réservés ou vendus ne bougent pas. */
  async changerStatut(programmeId: string, dto: StatutLotsDto) {
    await this.assertExiste(programmeId);
    const cible = {
      id: { in: dto.lotIds },
      programmeId,
      statutCommercial: { notIn: STATUTS_FIGES },
    };
    if (dto.statut === 'Disponible') await this.assertComptaComplete(cible);
    const res = await this.prisma.terrain.updateMany({
      where: cible,
      data: { statutCommercial: dto.statut },
    });
    return { lotsMisAJour: res.count, ignores: dto.lotIds.length - res.count };
  }

  // --- Génération en série --------------------------------------------------

  async genererLots(
    programmeId: string,
    dto: GenererLotsDto,
    user: Utilisateur,
  ) {
    const programme = await this.prisma.programmeLotissement.findUnique({
      where: { id: programmeId },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');
    if (programme.archiveLe) {
      throw new BadRequestException('Ce programme est archivé');
    }
    const categorie = await this.categorieDuProgramme(
      programmeId,
      dto.categorieLotId,
    );

    const prefixe = dto.prefixe ?? '';
    const debut = dto.debut ?? 1;
    const largeur = Math.max(2, String(debut + dto.nombre - 1).length);
    const numeros = Array.from({ length: dto.nombre }, (_, i) =>
      numeroDeLot(prefixe, debut + i, largeur),
    );
    const pris = await this.prisma.terrain.findMany({
      where: { programmeId, numeroLot: { in: numeros } },
      select: { numeroLot: true },
    });
    if (pris.length) {
      const exemples = pris
        .slice(0, 5)
        .map((p) => p.numeroLot)
        .join(', ');
      throw new ConflictException(
        `Ces numéros existent déjà : ${exemples}${pris.length > 5 ? '…' : ''}. Changez le premier rang ou le préfixe.`,
      );
    }

    const responsableId = await this.access.resolveResponsable(undefined, user);
    const anneePrefixe = `T-${new Date().getFullYear()}-`;
    const conditions = conditionsEffectives(programme, categorie);

    // Une seule transaction : les lots existent tous ou aucun. Les matricules
    // sont déduits une fois puis incrémentés ; en cas de course avec une autre
    // création, la contrainte d'unicité fait échouer et on recommence.
    for (let tentative = 1; ; tentative += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existantes = await tx.terrain.findMany({
            where: { referenceInterne: { startsWith: anneePrefixe } },
            select: { referenceInterne: true },
          });
          const premiere = referenceSuivante(
            anneePrefixe,
            existantes.map((e) => e.referenceInterne),
          );
          const rangDebut = Number(premiere.slice(anneePrefixe.length));
          const data: Prisma.TerrainCreateManyInput[] = numeros.map(
            (numero, i) => ({
              referenceInterne: `${anneePrefixe}${String(rangDebut + i).padStart(4, '0')}`,
              nom: `${programme.nom} — Lot ${numero}`,
              numeroLot: numero,
              programmeId,
              categorieLotId: categorie?.id ?? null,
              statutJuridique: programme.statutJuridique,
              typeDocumentFoncier: programme.typeDocumentFoncier,
              niveauVerification: programme.niveauVerification,
              region: programme.region,
              commune: programme.commune,
              localisationDetail: programme.localisationDetail,
              typeBien: 'terrain',
              superficie: dto.superficie ?? null,
              uniteSuperficie:
                dto.superficie != null ? (dto.uniteSuperficie ?? 'm²') : null,
              ...conditions,
              statutCommercial: 'Brouillon',
              commercialResponsableId: responsableId,
            }),
          );
          const res = await tx.terrain.createMany({ data });
          // Un programme déjà confié à un mandat : ses nouveaux lots le suivent.
          const mandats = await tx.mandatLot.findMany({
            where: { terrain: { programmeId } },
            distinct: ['mandatId'],
            select: { mandatId: true },
          });
          if (mandats.length > 0) {
            const nouveaux = await tx.terrain.findMany({
              where: { programmeId, numeroLot: { in: numeros } },
              select: { id: true },
            });
            await tx.mandatLot.createMany({
              data: mandats.flatMap((m) =>
                nouveaux.map((t) => ({
                  mandatId: m.mandatId,
                  terrainId: t.id,
                })),
              ),
              skipDuplicates: true,
            });
          }
          return {
            crees: res.count,
            premier: numeros[0],
            dernier: numeros[numeros.length - 1],
          };
        });
      } catch (erreur) {
        if (estConflitDeReference(erreur) && tentative < 5) continue;
        throw erreur;
      }
    }
  }

  // --- Interne --------------------------------------------------------------

  private async categorieDuProgramme(
    programmeId: string,
    categorieId: string | undefined,
  ) {
    if (!categorieId) return null;
    const categorie = await this.prisma.categorieLot.findFirst({
      where: { id: categorieId, programmeId },
    });
    if (!categorie) {
      throw new BadRequestException(
        "Cette catégorie n'appartient pas au programme",
      );
    }
    return categorie;
  }

  /** Refuse les montants internes (commission, marge) à qui n'a pas le droit de les saisir. */
  private refuserFinancierSiNonHabilite(
    dto: { commission?: number; marge?: number },
    user?: Utilisateur,
  ) {
    if (
      !aAccesFinancier(user) &&
      (dto.commission != null || dto.marge != null)
    ) {
      throw new ForbiddenException(REFUS_FINANCIER);
    }
  }

  /**
   * Un lot sans commission (bien confié) ou sans marge (bien en propre) rapporterait zéro à la
   * comptabilité et laisserait son propriétaire hors des reversements : on ne le met pas en vente.
   */
  private async assertComptaComplete(where: Prisma.TerrainWhereInput) {
    const lots = await this.prisma.terrain.findMany({
      where,
      select: {
        numeroLot: true,
        proprietaireId: true,
        produitDirect: true,
        commission: true,
        marge: true,
      },
    });
    const manquants = lots.filter((l) => !lotComptaComplete(l));
    if (manquants.length === 0) return;
    const montant = montantManquant(manquants[0]);
    const exemples = manquants
      .slice(0, 5)
      .map((l) => l.numeroLot)
      .join(', ');
    const pluriel = manquants.length > 1;
    throw new ConflictException(
      manquants.length +
        (pluriel ? ' lots n’ont' : ' lot n’a') +
        ' pas de ' +
        montant +
        ' de MTM (' +
        exemples +
        (manquants.length > 5 ? '…' : '') +
        ') : sans elle, leurs ventes ne rapporteraient rien à la comptabilité' +
        (montant === 'commission'
          ? ' et le propriétaire n’apparaîtrait pas dans les reversements'
          : '') +
        '. Renseignez-la sur le programme (ou sa catégorie), puis « Appliquer aux lots ».',
    );
  }

  private async assertExiste(id: string) {
    const trouve = await this.prisma.programmeLotissement.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!trouve) throw new NotFoundException('Programme introuvable');
  }

  private async verifierProprietaire(id: string) {
    const p = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('Propriétaire introuvable');
  }

  private async verifierModalite(valeur: string | undefined) {
    await this.settings.assertInList(
      'terrains.modalitePaiement',
      DEFAULT_TERRAIN_OPTIONS.modalitePaiement,
      valeur,
      'Valeur de référentiel invalide : modalitePaiement',
    );
  }

  private async verifierReferentiels(dto: Partial<CreateProgrammeDto>) {
    for (const champ of ['statutJuridique', 'niveauVerification'] as const) {
      await this.settings.assertInList(
        `terrains.${champ}`,
        DEFAULT_TERRAIN_OPTIONS[champ],
        dto[champ],
        `Valeur de référentiel invalide : ${champ}`,
      );
    }
    await this.verifierModalite(dto.modalitePaiement);
  }
}

const DOUBLON_CATEGORIE = 'Cette catégorie existe déjà dans le programme';

/** Les champs d'un programme qui font les comptes : tout changement se justifie quand il a déjà des lots. */
const CHAMPS_COMPTA = [
  'commissionLot',
  'margeLot',
  'produitDirect',
  'proprietaireId',
] as const;

const REFUS_FINANCIER =
  'La commission, la marge et le mode « produit direct » ne se saisissent que par la direction ou une personne autorisée à voir le financier';

/**
 * Tout ce qu'un lot reçoit de son programme (et de sa catégorie, qui prime) : ses conditions de
 * vente, son propriétaire et ce que la comptabilité attend de lui (commission ou marge).
 */
function conditionsEffectives(
  programme: {
    prixLot: Prisma.Decimal | null;
    modalitePaiement: string | null;
    dureeMoratoireMois: number | null;
    acompteMontant: Prisma.Decimal | null;
    proprietaireId: string | null;
    produitDirect: boolean;
    commissionLot: Prisma.Decimal | null;
    margeLot: Prisma.Decimal | null;
  },
  categorie?: {
    prixPublic: Prisma.Decimal | null;
    modalitePaiement: string | null;
    dureeMoratoireMois: number | null;
    acompteMontant: Prisma.Decimal | null;
    commission: Prisma.Decimal | null;
    marge: Prisma.Decimal | null;
  } | null,
) {
  const compta = comptaDuLot(programme, categorie);
  return {
    prixPublic: categorie?.prixPublic ?? programme.prixLot,
    modalitePaiement: categorie?.modalitePaiement ?? programme.modalitePaiement,
    dureeMoratoireMois:
      categorie?.dureeMoratoireMois ?? programme.dureeMoratoireMois,
    acompteMontant: categorie?.acompteMontant ?? programme.acompteMontant,
    proprietaireId: compta.proprietaireId,
    produitDirect: compta.produitDirect,
    commission: (compta.commission ?? null) as Prisma.Decimal | null,
    marge: (compta.marge ?? null) as Prisma.Decimal | null,
  };
}

function estDoublon(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
  );
}

function estIntrouvable(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025'
  );
}
