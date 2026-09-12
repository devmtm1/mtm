import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateActiviteCrmDto } from './dto/create-activite-crm.dto';
import { UpdateActiviteCrmDto } from './dto/update-activite-crm.dto';
import { CrmAccessService } from './crm-access.service';
import { CrmOptionsService } from './crm-options.service';

/**
 * Activités liées à un prospect (appels, rendez-vous, tâches, relances —
 * section 13 CDC) et liste des tâches à venir du commercial ou de l'équipe.
 */
@Injectable()
export class CrmActivitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CrmAccessService,
    private readonly options: CrmOptionsService,
  ) {}

  async getUpcomingTasks(user: { id: string; roles: string[] }, limit = 20) {
    const isManager = this.access.isManager(user);
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

  async addActivite(
    prospectId: string,
    dto: CreateActiviteCrmDto,
    user: { id: string; roles: string[] },
  ) {
    await this.access.assertOwnership(prospectId, user);
    await this.options.assertActiviteType(dto.type);
    const statut = dto.statut ?? 'a_faire';
    const priorite = dto.priorite ?? 'moyenne';
    await this.options.assertActiviteStatut(statut);
    await this.options.assertPriorite(priorite);
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
    await this.access.assertOwnership(prospectId, user);
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
    await this.access.assertOwnership(prospectId, user);
    const activite = await this.prisma.activiteCrm.findFirst({
      where: { id: activiteId, prospectId },
    });
    if (!activite) throw new NotFoundException('Activité introuvable');
    await this.prisma.activiteCrm.delete({ where: { id: activiteId } });
  }
}
