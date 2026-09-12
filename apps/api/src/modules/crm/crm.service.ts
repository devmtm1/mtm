import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CrmAccessService } from './crm-access.service';
import { CrmOptionsService } from './crm-options.service';
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
  dossiers: {
    include: {
      terrain: { select: { id: true, referenceInterne: true, nom: true } },
      mandat: { select: { id: true, referenceInterne: true } },
    },
  },
  _count: { select: { activites: true, documents: true, dossiers: true } },
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

  async findAll(
    query: QueryProspectDto,
    user: { id: string; roles: string[] },
  ) {
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
    await this.access.assertOwnership(id, user);
    const prospect = await this.prisma.prospect.findUnique({
      where: { id },
      include: prospectInclude,
    });
    if (!prospect) throw new NotFoundException('Prospect introuvable');
    return prospect;
  }

  async findOne360(id: string, user: { id: string; roles: string[] }) {
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
    user: { id: string; roles: string[] },
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
    await this.options.assertPipelineStage(nextStage);

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
    await this.options.assertPipelineStage(dto.statutPipeline);
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
    await this.access.assertOwnership(id, user);
    await this.options.assertPipelineStage(dto.statutPipeline);
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

  async remove(
    id: string,
    user: { id: string; roles: string[] },
  ): Promise<void> {
    await this.access.assertOwnership(id, user);
    await this.prisma.prospect.delete({ where: { id } });
  }
}
