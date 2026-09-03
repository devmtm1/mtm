import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';
import { CreateActiviteCrmDto } from './dto/create-activite-crm.dto';
import { UpdateActiviteCrmDto } from './dto/update-activite-crm.dto';
import { CreateDocumentCrmDto } from './dto/create-document-crm.dto';

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
  dossiers: {
    include: {
      terrain: { select: { id: true, referenceInterne: true, nom: true } },
      mandat: { select: { id: true, referenceInterne: true } },
    },
  },
  _count: { select: { activites: true, documents: true, dossiers: true } },
} as const;

const DEFAULT_PIPELINE_STAGES = [
  'nouveau_contact',
  'qualification',
  'proposition',
  'visite',
  'negociation',
  'reservation',
  'vente',
  'perdu',
];

const DEFAULT_ACTIVITE_TYPES = [
  'appel',
  'rendez-vous',
  'tache',
  'relance',
  'email',
  'note',
];

const DEFAULT_ACTIVITE_STATS = ['a_faire', 'realise', 'reporte', 'annule'];

const DEFAULT_PRIORITES = ['basse', 'moyenne', 'haute'];

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private isManager(user: { id: string; roles: string[] }): boolean {
    return (
      user.roles.includes('manager') ||
      user.roles.includes('administrateur') ||
      user.roles.includes('responsable_commercial')
    );
  }

  private async assertOwnership(
    prospectId: string,
    user: { id: string; roles: string[] },
  ): Promise<void> {
    if (this.isManager(user)) return;
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      select: { id: true, commercialResponsableId: true },
    });
    if (!prospect || prospect.commercialResponsableId !== user.id) {
      throw new NotFoundException('Prospect introuvable');
    }
  }

  private async assertCommercialTarget(
    commercialResponsableId: string,
  ): Promise<void> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: commercialResponsableId },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Utilisateur cible introuvable ou inactif');
    }
    const hasCommercialRole = targetUser.roles.some((ur) =>
      [
        'commercial',
        'responsable_commercial',
        'manager',
        'administrateur',
      ].includes(ur.role.name),
    );
    if (!hasCommercialRole) {
      throw new BadRequestException(
        "L'utilisateur cible n'a pas de rôle commercial",
      );
    }
  }

  async findAll(
    query: QueryProspectDto,
    user: { id: string; roles: string[] },
  ) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const isManager = this.isManager(user);

    const where: Prisma.ProspectWhereInput = {
      ...(search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' as const } },
              { prenom: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { telephone: { contains: search, mode: 'insensitive' as const } },
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
        include: prospectInclude,
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

  async findOne(id: string, user: { id: string; roles: string[] }) {
    await this.assertOwnership(id, user);
    const prospect = await this.prisma.prospect.findUnique({
      where: { id },
      include: prospectInclude,
    });
    if (!prospect) throw new NotFoundException('Prospect introuvable');
    return prospect;
  }

  async findOne360(id: string, user: { id: string; roles: string[] }) {
    await this.assertOwnership(id, user);
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

  async getOptions() {
    const [pipelineStages, activiteTypes, activiteStats, priorites] =
      await Promise.all([
        this.prisma.systemSetting.findUnique({
          where: { key: 'crm.pipelineStages' },
        }),
        this.prisma.systemSetting.findUnique({
          where: { key: 'crm.activiteTypes' },
        }),
        this.prisma.systemSetting.findUnique({
          where: { key: 'crm.activiteStats' },
        }),
        this.prisma.systemSetting.findUnique({
          where: { key: 'crm.priorites' },
        }),
      ]);

    return {
      pipelineStages: this.asOptions(
        pipelineStages?.value,
        DEFAULT_PIPELINE_STAGES,
      ),
      activiteTypes: this.asOptions(
        activiteTypes?.value,
        DEFAULT_ACTIVITE_TYPES,
      ),
      activiteStats: this.asOptions(
        activiteStats?.value,
        DEFAULT_ACTIVITE_STATS,
      ),
      priorites: this.asOptions(priorites?.value, DEFAULT_PRIORITES),
    };
  }

  async getCommercials() {
    const commercialRoles = await this.prisma.role.findMany({
      where: {
        name: {
          in: [
            'commercial',
            'responsable_commercial',
            'manager',
            'administrateur',
          ],
        },
      },
      select: { id: true },
    });
    const roleIds = commercialRoles.map((r) => r.id);
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { roleId: { in: roleIds } } },
      },
      include: {
        roles: {
          where: { roleId: { in: roleIds } },
          include: { role: { select: { name: true } } },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles.map((ur) => ur.role.name),
    }));
  }

  async getStats(user: { id: string; roles: string[] }) {
    const isManager = this.isManager(user);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const baseWhere: Prisma.ProspectWhereInput = isManager
      ? {}
      : { commercialResponsableId: user.id };

    const [pipeline, totalProspects, nouveaux, upcomingTasksCount] =
      await Promise.all([
        this.prisma.prospect.groupBy({
          by: ['statutPipeline'],
          where: baseWhere,
          _count: { statutPipeline: true },
        }),
        this.prisma.prospect.count({ where: baseWhere }),
        this.prisma.prospect.count({
          where: {
            ...baseWhere,
            statutPipeline: 'nouveau_contact',
            createdAt: { gte: startOfDay },
          },
        }),
        this.prisma.activiteCrm.count({
          where: {
            statut: 'a_faire',
            dateEcheance: { gte: now },
            prospect: isManager
              ? undefined
              : { commercialResponsableId: user.id },
          },
        }),
      ]);

    return {
      totalProspects,
      nouveaux,
      upcomingTasksCount,
      pipeline: pipeline.reduce<Record<string, number>>((acc, item) => {
        acc[item.statutPipeline] = item._count.statutPipeline;
        return acc;
      }, {}),
    };
  }

  async getUpcomingTasks(user: { id: string; roles: string[] }, limit = 20) {
    const isManager = this.isManager(user);
    return this.prisma.activiteCrm.findMany({
      where: {
        statut: 'a_faire',
        dateEcheance: { gte: new Date() },
        prospect: isManager ? undefined : { commercialResponsableId: user.id },
      },
      orderBy: { dateEcheance: 'asc' },
      take: limit,
      include: {
        prospect: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            statutPipeline: true,
            commercialResponsableId: true,
          },
        },
      },
    });
  }

  async getTimeline(prospectId: string, user: { id: string; roles: string[] }) {
    await this.assertOwnership(prospectId, user);
    await this.ensureExists(prospectId);
    const [prospect, activites, audits, dossiers] = await Promise.all([
      this.prisma.prospect.findUnique({
        where: { id: prospectId },
        include: {
          commercialResponsable: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.activiteCrm.findMany({
        where: { prospectId },
        orderBy: [{ dateEcheance: 'asc' }],
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'Prospect', entityId: prospectId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.dossierVente.findMany({
        where: { prospectId },
        orderBy: { createdAt: 'desc' },
        include: {
          terrain: { select: { id: true, referenceInterne: true, nom: true } },
          mandat: { select: { id: true, referenceInterne: true } },
        },
      }),
    ]);

    const upcoming = activites
      .filter(
        (a) =>
          a.statut === 'a_faire' &&
          a.dateEcheance &&
          a.dateEcheance >= new Date(),
      )
      .sort((a, b) => a.dateEcheance!.getTime() - b.dateEcheance!.getTime())
      .slice(0, 5);

    const overdue = activites
      .filter(
        (a) =>
          a.statut === 'a_faire' &&
          a.dateEcheance &&
          a.dateEcheance < new Date(),
      )
      .sort((a, b) => b.dateEcheance!.getTime() - a.dateEcheance!.getTime())
      .slice(0, 5);

    return {
      prospect,
      upcoming,
      overdue,
      activites,
      audits,
      dossiers,
    };
  }

  async assignCommercial(
    prospectId: string,
    commercialResponsableId: string | null,
    user: { id: string; roles: string[] },
  ) {
    if (!this.isManager(user)) {
      throw new BadRequestException(
        "Seul l'encadrement commercial peut affecter un prospect",
      );
    }
    await this.assertOwnership(prospectId, user);
    if (commercialResponsableId) {
      await this.assertCommercialTarget(commercialResponsableId);
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
    user: { id: string; roles: string[] },
    justification?: string,
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
    await this.validatePipeline(nextStage);

    if (
      nextStage === 'perdu' &&
      (!justification || justification.trim().length < 3)
    ) {
      throw new BadRequestException(
        'Une justification est obligatoire pour passer en statut "perdu"',
      );
    }

    const prospect = await this.prisma.prospect.update({
      where: { id },
      data: { statutPipeline: nextStage },
      include: prospectInclude,
    });

    return { before, prospect, justification };
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

    if (commercialResponsableId && user && !this.isManager(user)) {
      throw new BadRequestException(
        "Seul l'encadrement commercial peut affecter un prospect à un autre utilisateur",
      );
    }

    if (commercialResponsableId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: commercialResponsableId },
        include: { roles: { include: { role: { select: { name: true } } } } },
      });
      if (!targetUser || !targetUser.isActive) {
        throw new BadRequestException(
          'Utilisateur cible introuvable ou inactif',
        );
      }
      const hasCommercialRole = targetUser.roles.some((ur) =>
        [
          'commercial',
          'responsable_commercial',
          'manager',
          'administrateur',
        ].includes(ur.role.name),
      );
      if (!hasCommercialRole) {
        throw new BadRequestException(
          "L'utilisateur cible n'a pas de rôle commercial",
        );
      }
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
        sourceAcquisition: 'contact_public',
        besoins: contact.message,
        statutPipeline: 'nouveau_contact',
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

  async create(dto: CreateProspectDto, user: { id: string; roles: string[] }) {
    await this.validatePipeline(dto.statutPipeline);
    const isManager = this.isManager(user);
    const commercialResponsableId = isManager
      ? dto.commercialResponsableId
      : (dto.commercialResponsableId ?? user.id);
    const prospect = await this.prisma.prospect.create({
      data: {
        ...(dto as unknown as Prisma.ProspectUncheckedCreateInput),
        commercialResponsableId,
      },
      include: prospectInclude,
    });
    return prospect;
  }

  async update(
    id: string,
    dto: UpdateProspectDto,
    user: { id: string; roles: string[] },
  ) {
    await this.assertOwnership(id, user);
    await this.validatePipeline(dto.statutPipeline);
    const data: Prisma.ProspectUncheckedUpdateInput = {
      ...(dto.nom && { nom: dto.nom }),
      ...(dto.prenom !== undefined && { prenom: dto.prenom }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.telephone !== undefined && { telephone: dto.telephone }),
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
      if (!this.isManager(user)) {
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
        await this.assertCommercialTarget(dto.commercialResponsableId);
      }
    }
    const prospect = await this.prisma.prospect.update({
      where: { id },
      data,
      include: prospectInclude,
    });
    return prospect;
  }

  async remove(
    id: string,
    user: { id: string; roles: string[] },
  ): Promise<void> {
    await this.assertOwnership(id, user);
    await this.prisma.prospect.delete({ where: { id } });
  }

  async addActivite(
    prospectId: string,
    dto: CreateActiviteCrmDto,
    user: { id: string; roles: string[] },
  ) {
    await this.assertOwnership(prospectId, user);
    await this.validateActiviteType(dto.type);
    const statut = dto.statut ?? 'a_faire';
    const priorite = dto.priorite ?? 'moyenne';
    await this.validateActiviteStatut(statut);
    await this.validatePriorite(priorite);
    return this.prisma.activiteCrm.create({
      data: {
        prospectId,
        type: dto.type,
        titre: dto.titre,
        description: dto.description,
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
        dateRealisation: dto.dateRealisation
          ? new Date(dto.dateRealisation)
          : undefined,
        statut,
        priorite,
      },
    });
  }

  async updateActivite(
    prospectId: string,
    activiteId: string,
    dto: UpdateActiviteCrmDto,
    user: { id: string; roles: string[] },
  ) {
    await this.assertOwnership(prospectId, user);
    const activite = await this.prisma.activiteCrm.findFirst({
      where: { id: activiteId, prospectId },
    });
    if (!activite) throw new NotFoundException('Activité introuvable');

    const data: Prisma.ActiviteCrmUncheckedUpdateInput = {
      ...(dto.type && { type: dto.type }),
      ...(dto.titre && { titre: dto.titre }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.dateEcheance !== undefined && {
        dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : null,
      }),
      ...(dto.dateRealisation !== undefined && {
        dateRealisation: dto.dateRealisation
          ? new Date(dto.dateRealisation)
          : null,
      }),
      ...(dto.statut !== undefined && { statut: dto.statut }),
      ...(dto.priorite !== undefined && { priorite: dto.priorite }),
    };
    return this.prisma.activiteCrm.update({
      where: { id: activiteId },
      data,
    });
  }

  async removeActivite(
    prospectId: string,
    activiteId: string,
    user: { id: string; roles: string[] },
  ): Promise<void> {
    await this.assertOwnership(prospectId, user);
    const activite = await this.prisma.activiteCrm.findFirst({
      where: { id: activiteId, prospectId },
    });
    if (!activite) throw new NotFoundException('Activité introuvable');
    await this.prisma.activiteCrm.delete({ where: { id: activiteId } });
  }

  async addDocument(
    prospectId: string,
    dto: CreateDocumentCrmDto,
    file: Express.Multer.File,
    user: { id: string; roles: string[] },
  ) {
    await this.assertOwnership(prospectId, user);
    this.validateFileSize(file);
    await this.validateDocumentType(dto.type);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/crm/${prospectId}/documents`,
      dto.isPublic ?? false,
    );
    return this.prisma.documentCrm.create({
      data: {
        prospectId,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        url: uploaded.secureUrl,
      },
    });
  }

  async removeDocument(
    prospectId: string,
    documentId: string,
    user: { id: string; roles: string[] },
  ): Promise<void> {
    await this.assertOwnership(prospectId, user);
    const document = await this.prisma.documentCrm.findFirst({
      where: { id: documentId, prospectId },
    });
    if (!document) return;
    await this.prisma.documentCrm.delete({ where: { id: documentId } });
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      document.isPublic,
    );
  }

  async getHistory(prospectId: string, user: { id: string; roles: string[] }) {
    await this.assertOwnership(prospectId, user);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType: 'Prospect', entityId: prospectId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: { entityType: 'Prospect', entityId: prospectId },
      }),
    ]);
    return { items, total };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.prospect.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Prospect introuvable');
  }

  private async validatePipeline(statut?: string): Promise<void> {
    if (!statut) return;
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'crm.pipelineStages' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [...DEFAULT_PIPELINE_STAGES];
    if (!allowed.includes(statut)) {
      throw new BadRequestException('Statut de pipeline invalide');
    }
  }

  private async validateActiviteType(type: string): Promise<void> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'crm.activiteTypes' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [...DEFAULT_ACTIVITE_TYPES];
    if (!allowed.includes(type)) {
      throw new BadRequestException("Type d'activité invalide");
    }
  }

  private async validateActiviteStatut(statut: string): Promise<void> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'crm.activiteStats' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [...DEFAULT_ACTIVITE_STATS];
    if (!allowed.includes(statut)) {
      throw new BadRequestException("Statut d'activité invalide");
    }
  }

  private async validatePriorite(priorite: string): Promise<void> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'crm.priorites' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [...DEFAULT_PRIORITES];
    if (!allowed.includes(priorite)) {
      throw new BadRequestException('Priorité invalide');
    }
  }

  private validateFileSize(file: Express.Multer.File): void {
    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('Le fichier ne doit pas dépasser 10 Mo');
    }
  }

  private async validateDocumentType(type: string): Promise<void> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'crm.documentTypes' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [
          'contrat',
          'avenant',
          'preuve_signature',
          'correspondance',
          'justificatif',
          'autre',
        ];
    if (!allowed.includes(type)) {
      throw new BadRequestException('Type de document invalide');
    }
  }

  private asOptions(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : fallback;
  }
}
