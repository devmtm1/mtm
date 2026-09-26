import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import {
  ConstructionAccessService,
  type ConstructionUser,
} from './construction-access.service';
import {
  CONSTRUCTION_DEFAULTS,
  ConstructionOptionsService,
} from './construction-options.service';
import {
  STATUTS_CHANTIER_TERMINES,
  synchroniserChantier,
} from './chantier.helper';
import {
  CreateProjetDto,
  QueryProjetDto,
  TransitionProjetDto,
  UpdateProjetDto,
} from './dto/projet.dto';

const projetListInclude = {
  client: {
    select: { id: true, nom: true, prenom: true, email: true, telephone: true },
  },
  terrain: {
    select: { id: true, nom: true, referenceInterne: true, commune: true },
  },
  responsable: { select: { id: true, firstName: true, lastName: true } },
  _count: {
    select: {
      jalons: true,
      journal: true,
      intervenants: true,
      documents: true,
    },
  },
} satisfies Prisma.ProjetConstructionInclude;

const projetInclude = {
  ...projetListInclude,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  jalons: {
    orderBy: [{ ordre: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  intervenants: { orderBy: { createdAt: 'asc' as const } },
  lignesBudget: {
    orderBy: [{ poste: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  depenses: {
    orderBy: { date: 'desc' as const },
    include: {
      intervenant: { select: { id: true, nom: true, metier: true } },
      ligneBudget: { select: { id: true, libelle: true, poste: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      validatedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.ProjetConstructionInclude;

/**
 * Projets de construction et suivi de chantier (J2.3, section 16 du cahier
 * des charges).
 *
 * Un chantier se pilote par trois choses : où en est le planning, où en est
 * le budget, et ce qui s'est passé sur place. Le service tient les deux
 * premières à jour automatiquement — l'avancement et la consommation sont
 * recalculés à chaque mouvement — pour que la troisième, le journal, reste
 * la seule chose que le conducteur de travaux ait à saisir.
 */
@Injectable()
export class ProjetsConstructionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ConstructionAccessService,
    private readonly options: ConstructionOptionsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(query: QueryProjetDto, user: ConstructionUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const contains = (valeur: string) => ({
      contains: valeur,
      mode: 'insensitive' as const,
    });

    const where: Prisma.ProjetConstructionWhereInput = {
      ...this.access.ownershipFilter(user),
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.typeProjet ? { typeProjet: query.typeProjet } : {}),
      ...(query.situationAlerte
        ? { situationAlerte: query.situationAlerte }
        : {}),
      ...(query.responsableId ? { responsableId: query.responsableId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(search
        ? {
            OR: [
              { referenceInterne: contains(search) },
              { intitule: contains(search) },
              { adresse: contains(search) },
              { commune: contains(search) },
              { client: { nom: contains(search) } },
              { client: { prenom: contains(search) } },
              { terrain: { referenceInterne: contains(search) } },
            ],
          }
        : {}),
      ...this.vueFilter(query.vue),
    };

    const [items, total] = await Promise.all([
      this.prisma.projetConstruction.findMany({
        where,
        include: projetListInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.projetConstruction.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * Vues rapides du service construction : ce qui tourne, ce qui dérape sur
   * les délais, ce qui dérape sur l'argent, et ce que personne ne porte.
   */
  private vueFilter(vue?: string): Prisma.ProjetConstructionWhereInput {
    if (!vue) return {};
    const actifs: Prisma.ProjetConstructionWhereInput = {
      statut: { notIn: [...STATUTS_CHANTIER_TERMINES] },
    };
    switch (vue) {
      case 'en_cours':
        return actifs;
      case 'en_retard':
        return {
          ...actifs,
          situationAlerte: { in: ['retard', 'retard_et_depassement'] },
        };
      case 'budget_depasse':
        return {
          ...actifs,
          situationAlerte: {
            in: ['depassement_budget', 'retard_et_depassement'],
          },
        };
      case 'sans_responsable':
        return { ...actifs, responsableId: null };
      case 'a_receptionner':
        return { statut: 'en_cours', avancement: { gte: 100 } };
      default:
        return {};
    }
  }

  /** Indicateurs de tête de liste, calculés sur le périmètre de l'utilisateur. */
  async stats(user: ConstructionUser) {
    const perimetre = this.access.ownershipFilter(user);
    const actifs = {
      ...perimetre,
      statut: { notIn: [...STATUTS_CHANTIER_TERMINES] },
    };

    const [parStatut, parAlerte, enCours, budgets, problemes] =
      await Promise.all([
        this.prisma.projetConstruction.groupBy({
          by: ['statut'],
          where: perimetre,
          _count: { _all: true },
        }),
        this.prisma.projetConstruction.groupBy({
          by: ['situationAlerte'],
          where: actifs,
          _count: { _all: true },
        }),
        this.prisma.projetConstruction.aggregate({
          where: actifs,
          _count: { _all: true },
          _avg: { avancement: true },
        }),
        this.prisma.projetConstruction.aggregate({
          where: actifs,
          _sum: {
            montantDevis: true,
            budgetPrevu: true,
            montantDepense: true,
            montantEngage: true,
          },
        }),
        this.prisma.entreeJournalChantier.count({
          where: { resolu: false, projet: actifs },
        }),
      ]);

    return {
      parStatut: Object.fromEntries(
        parStatut.map((ligne) => [ligne.statut, ligne._count._all]),
      ),
      parAlerte: Object.fromEntries(
        parAlerte.map((ligne) => [ligne.situationAlerte, ligne._count._all]),
      ),
      chantiersActifs: enCours._count._all,
      avancementMoyen: Math.round(enCours._avg.avancement ?? 0),
      montantDevis: Number(budgets._sum.montantDevis ?? 0),
      budgetPrevu: Number(budgets._sum.budgetPrevu ?? 0),
      montantEngage: Number(budgets._sum.montantEngage ?? 0),
      montantDepense: Number(budgets._sum.montantDepense ?? 0),
      problemesOuverts: problemes,
    };
  }

  /**
   * Fiche complète : le chantier, son planning, son budget et ses pièces.
   * Le journal est paginé à part — un chantier d'un an en compte trois cents
   * entrées, qu'on ne charge pas pour afficher un en-tête.
   */
  async findOne(id: string, user: ConstructionUser) {
    await this.access.ensureAccessible(id, user);
    const projet = await this.prisma.projetConstruction.findUnique({
      where: { id },
      include: projetInclude,
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');

    const reglages = await this.options.getReglages();
    const synthese = await this.prisma.$transaction((tx) =>
      synchroniserChantier(tx, id, {
        seuilPourcent: reglages.seuilAlerteBudget,
        horizonJours: reglages.horizonEcheanceJours,
      }),
    );

    return {
      ...this.avecLiens(projet),
      // Les montants viennent d'être réécrits : on rend les valeurs à jour
      // plutôt que celles lues juste avant la synchronisation.
      avancement: synthese.avancement.pourcentage,
      montantEngage: synthese.budget.montantEngage,
      montantDepense: synthese.budget.montantDepense,
      situationAlerte: synthese.alertes.situation,
      synthese,
    };
  }

  async create(dto: CreateProjetDto, user: ConstructionUser) {
    const client = await this.prisma.prospect.findUnique({
      where: { id: dto.clientId },
      select: { id: true },
    });
    if (!client) throw new BadRequestException('Client introuvable');
    if (dto.terrainId) await this.assertTerrain(dto.terrainId);
    await this.options.assertTypeProjet(dto.typeProjet);
    this.assertPeriode(dto.dateDebutPrevue, dto.dateFinPrevue);

    const responsableId = await this.access.resolveResponsable(
      dto.responsableId,
      user,
    );

    const projet = await this.prisma.projetConstruction.create({
      data: {
        referenceInterne: await this.nextReference(),
        clientId: dto.clientId,
        terrainId: dto.terrainId ?? null,
        intitule: dto.intitule,
        typeProjet: dto.typeProjet,
        programme: dto.programme,
        adresse: dto.adresse,
        commune: dto.commune,
        region: dto.region,
        latitude: dto.latitude,
        longitude: dto.longitude,
        surfaceBatie: dto.surfaceBatie,
        nombreNiveaux: dto.nombreNiveaux,
        montantDevis: dto.montantDevis,
        budgetPrevu: dto.budgetPrevu,
        dateDebutPrevue: dto.dateDebutPrevue
          ? new Date(dto.dateDebutPrevue)
          : null,
        dateFinPrevue: dto.dateFinPrevue ? new Date(dto.dateFinPrevue) : null,
        // Tout chantier démarre en préparation : les travaux ne commencent
        // qu'en passant par transition(), qui date le démarrage réel.
        statut: 'prepare',
        responsableId,
        createdById: user.id,
        notes: dto.notes,
        ...(dto.avecJalonsType
          ? {
              jalons: {
                create: (await this.options.getOptions()).jalonsType.map(
                  (libelle, index) => ({
                    libelle,
                    ordre: index,
                  }),
                ),
              },
            }
          : {}),
      },
      include: projetInclude,
    });
    return this.avecLiens(projet);
  }

  async update(id: string, dto: UpdateProjetDto, user: ConstructionUser) {
    await this.access.ensureAccessible(id, user);
    if (dto.terrainId) await this.assertTerrain(dto.terrainId);
    await this.options.assertTypeProjet(dto.typeProjet);
    this.assertPeriode(dto.dateDebutPrevue, dto.dateFinPrevue);

    const responsableId =
      dto.responsableId === undefined
        ? undefined
        : await this.access.resolveResponsable(dto.responsableId, user);

    await this.prisma.projetConstruction.update({
      where: { id },
      data: {
        ...(dto.terrainId !== undefined ? { terrainId: dto.terrainId } : {}),
        ...(dto.intitule !== undefined ? { intitule: dto.intitule } : {}),
        ...(dto.typeProjet !== undefined ? { typeProjet: dto.typeProjet } : {}),
        ...(dto.programme !== undefined ? { programme: dto.programme } : {}),
        ...(dto.adresse !== undefined ? { adresse: dto.adresse } : {}),
        ...(dto.commune !== undefined ? { commune: dto.commune } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.surfaceBatie !== undefined
          ? { surfaceBatie: dto.surfaceBatie }
          : {}),
        ...(dto.nombreNiveaux !== undefined
          ? { nombreNiveaux: dto.nombreNiveaux }
          : {}),
        ...(dto.montantDevis !== undefined
          ? { montantDevis: dto.montantDevis }
          : {}),
        ...(dto.budgetPrevu !== undefined
          ? { budgetPrevu: dto.budgetPrevu }
          : {}),
        ...this.dateFacultative('dateDebutPrevue', dto.dateDebutPrevue),
        ...this.dateFacultative('dateFinPrevue', dto.dateFinPrevue),
        ...this.dateFacultative('dateDebutReelle', dto.dateDebutReelle),
        ...this.dateFacultative('dateFinReelle', dto.dateFinReelle),
        ...(dto.avancement !== undefined ? { avancement: dto.avancement } : {}),
        ...(responsableId !== undefined ? { responsableId } : {}),
        ...(dto.visibleClient !== undefined
          ? { visibleClient: dto.visibleClient }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    return this.findOne(id, user);
  }

  /**
   * Changement de statut du chantier.
   *
   * Trois règles tenues par le métier : on ne réceptionne pas un chantier
   * dont le planning n'est pas soldé, une réception et une clôture relèvent
   * de la validation (section 24), et un chantier qui démarre date son
   * démarrage réel — sans quoi aucun retard ne serait jamais mesurable.
   */
  async transition(
    id: string,
    dto: TransitionProjetDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(id, user);
    await this.options.assertStatut(dto.statut);

    const projet = await this.prisma.projetConstruction.findUnique({
      where: { id },
      select: { id: true, statut: true, dateDebutReelle: true },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');

    const valide = user.permissions?.includes('construction:valider') ?? false;
    if ((dto.statut === 'receptionne' || dto.statut === 'cloture') && !valide) {
      throw new ForbiddenException(
        'La réception et la clôture d’un chantier relèvent de la validation (construction:valider)',
      );
    }

    if (dto.statut === 'receptionne') {
      const restants = await this.prisma.jalonChantier.count({
        where: {
          projetId: id,
          statut: { notIn: ['termine', 'annule'] },
        },
      });
      if (restants > 0) {
        throw new BadRequestException(
          `Réception impossible : ${restants} jalon(s) du planning ne sont ni terminés ni annulés`,
        );
      }
    }

    const date = dto.date ? new Date(dto.date) : new Date();
    await this.prisma.projetConstruction.update({
      where: { id },
      data: {
        statut: dto.statut,
        // Le démarrage et la réception datent le chantier une seule fois :
        // repasser par « en_cours » après une suspension ne réécrit pas la
        // date d'origine, sinon le retard repartirait de zéro.
        ...(dto.statut === 'en_cours' && !projet.dateDebutReelle
          ? { dateDebutReelle: date }
          : {}),
        ...(dto.statut === 'receptionne' ? { dateFinReelle: date } : {}),
        ...(dto.motif ? { notes: dto.motif } : {}),
      },
    });

    return this.findOne(id, user);
  }

  async remove(id: string, user: ConstructionUser): Promise<void> {
    await this.access.ensureAccessible(id, user);
    const depenses = await this.prisma.depenseChantier.count({
      where: { projetId: id, statut: 'valide' },
    });
    if (depenses > 0) {
      throw new ConflictException(
        'Ce chantier porte des dépenses validées : il s’archive (statut « abandonné »), il ne se supprime pas',
      );
    }
    await this.prisma.projetConstruction.delete({ where: { id } });
  }

  /**
   * Lien de téléchargement des pièces : sans lui, un collaborateur voit
   * qu'un plan existe mais ne peut pas l'ouvrir.
   */
  private avecLiens<
    T extends {
      documents: Array<{ storageKey: string; resourceType: string }>;
    },
  >(projet: T) {
    return {
      ...projet,
      documents: projet.documents.map(({ storageKey, ...document }) => ({
        ...document,
        secureUrl: this.cloudinary.url(
          storageKey,
          document.resourceType,
          false,
        ),
      })),
    };
  }

  /** `null` efface la date, `undefined` la laisse telle quelle. */
  private dateFacultative(champ: string, valeur: string | null | undefined) {
    if (valeur === undefined) return {};
    return { [champ]: valeur ? new Date(valeur) : null };
  }

  /** Une fin de travaux avant leur début ne veut rien dire. */
  private assertPeriode(debut?: string | null, fin?: string | null): void {
    if (!debut || !fin) return;
    if (new Date(fin) < new Date(debut)) {
      throw new BadRequestException(
        'La fin prévue du chantier ne peut pas précéder son début',
      );
    }
  }

  private async assertTerrain(terrainId: string): Promise<void> {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id: terrainId },
      select: { id: true },
    });
    if (!terrain) throw new BadRequestException('Terrain introuvable');
  }

  /** Référence lisible attribuée à la création : C-2026-0004. */
  private async nextReference(): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = `C-${annee}-`;
    const emises = await this.prisma.projetConstruction.count({
      where: { referenceInterne: { startsWith: prefixe } },
    });
    for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
      const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
      const prise = await this.prisma.projetConstruction.findUnique({
        where: { referenceInterne: candidate },
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new ConflictException(
      'Impossible d’attribuer une référence de chantier, réessayez',
    );
  }

  /** Référentiels des écrans, plus la liste des jalons proposés. */
  getOptions() {
    return this.options.getOptions();
  }

  /** Jalons proposés par défaut, exposés pour les tests et le back-office. */
  static get jalonsTypeParDefaut(): readonly string[] {
    return CONSTRUCTION_DEFAULTS.jalonsType;
  }
}
