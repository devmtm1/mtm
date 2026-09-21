import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { nextProspectReference } from './prospect-reference';
import { CrmAccessService, type CrmUser } from './crm-access.service';
import {
  CrmOptionsService,
  isActiveStage,
  PIPELINE_CLOSED_STAGES,
  PIPELINE_EXIT_STAGES,
} from './crm-options.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';

const prospectInclude = {
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  activites: {
    orderBy: { dateEcheance: 'asc' as const },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
  },
  visites: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      terrain: {
        select: {
          id: true,
          referenceInterne: true,
          nom: true,
          region: true,
          commune: true,
          superficie: true,
          prixPublic: true,
          statutJuridique: true,
          statutCommercial: true,
        },
      },
      accompagnateur: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  terrainChoisi: {
    select: { id: true, referenceInterne: true, nom: true, prixPublic: true },
  },
  dossiers: {
    include: {
      terrain: { select: { id: true, referenceInterne: true, nom: true } },
      mandat: { select: { id: true, referenceInterne: true } },
    },
  },
  _count: {
    select: { activites: true, documents: true, dossiers: true, visites: true },
  },
} as const;

/**
 * La liste n'a pas besoin de tout l'historique : seulement le commercial,
 * les compteurs et la prochaine action à faire (colonne « Prochaine action »).
 */
const prospectListInclude = {
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  activites: {
    where: { statut: 'a_faire' },
    orderBy: { dateEcheance: 'asc' as const },
    take: 1,
  },
  _count: {
    select: { activites: true, documents: true, dossiers: true, visites: true },
  },
} as const;

/**
 * Fiche prospect et pipeline commercial (J1.5, section 13 CDC) : recherche,
 * consultation, création, mise à jour, affectation, transitions de pipeline
 * et conversion d'un contact public en prospect.
 */
