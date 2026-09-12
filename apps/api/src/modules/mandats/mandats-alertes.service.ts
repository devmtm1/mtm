import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  MandatsAccessService,
  type MandatUser,
} from './mandats-access.service';

/**
 * Échéances de mandat (section 10 CDC) : liste des mandats arrivant à
 * expiration et génération des alertes tracées dans le journal d'audit
 * (exécutée chaque nuit par le planificateur).
 */
@Injectable()
export class MandatsAlertesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MandatsAccessService,
  ) {}

  async getExpirants(jours: number = 30, user: MandatUser) {
    const now = new Date();
    const dateLimite = new Date(now.getTime() + jours * 24 * 60 * 60 * 1000);
    return this.prisma.mandat.findMany({
      where: {
        ...this.access.ownershipFilter(user),
        statut: 'Actif',
        dateFin: {
          lte: dateLimite,
          gte: now,
        },
      },
      include: {
        proprietaire: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { lots: true } },
      },
      orderBy: { dateFin: 'asc' },
    });
  }

  async checkAlerts() {
    const alertResults = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const mandats = await tx.mandat.findMany({
        where: {
          statut: 'Actif',
          dateFin: { gte: now },
        },
        include: {
          proprietaire: {
            select: { email: true, firstName: true, lastName: true },
          },
          commercialResponsable: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      });

      const alerts: Array<{
        mandatId: string;
        referenceInterne: string;
        joursRestants: number;
        destinataires: string[];
      }> = [];

      for (const mandat of mandats) {
        const joursRestants = Math.ceil(
          (mandat.dateFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (joursRestants <= (mandat.alerteEcheanceJours ?? 30)) {
          const destinataires: string[] = [];
          if (mandat.proprietaire?.email)
            destinataires.push(mandat.proprietaire.email);
          if (mandat.commercialResponsable?.email)
            destinataires.push(mandat.commercialResponsable.email);

          if (destinataires.length) {
            alerts.push({
              mandatId: mandat.id,
              referenceInterne: mandat.referenceInterne,
              joursRestants,
              destinataires,
            });
          }
        }
      }

      return alerts;
    });

    return {
      generatedAt: new Date().toISOString(),
      alerts: alertResults,
    };
  }
}
