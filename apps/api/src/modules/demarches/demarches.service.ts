import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  DemarchesAccessService,
  type DemarchesUser,
} from './demarches-access.service';
import {
  DemarchesOptionsService,
  MISSION_STATUTS_TERMINES,
} from './demarches-options.service';
import {
  CreateMissionDto,
  QueryMissionDto,
  TransitionMissionDto,
  UpdateMissionDto,
} from './dto/mission.dto';

const missionListInclude = {
  prospect: {
    select: { id: true, nom: true, prenom: true, email: true, telephone: true },
  },
  terrain: {
    select: {
      id: true,
      nom: true,
      referenceInterne: true,
      commune: true,
      region: true,
    },
  },
  responsable: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { etapes: true, documents: true } },
} satisfies Prisma.MissionVerificationInclude;

const missionInclude = {
  ...missionListInclude,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  etapes: {
    orderBy: { realiseeLe: 'asc' as const },
    include: {
      realiseePar: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.MissionVerificationInclude;

/**
 * Missions de vérification foncière (J2.2, section 14 du cahier des charges).
 *
 * Une mission avance en cinq étapes — demande, étude de faisabilité,
 * vérification physique, vérification administrative, rapport — et chacune
 * laisse une trace datée et signée. Le module ne décide rien de commercial :
 * il constate, documente et conclut.
 */
@Injectable()
export class DemarchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DemarchesAccessService,
    private readonly options: DemarchesOptionsService,
  ) {}

  async findAll(query: QueryMissionDto, user: DemarchesUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const contains = (valeur: string) => ({
      contains: valeur,
      mode: 'insensitive' as const,
    });

    const where: Prisma.MissionVerificationWhereInput = {
      ...this.access.ownershipFilter(user),
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.typeVerification
        ? { typeVerification: query.typeVerification }
        : {}),
      ...(query.urgence ? { urgence: query.urgence } : {}),
      ...(query.responsableId ? { responsableId: query.responsableId } : {}),
      ...(query.prospectId ? { prospectId: query.prospectId } : {}),
      ...(search
        ? {
            OR: [
              { referenceInterne: contains(search) },
              { localisation: contains(search) },
              { commune: contains(search) },
              { prospect: { nom: contains(search) } },
              { prospect: { prenom: contains(search) } },
              { terrain: { referenceInterne: contains(search) } },
            ],
          }
        : {}),
      ...this.vueFilter(query.vue),
    };

    const [items, total] = await Promise.all([
      this.prisma.missionVerification.findMany({
        where,
        include: missionListInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.missionVerification.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * Vues rapides de l'équipe démarches : ce qui tourne, ce qui a dépassé sa
   * date, ce que personne ne porte, et ce qui attend son rapport.
   */
  private vueFilter(vue?: string): Prisma.MissionVerificationWhereInput {
    if (!vue) return {};
    const enCours: Prisma.MissionVerificationWhereInput = {
      statut: { notIn: [...MISSION_STATUTS_TERMINES] },
    };
    switch (vue) {
      case 'en_cours':
        return enCours;
      case 'en_retard':
        return { ...enCours, dateEcheance: { lt: new Date() } };
      case 'sans_responsable':
        return { ...enCours, responsableId: null };
      case 'a_rapporter':
        return { statut: 'rapport', decision: null };
      default:
        return {};
    }
  }

  async findOne(id: string, user: DemarchesUser) {
    await this.access.ensureAccessible(id, user);
    const mission = await this.prisma.missionVerification.findUnique({
      where: { id },
      include: missionInclude,
    });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return mission;
  }

  async create(dto: CreateMissionDto, user: DemarchesUser) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: dto.prospectId },
      select: { id: true },
    });
    if (!prospect) throw new BadRequestException('Client introuvable');
    if (dto.terrainId) await this.assertTerrain(dto.terrainId);
    await Promise.all([
      this.options.assertTypeVerification(dto.typeVerification),
      this.options.assertUrgence(dto.urgence),
      this.options.assertStatut(dto.statut),
    ]);
    const responsableId = await this.access.resolveResponsable(
      dto.responsableId,
      user,
    );

    return this.prisma.missionVerification.create({
      data: {
        referenceInterne: await this.nextReference(),
        prospectId: dto.prospectId,
        terrainId: dto.terrainId ?? null,
        typeVerification: dto.typeVerification,
        objectif: dto.objectif,
        localisation: dto.localisation,
        region: dto.region,
        commune: dto.commune,
        latitude: dto.latitude,
        longitude: dto.longitude,
        piecesFournies: dto.piecesFournies,
        urgence: dto.urgence ?? 'normale',
        budgetAnnonce: dto.budgetAnnonce,
        dateDemande: dto.dateDemande ? new Date(dto.dateDemande) : new Date(),
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : null,
        statut: dto.statut ?? 'demande',
        responsableId,
        createdById: user.id,
      },
      include: missionInclude,
    });
  }

  async update(id: string, dto: UpdateMissionDto, user: DemarchesUser) {
    await this.access.ensureAccessible(id, user);
    if (dto.terrainId) await this.assertTerrain(dto.terrainId);
    await Promise.all([
      this.options.assertTypeVerification(dto.typeVerification),
      this.options.assertUrgence(dto.urgence),
      this.options.assertConclusionFaisabilite(dto.faisabiliteConclusion),
      this.options.assertDecision(dto.decision),
      this.options.assertModePaiement(dto.modePaiement),
    ]);
    const responsableId =
      dto.responsableId === undefined
        ? undefined
        : await this.access.resolveResponsable(dto.responsableId, user);

    return this.prisma.missionVerification.update({
      where: { id },
      data: {
        ...(dto.terrainId !== undefined ? { terrainId: dto.terrainId } : {}),
        ...(dto.typeVerification !== undefined
          ? { typeVerification: dto.typeVerification }
          : {}),
        ...(dto.objectif !== undefined ? { objectif: dto.objectif } : {}),
        ...(dto.localisation !== undefined
          ? { localisation: dto.localisation }
          : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.commune !== undefined ? { commune: dto.commune } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.piecesFournies !== undefined
          ? { piecesFournies: dto.piecesFournies }
          : {}),
        ...(dto.urgence !== undefined ? { urgence: dto.urgence } : {}),
        ...(dto.budgetAnnonce !== undefined
          ? { budgetAnnonce: dto.budgetAnnonce }
          : {}),
        ...(dto.dateEcheance !== undefined
          ? {
              dateEcheance: dto.dateEcheance
                ? new Date(dto.dateEcheance)
                : null,
            }
          : {}),
        ...(responsableId !== undefined ? { responsableId } : {}),
        ...(dto.faisabiliteConclusion !== undefined
          ? { faisabiliteConclusion: dto.faisabiliteConclusion }
          : {}),
        ...(dto.faisabiliteNotes !== undefined
          ? { faisabiliteNotes: dto.faisabiliteNotes }
          : {}),
        ...(dto.montantDevis !== undefined
          ? { montantDevis: dto.montantDevis }
          : {}),
        ...(dto.fraisEtude !== undefined ? { fraisEtude: dto.fraisEtude } : {}),
        ...(dto.montantPaye !== undefined
          ? { montantPaye: dto.montantPaye }
          : {}),
        ...(dto.modePaiement !== undefined
          ? { modePaiement: dto.modePaiement }
          : {}),
        ...(dto.referencePaiement !== undefined
          ? { referencePaiement: dto.referencePaiement }
          : {}),
        ...(dto.decision !== undefined ? { decision: dto.decision } : {}),
        ...(dto.conclusion !== undefined ? { conclusion: dto.conclusion } : {}),
        ...(dto.reserves !== undefined ? { reserves: dto.reserves } : {}),
        ...(dto.recommandation !== undefined
          ? { recommandation: dto.recommandation }
          : {}),
        ...(dto.visibleClient !== undefined
          ? { visibleClient: dto.visibleClient }
          : {}),
      },
      include: missionInclude,
    });
  }

  /**
   * Changement d'étape. Deux règles tenues par le métier : on ne rédige pas
   * un rapport sans avoir rien vérifié, et on ne clôture pas sans décision —
   * un dossier clos sans conclusion n'a aucune valeur pour le client.
   */
  async transition(id: string, dto: TransitionMissionDto, user: DemarchesUser) {
    await this.access.ensureAccessible(id, user);
    await this.options.assertStatut(dto.statut);
    const mission = await this.prisma.missionVerification.findUnique({
      where: { id },
      select: {
        statut: true,
        decision: true,
        conclusion: true,
        _count: { select: { etapes: true } },
      },
    });
    if (!mission) throw new NotFoundException('Mission introuvable');

    if (dto.statut === 'rapport' && mission._count.etapes === 0) {
      throw new BadRequestException(
        'Aucune vérification enregistrée : renseignez au moins une visite ou une administration consultée avant le rapport',
      );
    }
    if (dto.statut === 'cloturee' && !mission.decision) {
      throw new BadRequestException(
        'Indiquez la décision de MTM (favorable, défavorable ou à compléter) avant de clôturer la mission',
      );
    }
    if (dto.statut === 'abandonnee' && !dto.justification?.trim()) {
      throw new BadRequestException(
        'Une mission abandonnée doit porter son motif',
      );
    }

    return this.prisma.missionVerification.update({
      where: { id },
      data: {
        statut: dto.statut,
        ...(dto.statut === 'abandonnee' && dto.justification
          ? { conclusion: dto.justification.trim() }
          : {}),
      },
      include: missionInclude,
    });
  }

  async remove(id: string, user: DemarchesUser) {
    await this.access.ensureAccessible(id, user);
    await this.prisma.missionVerification.delete({ where: { id } });
  }

  /**
   * Indicateurs du service : ce qui tourne, ce qui traîne, et le chiffre
   * facturé. Périmètre de l'utilisateur, comme la liste.
   */
  async getStats(user: DemarchesUser) {
    const perimetre = this.access.ownershipFilter(user);
    const enCours: Prisma.MissionVerificationWhereInput = {
      ...perimetre,
      statut: { notIn: [...MISSION_STATUTS_TERMINES] },
    };

    const [parStatut, total, aPlanifier, enRetard, sansResponsable, montants] =
      await Promise.all([
        this.prisma.missionVerification.groupBy({
          by: ['statut'],
          where: perimetre,
          _count: { statut: true },
        }),
        this.prisma.missionVerification.count({ where: perimetre }),
        this.prisma.missionVerification.count({
          where: { ...perimetre, statut: 'demande' },
        }),
        this.prisma.missionVerification.count({
          where: { ...enCours, dateEcheance: { lt: new Date() } },
        }),
        this.prisma.missionVerification.count({
          where: { ...enCours, responsableId: null },
        }),
        this.prisma.missionVerification.aggregate({
          where: perimetre,
          _sum: { montantDevis: true, montantPaye: true },
        }),
      ]);

    const parEtape = parStatut.reduce<Record<string, number>>((acc, ligne) => {
      acc[ligne.statut] = ligne._count.statut;
      return acc;
    }, {});
    const compte = (statut: string) => parEtape[statut] ?? 0;
    const cloturees = compte('cloturee');
    const abandonnees = compte('abandonnee');
    const terminees = cloturees + abandonnees;

    return {
      total,
      aPlanifier,
      enCours: total - terminees,
      enRetard,
      sansResponsable,
      cloturees,
      abandonnees,
      montantDevis: Number(montants._sum.montantDevis ?? 0),
      montantEncaisse: Number(montants._sum.montantPaye ?? 0),
      // Part des missions menées à leur terme, hors abandons : c'est la
      // mesure de service, pas une mesure commerciale.
      tauxAboutissement:
        terminees > 0 ? Math.round((cloturees / terminees) * 100) : 0,
      parEtape,
    };
  }

  /**
   * Référence lisible d'une mission : `V-2026-0007`. Même principe que les
   * prospects — le rang repart du nombre de références émises dans l'année
   * et avance tant que la référence est prise.
   */
  private async nextReference(): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = `V-${annee}-`;
    const emises = await this.prisma.missionVerification.count({
      where: { referenceInterne: { startsWith: prefixe } },
    });
    for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
      const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
      const prise = await this.prisma.missionVerification.findUnique({
        where: { referenceInterne: candidate },
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new ConflictException(
      'Impossible d’attribuer une référence de mission, réessayez',
    );
  }

  private async assertTerrain(terrainId: string): Promise<void> {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id: terrainId },
      select: { id: true },
    });
    if (!terrain) throw new BadRequestException('Terrain introuvable');
  }
}
