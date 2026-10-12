import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PeriodesFinancieresService } from '../finances/periodes.service';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../database/prisma.service';
import {
  NotificationsService,
  formaterMontant,
} from '../notifications/notifications.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { EtatsDesLieuxService, etatInclude } from './etats-des-lieux.service';
import {
  AnnulerSejourDto,
  CreatePaiementSejourDto,
  CreateSejourDto,
  DemandeSejourPublicDto,
  QuerySejourDto,
  RestituerCautionSejourDto,
  TransitionSejourDto,
  UpdateSejourDto,
  VerserCautionSejourDto,
} from './dto/sejour.dto';
import {
  STATUTS_SEJOUR_BLOQUANTS,
  STATUTS_SEJOUR_TERMINES,
  formatJour,
  jourUtc,
  montantSejour,
  nombreNuits,
  syntheseSejour,
  verifierDemandeSejour,
  type PeriodeBloquee,
} from './sejour.helper';

const nombre = (valeur: unknown): number => Number(valeur ?? 0);

const bienResume = {
  select: {
    id: true,
    referenceInterne: true,
    titre: true,
    type: true,
    commune: true,
    adresse: true,
    heureArrivee: true,
    heureDepart: true,
  },
} satisfies Prisma.SejourLocatifInclude['bienLocatif'];

const voyageurResume = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
  },
} satisfies Prisma.SejourLocatifInclude['locataire'];

const sejourListInclude = {
  bienLocatif: bienResume,
  locataire: voyageurResume,
  paiements: { select: { montant: true } },
} satisfies Prisma.SejourLocatifInclude;

const sejourInclude = {
  bienLocatif: bienResume,
  locataire: voyageurResume,
  paiements: { orderBy: { datePaiement: 'asc' as const } },
  etatsDesLieux: { include: etatInclude },
} satisfies Prisma.SejourLocatifInclude;

/** Transitions autorisées : on avance, on ne revient pas en arrière. */
const TRANSITIONS: Record<string, string[]> = {
  demande: ['confirmee'],
  confirmee: ['en_cours'],
  en_cours: ['terminee'],
};

/**
 * Séjours de courte durée (location type Airbnb) : réservation d'un bien à la
 * nuit, sans bail ni loyer mensuel. Le service garantit qu'un bien n'est jamais
 * réservé deux fois sur les mêmes nuits, fige le prix à la réservation, suit les
 * règlements et la caution, et reçoit les demandes déposées sur le site.
 */
