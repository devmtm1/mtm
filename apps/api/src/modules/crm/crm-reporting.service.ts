import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CrmAccessService } from './crm-access.service';

/**
 * Lecture transversale du CRM : liste des commerciaux, statistiques du
 * pipeline (vue manager), chronologie et historique d'audit d'un prospect.
 */
@Injectable()
export class CrmReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CrmAccessService,
  ) {}

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
    const isManager = this.access.isManager(user);
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

  async getTimeline(prospectId: string, user: { id: string; roles: string[] }) {
    await this.access.assertOwnership(prospectId, user);
    await this.access.ensureExists(prospectId);
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

  async getHistory(prospectId: string, user: { id: string; roles: string[] }) {
    await this.access.assertOwnership(prospectId, user);
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
}