@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CrmAccessService,
    private readonly options: CrmOptionsService,
  ) {}

  async findAll(query: QueryProspectDto, user: CrmUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const isManager = this.access.isManager(user);

    const where: Prisma.ProspectWhereInput = {
      ...(search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' as const } },
              { prenom: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { telephone: { contains: search, mode: 'insensitive' as const } },
              {
                referenceInterne: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(!isManager ? { commercialResponsableId: user.id } : {}),
      ...(query.commercialResponsableId
        ? { commercialResponsableId: query.commercialResponsableId }
        : {}),
      ...(query.statutPipeline ? { statutPipeline: query.statutPipeline } : {}),
      ...(query.sourceAcquisition
        ? { sourceAcquisition: query.sourceAcquisition }
        : {}),
      ...(query.zoneRecherchee
        ? {
            zoneRecherchee: {
              contains: query.zoneRecherchee,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.niveauInteret ? { niveauInteret: query.niveauInteret } : {}),
      ...this.vueFilter(query.vue),
      ...(query.dateMin || query.dateMax
        ? {
            createdAt: {
              ...(query.dateMin ? { gte: new Date(query.dateMin) } : {}),
              ...(query.dateMax ? { lte: new Date(query.dateMax) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.prospect.findMany({
        where,
        include: prospectListInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.prospect.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Vues rapides de l'espace commercial : ce sont des filtres, pas des
   * écrans séparés — la liste, ses colonnes et ses exports restent uniques.
   */
  private vueFilter(vue?: string): Prisma.ProspectWhereInput {
    if (!vue) return {};
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const actifs: Prisma.ProspectWhereInput = {
      statutPipeline: { notIn: [...PIPELINE_CLOSED_STAGES] },
    };
    switch (vue) {
      case 'a_relancer':
        return { ...actifs, prochaineRelanceLe: { lte: endOfDay } };
      case 'relance_en_retard':
        return { ...actifs, prochaineRelanceLe: { lt: startOfDay } };
      case 'sans_action':
        return { ...actifs, prochaineRelanceLe: null };
      case 'visites_a_venir':
        return {
          ...actifs,
          visites: {
            some: {
              statut: { in: ['proposee', 'programmee'] },
              dateConfirmee: { gte: startOfDay },
            },
          },
        };
      case 'retours_a_saisir':
        // Règle du cahier des charges : après chaque visite, un retour doit
        // être enregistré. On liste donc les visites dont la date est passée
        // et dont le client n'a pas encore donné son avis.
        return {
          ...actifs,
          visites: {
            some: {
              statut: { in: ['proposee', 'programmee'] },
              dateConfirmee: { lt: startOfDay },
              dateRetour: null,
            },
          },
        };
      case 'actifs':
        return actifs;
      default:
        return {};
    }
  }

  async findOne(id: string, user: CrmUser) {
    await this.access.assertOwnership(id, user);
    const prospect = await this.prisma.prospect.findUnique({
      where: { id },
      include: prospectInclude,
    });
    if (!prospect) throw new NotFoundException('Prospect introuvable');
    return prospect;
  }

  async findOne360(id: string, user: CrmUser) {
    await this.access.assertOwnership(id, user);
    const prospect = await this.prisma.prospect.findUnique({
      where: { id },
      include: {
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
        activites: { orderBy: { dateEcheance: 'asc' as const } },
        documents: { orderBy: { createdAt: 'desc' as const } },
        dossiers: {
          include: {
            terrain: {
              select: { id: true, referenceInterne: true, nom: true },
            },
            mandat: { select: { id: true, referenceInterne: true } },
          },
        },
        _count: {
          select: { activites: true, documents: true, dossiers: true },
        },
      },
    });
    if (!prospect) throw new NotFoundException('Prospect introuvable');

    const sameClientIds = await this.prisma.prospect.findMany({
      where: {
        id: { not: id },
        OR: [
          ...(prospect.email ? [{ email: prospect.email }] : []),
          ...(prospect.telephone ? [{ telephone: prospect.telephone }] : []),
        ],
      },
      select: { id: true },
    });
    const relatedIds = sameClientIds.map((p) => p.id);

    const [relatedActivites, relatedDocuments, relatedDossiers, relatedAudits] =
      await Promise.all([
        relatedIds.length
          ? this.prisma.activiteCrm.findMany({
              where: { prospectId: { in: relatedIds } },
              orderBy: { dateEcheance: 'asc' as const },
              include: {
                prospect: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    statutPipeline: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        relatedIds.length
          ? this.prisma.documentCrm.findMany({
              where: { prospectId: { in: relatedIds } },
              orderBy: { createdAt: 'desc' as const },
              include: {
                prospect: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    statutPipeline: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        relatedIds.length
          ? this.prisma.dossierVente.findMany({
              where: { prospectId: { in: relatedIds } },
              orderBy: { createdAt: 'desc' as const },
              include: {
                prospect: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    statutPipeline: true,
                  },
                },
                terrain: {
                  select: { id: true, referenceInterne: true, nom: true },
                },
                mandat: { select: { id: true, referenceInterne: true } },
              },
            })
          : Promise.resolve([]),
        relatedIds.length
          ? this.prisma.auditLog.findMany({
              where: { entityType: 'Prospect', entityId: { in: relatedIds } },
              orderBy: { createdAt: 'desc' as const },
              take: 50,
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            })
          : Promise.resolve([]),
      ]);

    return {
      prospect,
      relatedProspects: sameClientIds.map((p) => ({ id: p.id })),
      relatedActivites,
      relatedDocuments,
      relatedDossiers,
      relatedAudits,
      dossiers: prospect.dossiers ?? [],
    };
  }

  async assignCommercial(
    prospectId: string,
    commercialResponsableId: string | null,
    user: CrmUser,
  ) {
    if (!this.access.isManager(user)) {
      throw new BadRequestException(
        "Seul l'encadrement commercial peut affecter un prospect",
      );
    }
    await this.access.assertOwnership(prospectId, user);
    if (commercialResponsableId) {
      await this.access.assertCommercialTarget(commercialResponsableId);
    }
    const before = await this.findOne(prospectId, user);
    const prospect = await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { commercialResponsableId },
      include: prospectInclude,
    });
    return { before, prospect };
  }

  async transitionPipeline(
    id: string,
    nextStage: string,
    user: CrmUser,
    justification?: string,
    options?: { prochaineAction?: string; prochaineRelanceLe?: string },
  ) {
    const before = await this.findOne(id, user);
    const isManager =
      user.roles.includes('manager') ||
      user.roles.includes('administrateur') ||
      user.roles.includes('responsable_commercial');
    if (
      !isManager &&
      before.commercialResponsableId &&
      before.commercialResponsableId !== user.id
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas faire avancer un prospect qui ne vous est pas assigné',
      );
    }
    await this.options.assertPipelineStage(nextStage);

    const isExit = PIPELINE_EXIT_STAGES.includes(
      nextStage as (typeof PIPELINE_EXIT_STAGES)[number],
    );
    if (isExit && (!justification || justification.trim().length < 3)) {
      throw new BadRequestException(
        'Un motif est obligatoire pour sortir un prospect du parcours (refusé, abandonné ou injoignable)',
      );
    }

    // Règle commerciale : aucun prospect actif ne reste sans prochaine action.
    const suivi = await this.resolveProchaineAction(id, nextStage, options);

    const prospect = await this.prisma.prospect.update({
      where: { id },
      data: {
        statutPipeline: nextStage,
        ...suivi,
        ...(isExit ? { motifSortie: justification?.trim() } : {}),
      },
      include: prospectInclude,
    });

    return { before, prospect, justification };
  }

  /**
   * Prochaine action du prospect : fournie par l'utilisateur, sinon déduite
   * de la première activité encore à faire. Une étape de fin de parcours
   * efface la relance.
   */
  private async resolveProchaineAction(
    prospectId: string,
    nextStage: string,
    options?: { prochaineAction?: string; prochaineRelanceLe?: string },
  ): Promise<{
    prochaineAction?: string | null;
    prochaineRelanceLe?: Date | null;
  }> {
    if (!isActiveStage(nextStage)) {
      return { prochaineAction: null, prochaineRelanceLe: null };
    }
    if (options?.prochaineAction && options.prochaineRelanceLe) {
      return {
        prochaineAction: options.prochaineAction.trim(),
        prochaineRelanceLe: new Date(options.prochaineRelanceLe),
      };
    }
    const [prospect, activite] = await Promise.all([
      this.prisma.prospect.findUnique({
        where: { id: prospectId },
        select: { prochaineAction: true, prochaineRelanceLe: true },
      }),
      this.prisma.activiteCrm.findFirst({
        where: {
          prospectId,
          statut: 'a_faire',
          dateEcheance: { not: null },
        },
        orderBy: { dateEcheance: 'asc' },
        select: { titre: true, dateEcheance: true },
      }),
    ]);
    if (activite?.dateEcheance) {
      return {
        prochaineAction: activite.titre,
        prochaineRelanceLe: activite.dateEcheance,
      };
    }
    if (prospect?.prochaineRelanceLe) return {};
    throw new BadRequestException(
      'Indiquez la prochaine action et la date de relance : un prospect actif ne doit jamais rester sans suite',
    );
  }

  /**
   * Référence lisible du prospect (P-2026-0007), attribuée à la création.
   * Le compteur repart à 1 chaque année ; en cas de collision (deux créations
   * simultanées), on réessaie avec le rang suivant.
   */
  private nextReference(): Promise<string> {
    return nextProspectReference(this.prisma);
  }

  async convertContact(
    contactId: string,
    commercialResponsableId?: string,
    user?: { id: string; roles: string[] },
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact) throw new NotFoundException('Contact public introuvable');

    if (commercialResponsableId && user && !this.access.isManager(user)) {
      throw new BadRequestException(
        "Seul l'encadrement commercial peut affecter un prospect à un autre utilisateur",
      );
    }

    if (commercialResponsableId) {
      await this.access.assertCommercialTarget(commercialResponsableId);
    }

    const existing = await this.prisma.prospect.findFirst({
      where: {
        OR: [
          ...(contact.email ? [{ email: contact.email }] : []),
          ...(contact.telephone ? [{ telephone: contact.telephone }] : []),
        ],
      },
    });
    if (existing) {
      throw new ConflictException(
        'Un prospect existe déjà pour ce contact (email ou téléphone)',
      );
    }

    const [prenom, ...rest] = (contact.nom || '').split(' ');
    const prospect = await this.prisma.prospect.create({
      data: {
        nom: rest.length ? rest.join(' ') : contact.nom,
        prenom: rest.length ? prenom : undefined,
        email: contact.email,
        telephone: contact.telephone,
        referenceInterne: await this.nextReference(),
        sourceAcquisition: 'site',
        besoins: contact.message,
        statutPipeline: 'nouveau',
        commercialResponsableId: commercialResponsableId ?? null,
      },
      include: prospectInclude,
    });

    await this.prisma.contact.update({
      where: { id: contactId },
      data: { lu: true },
    });

    await this.prisma.activiteCrm.create({
      data: {
        prospectId: prospect.id,
        type: 'note',
        titre: 'Conversion depuis contact public',
        description: `Sujet: ${contact.sujet ?? '—'}\nMessage: ${contact.message}`,
        statut: 'realise',
        priorite: 'moyenne',
      },
    });

    return prospect;
  }

  async create(dto: CreateProspectDto, user: CrmUser) {
    await this.options.assertPipelineStage(dto.statutPipeline);
    await this.options.assertSource(dto.sourceAcquisition);
    await this.options.assertNiveauInteret(dto.niveauInteret);
    const isManager = this.access.isManager(user);
    if (
      !isManager &&
      dto.commercialResponsableId &&
      dto.commercialResponsableId !== user.id
    ) {
      throw new BadRequestException(
        'Seul l’encadrement commercial peut affecter un autre commercial',
      );
    }
    if (dto.commercialResponsableId) {
      await this.access.assertCommercialTarget(
        isManager ? dto.commercialResponsableId : user.id,
      );
    }
    const commercialResponsableId = isManager
      ? dto.commercialResponsableId
      : (dto.commercialResponsableId ?? user.id);
    const { premierContactLe, prochaineRelanceLe, ...rest } = dto;
    const prospect = await this.prisma.prospect.create({
      data: {
        ...(rest as unknown as Prisma.ProspectUncheckedCreateInput),
        referenceInterne: await this.nextReference(),
        ...(premierContactLe
          ? { premierContactLe: new Date(premierContactLe) }
          : {}),
        ...(prochaineRelanceLe
          ? { prochaineRelanceLe: new Date(prochaineRelanceLe) }
          : {}),
        commercialResponsableId,
      },
      include: prospectInclude,
    });
    return prospect;
  }

  async update(id: string, dto: UpdateProspectDto, user: CrmUser) {
    await this.access.assertOwnership(id, user);
    await this.options.assertPipelineStage(dto.statutPipeline);
    await this.options.assertSource(dto.sourceAcquisition);
    await this.options.assertNiveauInteret(dto.niveauInteret);
    const data: Prisma.ProspectUncheckedUpdateInput = {
      ...(dto.nom && { nom: dto.nom }),
      ...(dto.prenom !== undefined && { prenom: dto.prenom }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.telephone !== undefined && { telephone: dto.telephone }),
      ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
      ...(dto.villeResidence !== undefined && {
        villeResidence: dto.villeResidence,
      }),
      ...(dto.niveauInteret !== undefined && {
        niveauInteret: dto.niveauInteret,
      }),
      ...(dto.zoneRecherchee !== undefined && {
        zoneRecherchee: dto.zoneRecherchee,
      }),
      ...(dto.surfaceSouhaitee !== undefined && {
        surfaceSouhaitee: dto.surfaceSouhaitee,
      }),
      ...(dto.typeDocumentSouhaite !== undefined && {
        typeDocumentSouhaite: dto.typeDocumentSouhaite,
      }),
      ...(dto.objectifAchat !== undefined && {
        objectifAchat: dto.objectifAchat,
      }),
      ...(dto.premierContactLe !== undefined && {
        premierContactLe: dto.premierContactLe
          ? new Date(dto.premierContactLe)
          : null,
      }),
      ...(dto.premierContactMoyen !== undefined && {
        premierContactMoyen: dto.premierContactMoyen,
      }),
      ...(dto.prochaineAction !== undefined && {
        prochaineAction: dto.prochaineAction,
      }),
      ...(dto.prochaineRelanceLe !== undefined && {
        prochaineRelanceLe: dto.prochaineRelanceLe
          ? new Date(dto.prochaineRelanceLe)
          : null,
      }),
      ...(dto.terrainChoisiId !== undefined && {
        terrainChoisiId: dto.terrainChoisiId,
      }),
      ...(dto.offreClient !== undefined && { offreClient: dto.offreClient }),
      ...(dto.prixNegocie !== undefined && { prixNegocie: dto.prixNegocie }),
      ...(dto.commentaireNegociation !== undefined && {
        commentaireNegociation: dto.commentaireNegociation,
      }),
      ...(dto.paysResidence !== undefined && {
        paysResidence: dto.paysResidence,
      }),
      ...(dto.sourceAcquisition !== undefined && {
        sourceAcquisition: dto.sourceAcquisition,
      }),
      ...(dto.besoins !== undefined && { besoins: dto.besoins }),
      ...(dto.budgetMin !== undefined && { budgetMin: dto.budgetMin }),
      ...(dto.budgetMax !== undefined && { budgetMax: dto.budgetMax }),
      ...(dto.preferences !== undefined && { preferences: dto.preferences }),
      ...(dto.commercialResponsableId !== undefined && {
        commercialResponsableId: dto.commercialResponsableId,
      }),
      ...(dto.statutPipeline !== undefined && {
        statutPipeline: dto.statutPipeline,
      }),
      ...(dto.score !== undefined && { score: dto.score }),
    };
    if (dto.commercialResponsableId !== undefined) {
      if (!this.access.isManager(user)) {
        const current = await this.prisma.prospect.findUnique({
          where: { id },
          select: { commercialResponsableId: true },
        });
        if (current?.commercialResponsableId !== dto.commercialResponsableId) {
          throw new BadRequestException(
            "Seul l'encadrement commercial peut réaffecter un prospect",
          );
        }
      } else if (dto.commercialResponsableId) {
        await this.access.assertCommercialTarget(dto.commercialResponsableId);
      }
    }
    const prospect = await this.prisma.prospect.update({
      where: { id },
      data,
      include: prospectInclude,
    });
    return prospect;
  }

  async remove(id: string, user: CrmUser): Promise<void> {
    await this.access.assertOwnership(id, user);
    await this.prisma.prospect.delete({ where: { id } });
  }
}
