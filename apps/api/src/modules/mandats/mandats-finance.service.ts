import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  MandatsAccessService,
  type MandatUser,
} from './mandats-access.service';
import { DEFAULT_COMMISSION_RATE } from './mandats-defaults';

/**
 * Suivi financier des mandats (section 10 CDC) : lots confiés, disponibles,
 * réservés, vendus ; chiffre d'affaires, commissions et reste à
 * commercialiser — par mandat et en vue globale.
 */
@Injectable()
export class MandatsFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly access: MandatsAccessService,
  ) {}

  async getStats(user: MandatUser) {
    const now = new Date();
    const [totalMandats, actifs, expirant30Jours, totalLots] =
      await Promise.all([
        this.prisma.mandat.count({ where: this.access.ownershipFilter(user) }),
        this.prisma.mandat.count({
          where: {
            ...this.access.ownershipFilter(user),
            statut: 'Actif',
            dateFin: { gte: now },
          },
        }),
        this.prisma.mandat.count({
          where: {
            ...this.access.ownershipFilter(user),
            statut: 'Actif',
            dateFin: {
              lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              gte: now,
            },
          },
        }),
        this.prisma.mandatLot.count({
          where: { mandat: this.access.ownershipFilter(user) },
        }),
      ]);

    const lotsByStatut = await this.prisma.mandatLot.groupBy({
      by: ['statutLot'],
      where: { mandat: this.access.ownershipFilter(user) },
      _count: { statutLot: true },
    });

    const financial = await this.computeGlobalFinancials(user);

    return {
      totalMandats,
      actifs,
      expirant30Jours,
      totalLots,
      lotsParStatut: lotsByStatut.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.statutLot] = item._count.statutLot;
          return acc;
        },
        {},
      ),
      financial,
    };
  }

  async getFinancialSummary(id: string, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
    const mandat = await this.prisma.mandat.findFirst({
      where: { id, ...this.access.ownershipFilter(user) },
      include: {
        lots: {
          include: {
            terrain: {
              select: { id: true, prixPublic: true, statutCommercial: true },
            },
          },
        },
      },
    });
    if (!mandat) throw new NotFoundException('Mandat introuvable');
    const commissionRate = await this.getCommissionRate();
    const summary = this.computeFinancials(mandat.lots, commissionRate);
    return { mandatId: id, ...summary };
  }

  private async computeGlobalFinancials(user: MandatUser) {
    const mandats = await this.prisma.mandat.findMany({
      where: this.access.ownershipFilter(user),
      include: {
        lots: {
          include: {
            terrain: { select: { prixPublic: true, statutCommercial: true } },
          },
        },
      },
    });
    const commissionRate = await this.getCommissionRate();

    let chiffreAffaires = 0;
    let commissions = 0;
    let reste = 0;

    for (const mandat of mandats) {
      const summary = this.computeFinancials(mandat.lots, commissionRate);
      chiffreAffaires += summary.chiffreAffaires;
      commissions += summary.commissionsEstimees;
      reste += summary.resteACommercialiser;
    }

    return {
      chiffreAffaires,
      commissionsEstimees: commissions,
      resteACommercialiser: reste,
    };
  }

  private computeFinancials(
    lots: Array<{
      terrain: {
        prixPublic: Prisma.Decimal | null;
        statutCommercial: string;
      } | null;
    }>,
    commissionRate: number,
  ) {
    let chiffreAffaires = 0;
    let resteACommercialiser = 0;

    for (const lot of lots) {
      const prix = Number(lot?.terrain?.prixPublic ?? 0);
      if (lot?.terrain?.statutCommercial === 'Vendu') {
        chiffreAffaires += prix;
      } else {
        resteACommercialiser += prix;
      }
    }

    return {
      chiffreAffaires,
      resteACommercialiser,
      commissionsEstimees: Math.round(chiffreAffaires * (commissionRate / 100)),
    };
  }

  private async getCommissionRate(): Promise<number> {
    const value = await this.settings.getRawValue('mandats.commissionRate');
    return typeof value === 'number' && value >= 0 && value <= 100
      ? value
      : DEFAULT_COMMISSION_RATE;
  }
}