@Injectable()
export class SejoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
    private readonly etats: EtatsDesLieuxService,
    private readonly notifications: NotificationsService,
    @Optional() private readonly periodes?: PeriodesFinancieresService,
  ) {}

  // --- Lecture ---

  async findAll(query: QuerySejourDto, user: LocatifUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const contains = (valeur: string) => ({
      contains: valeur,
      mode: 'insensitive' as const,
    });
    const aujourdhui = jourUtc(new Date());

    const where: Prisma.SejourLocatifWhereInput = {
      bienLocatif: this.access.ownershipFilter(user),
      ...(query.bienLocatifId ? { bienLocatifId: query.bienLocatifId } : {}),
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.du || query.au
        ? {
            // Fenêtre de calendrier : tout séjour qui recouvre la période.
            ...(query.au ? { dateArrivee: { lt: jourUtc(query.au) } } : {}),
            ...(query.du ? { dateDepart: { gt: jourUtc(query.du) } } : {}),
          }
        : {}),
      ...(search
        ? {
            OR: [
              { referenceInterne: contains(search) },
              { locataire: { lastName: contains(search) } },
              { locataire: { firstName: contains(search) } },
              { locataire: { phone: contains(search) } },
              { bienLocatif: { referenceInterne: contains(search) } },
              { bienLocatif: { titre: contains(search) } },
            ],
          }
        : {}),
      ...this.filtreVue(query.vue, aujourdhui),
    };

    const [items, total] = await Promise.all([
      this.prisma.sejourLocatif.findMany({
        where,
        include: sejourListInclude,
        orderBy:
          query.vue === 'a_traiter'
            ? [{ createdAt: 'asc' }]
            : query.vue === 'a_venir' || query.vue === 'en_cours'
              ? [{ dateArrivee: 'asc' }]
              : [{ dateArrivee: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sejourLocatif.count({ where }),
    ]);
    return {
      items: items.map((sejour) => this.pourListe(sejour)),
      total,
      page,
      pageSize,
    };
  }

  private filtreVue(
    vue: string | undefined,
    aujourdhui: Date,
  ): Prisma.SejourLocatifWhereInput {
    switch (vue) {
      case 'a_traiter':
        return { statut: 'demande' };
      case 'a_venir':
        return { statut: 'confirmee', dateArrivee: { gte: aujourdhui } };
      case 'en_cours':
        return { statut: 'en_cours' };
      case 'caution_a_regler':
        // Séjour fini (ou annulé) dont la caution n'a pas été rendue.
        return {
          cautionStatut: 'versee',
          statut: { in: [...STATUTS_SEJOUR_TERMINES] },
        };
      case 'termines':
        return { statut: { in: [...STATUTS_SEJOUR_TERMINES] } };
      default:
        return {};
    }
  }

  /** Chiffres de l'écran « Séjours » : ce qui attend MTM. */
  async stats(user: LocatifUser) {
    const bien = this.access.ownershipFilter(user);
    const aujourdhui = jourUtc(new Date());
    const dans7Jours = new Date(aujourdhui.getTime() + 7 * 86_400_000);
    const [aTraiter, arriveesProches, enCours, cautionsARegler] =
      await Promise.all([
        this.prisma.sejourLocatif.count({
          where: { bienLocatif: bien, statut: 'demande' },
        }),
        this.prisma.sejourLocatif.count({
          where: {
            bienLocatif: bien,
            statut: 'confirmee',
            dateArrivee: { gte: aujourdhui, lte: dans7Jours },
          },
        }),
        this.prisma.sejourLocatif.count({
          where: { bienLocatif: bien, statut: 'en_cours' },
        }),
        this.prisma.sejourLocatif.count({
          where: {
            bienLocatif: bien,
            cautionStatut: 'versee',
            statut: { in: [...STATUTS_SEJOUR_TERMINES] },
          },
        }),
      ]);
    return { aTraiter, arriveesProches, enCours, cautionsARegler };
  }

  async findOne(id: string, user: LocatifUser) {
    const sejour = await this.prisma.sejourLocatif.findFirst({
      where: { id, bienLocatif: this.access.ownershipFilter(user) },
      include: sejourInclude,
    });
    if (!sejour) throw new NotFoundException('Séjour introuvable');
    const { etatsDesLieux, ...reste } = sejour;
    return {
      ...reste,
      synthese: syntheseSejour(
        nombre(sejour.montantTotal),
        sejour.paiements.map((paiement) => ({
          montant: nombre(paiement.montant),
        })),
      ),
      etatsDesLieux: this.etats.presenter(etatsDesLieux),
    };
  }

  private pourListe(
    sejour: Prisma.SejourLocatifGetPayload<{
      include: typeof sejourListInclude;
    }>,
  ) {
    const { paiements, ...reste } = sejour;
    return {
      ...reste,
      synthese: syntheseSejour(
        nombre(sejour.montantTotal),
        paiements.map((paiement) => ({ montant: nombre(paiement.montant) })),
      ),
    };
  }

  // --- Création et modification ---

  async create(dto: CreateSejourDto, user: LocatifUser) {
    const bien = await this.bienReservable(dto.bienLocatifId, user);
    const locataire = await this.prisma.locataire.findUnique({
      where: { id: dto.locataireId },
      select: { id: true },
    });
    if (!locataire) throw new BadRequestException('Voyageur introuvable');
    await this.options.assertSourceSejour(dto.source);

    const arrivee = jourUtc(dto.dateArrivee);
    const depart = jourUtc(dto.dateDepart);
    const voyageurs = dto.nombreVoyageurs ?? 1;
    const refus = verifierDemandeSejour(
      bien,
      { arrivee, depart, voyageurs },
      // MTM saisit aussi des séjours déjà commencés ou terminés.
      { autoriserPasse: true, maxNuits: 365 },
    );
    if (refus) throw new BadRequestException(refus);

    const tarif = this.tarif(bien, dto);
    const nuits = nombreNuits(arrivee, depart);
    const statut = dto.statut ?? 'confirmee';

    return this.enTransaction(async (transaction) => {
      if (statut === 'confirmee') {
        await this.assertLibre(transaction, bien.id, arrivee, depart);
      }
      const cree = await transaction.sejourLocatif.create({
        data: {
          referenceInterne: await this.nextReference(transaction),
          bienLocatifId: bien.id,
          locataireId: dto.locataireId,
          dateReservation: dto.dateReservation
            ? new Date(dto.dateReservation)
            : new Date(),
          dateArrivee: arrivee,
          dateDepart: depart,
          nuits,
          nombreVoyageurs: voyageurs,
          prixNuit: tarif.prixNuit,
          fraisMenage: tarif.fraisMenage,
          remise: tarif.remise,
          montantTotal: montantSejour({ nuits, ...tarif }),
          statut,
          source: dto.source ?? 'direct',
          notes: dto.notes?.trim() || null,
          cautionMontant: tarif.cautionMontant,
          createdById: user.id,
        },
        select: { id: true },
      });
      return cree;
    }).then((cree) => this.findOne(cree.id, user));
  }

  async update(id: string, dto: UpdateSejourDto, user: LocatifUser) {
    const sejour = await this.charger(id, user);
    if (!['demande', 'confirmee'].includes(sejour.statut)) {
      throw new BadRequestException(
        'Un séjour commencé, terminé ou annulé ne se modifie plus.',
      );
    }
    await this.options.assertSourceSejour(dto.source);
    const bien = sejour.bienLocatif;
    const arrivee = dto.dateArrivee
      ? jourUtc(dto.dateArrivee)
      : jourUtc(sejour.dateArrivee);
    const depart = dto.dateDepart
      ? jourUtc(dto.dateDepart)
      : jourUtc(sejour.dateDepart);
    const voyageurs = dto.nombreVoyageurs ?? sejour.nombreVoyageurs;
    const refus = verifierDemandeSejour(
      bien,
      { arrivee, depart, voyageurs },
      { autoriserPasse: true, maxNuits: 365 },
    );
    if (refus) throw new BadRequestException(refus);

    const prixNuit = dto.prixNuit ?? nombre(sejour.prixNuit);
    const fraisMenage = dto.fraisMenage ?? nombre(sejour.fraisMenage);
    const remise = dto.remise ?? nombre(sejour.remise);
    const nuits = nombreNuits(arrivee, depart);
    if (!(prixNuit > 0)) {
      throw new BadRequestException('Indiquez le prix de la nuit.');
    }

    await this.enTransaction(async (transaction) => {
      if (sejour.statut === 'confirmee') {
        await this.assertLibre(transaction, bien.id, arrivee, depart, id);
      }
      await transaction.sejourLocatif.update({
        where: { id },
        data: {
          dateArrivee: arrivee,
          dateDepart: depart,
          nuits,
          nombreVoyageurs: voyageurs,
          prixNuit,
          fraisMenage,
          remise,
          montantTotal: montantSejour({ nuits, prixNuit, fraisMenage, remise }),
          ...(dto.cautionMontant !== undefined
            ? { cautionMontant: dto.cautionMontant }
            : {}),
          ...(dto.source !== undefined ? { source: dto.source } : {}),
          ...(dto.notes !== undefined
            ? { notes: dto.notes.trim() || null }
            : {}),
        },
      });
    });
    return this.findOne(id, user);
  }

  async changerStatut(id: string, dto: TransitionSejourDto, user: LocatifUser) {
    const sejour = await this.charger(id, user);
    if (!TRANSITIONS[sejour.statut]?.includes(dto.statut)) {
      throw new BadRequestException(
        `Un séjour « ${sejour.statut} » ne peut pas passer à « ${dto.statut} ».`,
      );
    }
    await this.enTransaction(async (transaction) => {
      // Confirmer occupe le bien : on revérifie qu'aucune autre réservation ne
      // s'est confirmée entre-temps sur ces nuits.
      if (dto.statut === 'confirmee') {
        await this.assertLibre(
          transaction,
          sejour.bienLocatifId,
          jourUtc(sejour.dateArrivee),
          jourUtc(sejour.dateDepart),
          id,
        );
      }
      await transaction.sejourLocatif.update({
        where: { id },
        data: { statut: dto.statut },
      });
    });
    return this.findOne(id, user);
  }

  async annuler(id: string, dto: AnnulerSejourDto, user: LocatifUser) {
    const sejour = await this.charger(id, user);
    if (!['demande', 'confirmee'].includes(sejour.statut)) {
      throw new BadRequestException(
        sejour.statut === 'en_cours'
          ? 'Le voyageur est arrivé : terminez le séjour au lieu de l’annuler.'
          : 'Ce séjour ne peut plus être annulé.',
      );
    }
    await this.prisma.sejourLocatif.update({
      where: { id },
      data: {
        statut: 'annulee',
        annuleLe: new Date(),
        motifAnnulation: dto.motif.trim(),
      },
    });
    return this.findOne(id, user);
  }

  // --- Règlements ---

  async ajouterPaiement(
    id: string,
    dto: CreatePaiementSejourDto,
    user: LocatifUser,
  ) {
    const sejour = await this.charger(id, user);
    if (sejour.statut === 'annulee') {
      throw new BadRequestException('Ce séjour est annulé.');
    }
    await Promise.all([
      this.options.assertModePaiement(dto.mode),
      this.options.assertTypePaiementSejour(dto.type),
    ]);
    await this.periodes?.assertOuverte(
      dto.datePaiement ? new Date(dto.datePaiement) : new Date(),
    );
    const regle = await this.prisma.paiementSejour.aggregate({
      where: { sejourId: id },
      _sum: { montant: true },
    });
    const reste =
      Math.round(
        (nombre(sejour.montantTotal) - nombre(regle._sum.montant)) * 100,
      ) / 100;
    if (dto.montant > reste) {
      throw new BadRequestException(
        reste > 0
          ? `Ce règlement dépasse le reste à payer (${formaterMontant(reste)}).`
          : 'Ce séjour est déjà entièrement réglé.',
      );
    }
    await this.prisma.paiementSejour.create({
      data: {
        sejourId: id,
        datePaiement: dto.datePaiement
          ? new Date(dto.datePaiement)
          : new Date(),
        montant: dto.montant,
        // Un règlement qui solde le séjour est un solde, sinon un acompte.
        type: dto.type ?? (dto.montant >= reste ? 'solde' : 'acompte'),
        mode: dto.mode,
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
        createdById: user.id,
      },
    });
    return this.findOne(id, user);
  }

  async supprimerPaiement(id: string, paiementId: string, user: LocatifUser) {
    await this.charger(id, user);
    const paiement = await this.prisma.paiementSejour.findFirst({
      where: { id: paiementId, sejourId: id },
      select: { id: true, datePaiement: true },
    });
    if (!paiement) throw new NotFoundException('Règlement introuvable');
    await this.periodes?.assertOuverte(paiement.datePaiement);
    await this.prisma.paiementSejour.delete({ where: { id: paiementId } });
    return this.findOne(id, user);
  }

  // --- Caution ---

  async verserCaution(
    id: string,
    dto: VerserCautionSejourDto,
    user: LocatifUser,
  ) {
    const sejour = await this.charger(id, user);
    if (sejour.statut === 'annulee') {
      throw new BadRequestException('Ce séjour est annulé.');
    }
    if (sejour.cautionStatut !== 'non_versee') {
      throw new BadRequestException('La caution est déjà enregistrée.');
    }
    const montant = dto.montant ?? nombre(sejour.cautionMontant);
    if (!(montant > 0)) {
      throw new BadRequestException(
        'Indiquez le montant de la caution : ce séjour n’en prévoit pas.',
      );
    }
    await this.prisma.sejourLocatif.update({
      where: { id },
      data: {
        cautionMontant: montant,
        cautionStatut: 'versee',
        cautionVerseeLe: dto.date ? new Date(dto.date) : new Date(),
      },
    });
    return this.findOne(id, user);
  }

  /**
   * Rend la caution au voyageur, en retenant éventuellement une somme : la
   * retenue est toujours justifiée (dégradations constatées à l'état des lieux
   * de sortie, par exemple), jamais devinée.
   */
  async restituerCaution(
    id: string,
    dto: RestituerCautionSejourDto,
    user: LocatifUser,
  ) {
    const sejour = await this.charger(id, user);
    if (sejour.cautionStatut !== 'versee') {
      throw new BadRequestException(
        'Aucune caution à restituer sur ce séjour.',
      );
    }
    const caution = nombre(sejour.cautionMontant);
    const retenue = dto.retenue ?? 0;
    if (retenue > caution) {
      throw new BadRequestException(
        `La retenue dépasse la caution détenue (${formaterMontant(caution)}).`,
      );
    }
    if (retenue > 0 && !dto.justification?.trim()) {
      throw new BadRequestException(
        'Une retenue sur caution doit être justifiée.',
      );
    }
    await this.prisma.sejourLocatif.update({
      where: { id },
      data: {
        cautionStatut:
          retenue === 0
            ? 'restituee'
            : retenue >= caution
              ? 'retenue_totale'
              : 'partiellement_retenue',
        cautionRetenue: retenue,
        cautionJustification: dto.justification?.trim() || null,
        cautionRestitueeLe: dto.date ? new Date(dto.date) : new Date(),
      },
    });
    return this.findOne(id, user);
  }

  // --- Site public ---

  /** Nuits déjà prises : le voyageur voit les dates indisponibles, jamais le nom de qui les occupe. */
  async disponibilites(bienLocatifId: string): Promise<PeriodeBloquee[]> {
    const bien = await this.prisma.bienLocatif.findFirst({
      where: {
        id: bienLocatifId,
        publie: true,
        statut: 'disponible',
        modeLocation: 'courte_duree',
      },
      select: { id: true },
    });
    if (!bien) throw new NotFoundException('Annonce introuvable');
    const sejours = await this.prisma.sejourLocatif.findMany({
      where: {
        bienLocatifId,
        statut: { in: [...STATUTS_SEJOUR_BLOQUANTS] },
        dateDepart: { gt: jourUtc(new Date()) },
      },
      select: { dateArrivee: true, dateDepart: true },
      orderBy: { dateArrivee: 'asc' },
    });
    return sejours.map((sejour) => ({
      debut: formatJour(sejour.dateArrivee),
      fin: formatJour(sejour.dateDepart),
    }));
  }

  /**
   * Demande de séjour déposée sur le site. Elle ne bloque pas le calendrier :
   * seule la confirmation par MTM occupe les nuits. Une même demande répétée
   * (double clic, nouvel essai) ne crée pas de doublon.
   */
  async demandePublique(bienLocatifId: string, dto: DemandeSejourPublicDto) {
    const bien = await this.prisma.bienLocatif.findFirst({
      where: {
        id: bienLocatifId,
        publie: true,
        statut: 'disponible',
        modeLocation: 'courte_duree',
      },
      select: {
        id: true,
        referenceInterne: true,
        titre: true,
        type: true,
        prixNuit: true,
        fraisMenage: true,
        cautionSejour: true,
        nuitsMinimum: true,
        capaciteVoyageurs: true,
      },
    });
    if (!bien) throw new NotFoundException('Annonce introuvable');

    const arrivee = jourUtc(dto.dateArrivee);
    const depart = jourUtc(dto.dateDepart);
    const refus = verifierDemandeSejour(bien, {
      arrivee,
      depart,
      voyageurs: dto.nombreVoyageurs,
    });
    if (refus) throw new BadRequestException(refus);
    const prixNuit = nombre(bien.prixNuit);
    if (!(prixNuit > 0)) {
      throw new BadRequestException('Cette annonce n’a pas de tarif.');
    }

    const occupe = await this.prisma.sejourLocatif.findFirst({
      where: {
        bienLocatifId,
        statut: { in: [...STATUTS_SEJOUR_BLOQUANTS] },
        dateArrivee: { lt: depart },
        dateDepart: { gt: arrivee },
      },
      select: { id: true },
    });
    if (occupe) {
      throw new ConflictException(
        'Ces dates ne sont plus disponibles : choisissez-en d’autres.',
      );
    }

    const voyageur = await this.trouverOuCreerVoyageur(dto);
    const nuits = nombreNuits(arrivee, depart);
    const fraisMenage = nombre(bien.fraisMenage);
    const montantTotal = montantSejour({ nuits, prixNuit, fraisMenage });

    const existante = await this.prisma.sejourLocatif.findFirst({
      where: {
        bienLocatifId,
        locataireId: voyageur.id,
        statut: 'demande',
        dateArrivee: arrivee,
        dateDepart: depart,
      },
      select: { id: true, referenceInterne: true },
    });
    const sejour =
      existante ??
      (await this.enTransaction(async (transaction) =>
        transaction.sejourLocatif.create({
          data: {
            referenceInterne: await this.nextReference(transaction),
            bienLocatifId,
            locataireId: voyageur.id,
            dateArrivee: arrivee,
            dateDepart: depart,
            nuits,
            nombreVoyageurs: dto.nombreVoyageurs,
            prixNuit,
            fraisMenage,
            montantTotal,
            statut: 'demande',
            source: 'site',
            notes: dto.message?.trim() || null,
            cautionMontant: bien.cautionSejour,
          },
          select: { id: true, referenceInterne: true },
        }),
      ));

    if (!existante) {
      await this.notifications.notifierPermission('locatif:modifier', {
        type: 'sejour_demande',
        titre: 'Nouvelle demande de séjour',
        message: `${dto.prenom} ${dto.nom} — ${bien.titre ?? bien.type} du ${formatJour(arrivee)} au ${formatJour(depart)} (${nuits} nuit${nuits > 1 ? 's' : ''}, ${formaterMontant(montantTotal)}).`,
        lien: `/locatif/sejours/${sejour.id}`,
        entityType: 'SejourLocatif',
        entityId: sejour.id,
        dedupeKey: `sejour-demande:${sejour.id}`,
      });
    }
    return {
      reference: sejour.referenceInterne,
      nuits,
      prixNuit,
      fraisMenage,
      montantTotal,
      cautionMontant: bien.cautionSejour ? nombre(bien.cautionSejour) : null,
    };
  }

  // --- internes ---

  /** Le séjour et son bien, dans le périmètre de l'utilisateur. */
  private async charger(id: string, user: LocatifUser) {
    const sejour = await this.prisma.sejourLocatif.findFirst({
      where: { id, bienLocatif: this.access.ownershipFilter(user) },
      include: {
        bienLocatif: {
          select: { id: true, nuitsMinimum: true, capaciteVoyageurs: true },
        },
      },
    });
    if (!sejour) throw new NotFoundException('Séjour introuvable');
    return sejour;
  }

  private async bienReservable(bienLocatifId: string, user: LocatifUser) {
    const bien = await this.prisma.bienLocatif.findFirst({
      where: { id: bienLocatifId, ...this.access.ownershipFilter(user) },
      select: {
        id: true,
        modeLocation: true,
        prixNuit: true,
        fraisMenage: true,
        cautionSejour: true,
        nuitsMinimum: true,
        capaciteVoyageurs: true,
      },
    });
    if (!bien) throw new NotFoundException('Bien locatif introuvable');
    if (bien.modeLocation !== 'courte_duree') {
      throw new BadRequestException(
        'Ce bien est loué au mois : créez un bail. Pour des séjours à la nuit, passez-le en « courte durée ».',
      );
    }
    return bien;
  }

  /** Prix, ménage, remise et caution : ceux du séjour s'ils sont donnés, sinon ceux du bien. */
  private tarif(
    bien: {
      prixNuit: Prisma.Decimal | null;
      fraisMenage: Prisma.Decimal | null;
      cautionSejour: Prisma.Decimal | null;
    },
    dto: {
      prixNuit?: number;
      fraisMenage?: number;
      remise?: number;
      cautionMontant?: number;
    },
  ) {
    const prixNuit = dto.prixNuit ?? nombre(bien.prixNuit);
    if (!(prixNuit > 0)) {
      throw new BadRequestException(
        'Indiquez le prix de la nuit : le bien n’a pas de tarif.',
      );
    }
    return {
      prixNuit,
      fraisMenage: dto.fraisMenage ?? nombre(bien.fraisMenage),
      remise: dto.remise ?? 0,
      cautionMontant:
        dto.cautionMontant ??
        (bien.cautionSejour === null ? null : nombre(bien.cautionSejour)),
    };
  }

  /** Aucun autre séjour confirmé ou en cours ne doit occuper ces nuits. */
  private async assertLibre(
    transaction: PrismaTransaction,
    bienLocatifId: string,
    arrivee: Date,
    depart: Date,
    sauf?: string,
  ): Promise<void> {
    const conflit = await transaction.sejourLocatif.findFirst({
      where: {
        bienLocatifId,
        statut: { in: [...STATUTS_SEJOUR_BLOQUANTS] },
        dateArrivee: { lt: depart },
        dateDepart: { gt: arrivee },
        ...(sauf ? { id: { not: sauf } } : {}),
      },
      select: {
        referenceInterne: true,
        dateArrivee: true,
        dateDepart: true,
      },
    });
    if (conflit) {
      throw new ConflictException(
        `Ce bien est déjà réservé du ${formatJour(conflit.dateArrivee)} au ${formatJour(conflit.dateDepart)} (${conflit.referenceInterne}).`,
      );
    }
  }

  /** Retrouve le voyageur par son téléphone ou son e-mail, sinon crée sa fiche. */
  private async trouverOuCreerVoyageur(dto: DemandeSejourPublicDto) {
    const telephone = dto.telephone.replace(/\s+/g, '');
    const email = dto.email?.trim().toLowerCase();
    const existant = await this.prisma.locataire.findFirst({
      where: {
        OR: [
          { phone: telephone },
          ...(email
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    if (existant) return existant;
    return this.prisma.locataire.create({
      data: {
        firstName: dto.prenom.trim(),
        lastName: dto.nom.trim(),
        phone: telephone,
        email: email || null,
        notes: 'Voyageur : demande reçue depuis le site',
      },
      select: { id: true },
    });
  }

  private async nextReference(transaction: PrismaTransaction): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = `SJ-${annee}-`;
    const emises = await transaction.sejourLocatif.count({
      where: { referenceInterne: { startsWith: prefixe } },
    });
    for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
      const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
      const prise = await transaction.sejourLocatif.findUnique({
        where: { referenceInterne: candidate },
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new ConflictException(
      'Impossible d’attribuer une référence de séjour, réessayez',
    );
  }

  /**
   * Sérialisable : deux collaborateurs (ou un visiteur et un collaborateur) qui
   * confirment en même temps les mêmes nuits ne peuvent pas réussir tous les deux.
   *
   * Un conflit de sérialisation n'est pas toujours un vrai conflit : deux demandes
   * sur des biens différents, ou des nuits différentes, se gênent aussi à l'attribution
   * de la référence. On réessaie donc quelques fois ; au second passage, la base voit
   * la première opération et le contrôle des nuits répond lui-même (« déjà réservé »).
   */
  private async enTransaction<T>(
    operation: (transaction: PrismaTransaction) => Promise<T>,
  ): Promise<T> {
    const ESSAIS = 4;
    for (let essai = 1; ; essai += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const conflit =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!conflit) throw error;
        if (essai >= ESSAIS) {
          throw new ConflictException(
            'Cette opération est en conflit avec une autre en cours, réessayez',
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 40 * essai));
      }
    }
  }
}
