import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, SUPERVISION_ROLES } from '../rbac/role-groups';
import { AuditService } from '../audit/audit.service';
import { PERIODE_PATTERN, UpsertObjectifDto } from './dto/upsert-objectif.dto';

type ScopedUser = { id: string; roles: string[]; permissions: string[] };

/** Statuts qui comptent comme une vente engagée (au-delà du simple dossier ouvert). */
const ENGAGED_SALE_STATUSES = ['reserve', 'paiement_partiel', 'solde'];

export interface ObjectifProgress {
  periode: string;
  commercialId: string;
  objectif: {
    cibleVentes: number | null;
    cibleChiffreAffaires: number | null;
    cibleCommissions: number | null;
    notes: string | null;
  } | null;
  realise: {
    ventes: number;
    chiffreAffaires: number;
    commissions: number;
  };
  /** Taux d'atteinte en pourcentage, null quand aucune cible n'est fixée. */
  taux: {
    ventes: number | null;
    chiffreAffaires: number | null;
    commissions: number | null;
  };
}

/**
 * Objectifs commerciaux mensuels et mesure de leur atteinte (J1.6 du
 * planning : « tableau de bord commercial : ventes, objectifs, commissions »).
 *
 * Définition du « réalisé » sur un mois donné :
 * - ventes : dossiers ouverts dans le mois et engagés (réservé, paiement
 *   partiel ou soldé) — un dossier simplement créé n'est pas une vente ;
 * - chiffre d'affaires : paiements validés dont la date de paiement tombe
 *   dans le mois — c'est l'argent réellement encaissé ;
 * - commissions : montants validés ou payés créés dans le mois.
 */
@Injectable()
export class ObjectifsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private isManagement(user: ScopedUser): boolean {
    return hasAnyRole(user.roles, SUPERVISION_ROLES);
  }

  private assertCanView(user: ScopedUser, commercialId: string): void {
    if (!this.isManagement(user) && commercialId !== user.id) {
      throw new ForbiddenException(
        'Accès refusé aux objectifs d’un autre commercial',
      );
    }
  }

  /** Bornes [début, fin[ du mois AAAA-MM, en UTC. */
  private periodBounds(periode: string): { start: Date; end: Date } {
    if (!PERIODE_PATTERN.test(periode)) {
      throw new BadRequestException('La période doit être au format AAAA-MM');
    }
    const [year, month] = periode.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  static currentPeriode(now = new Date()): string {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  async findAll(user: ScopedUser, periode?: string) {
    const where = {
      ...(periode ? { periode } : {}),
      ...(this.isManagement(user) ? {} : { commercialId: user.id }),
    };
    return this.prisma.objectifCommercial.findMany({
      where,
      orderBy: [{ periode: 'desc' }, { commercial: { lastName: 'asc' } }],
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Crée ou remplace l'objectif du couple (commercial, mois). Un objectif se
   * fixe pour un mois entier : une seconde saisie corrige la première, elle
   * ne s'y ajoute pas.
   */
  async upsert(dto: UpsertObjectifDto, user: ScopedUser) {
    this.periodBounds(dto.periode);
    const commercial = await this.prisma.user.findUnique({
      where: { id: dto.commercialId },
      select: { id: true, isActive: true },
    });
    if (!commercial?.isActive) {
      throw new NotFoundException('Commercial introuvable ou inactif');
    }

    const existing = await this.prisma.objectifCommercial.findUnique({
      where: {
        commercialId_periode: {
          commercialId: dto.commercialId,
          periode: dto.periode,
        },
      },
    });

    const data = {
      cibleVentes: dto.cibleVentes ?? null,
      cibleChiffreAffaires: dto.cibleChiffreAffaires ?? null,
      cibleCommissions: dto.cibleCommissions ?? null,
      notes: dto.notes ?? null,
    };
    const saved = await this.prisma.objectifCommercial.upsert({
      where: {
        commercialId_periode: {
          commercialId: dto.commercialId,
          periode: dto.periode,
        },
      },
      create: {
        ...data,
        commercialId: dto.commercialId,
        periode: dto.periode,
        createdById: user.id,
      },
      update: data,
    });

    await this.audit.record({
      userId: user.id,
      action: existing ? 'vente.objectif.updated' : 'vente.objectif.created',
      entityType: 'ObjectifCommercial',
      entityId: saved.id,
      oldValue: existing ? this.snapshot(existing) : undefined,
      newValue: this.snapshot(saved),
    });
    return saved;
  }

  async remove(id: string, user: ScopedUser): Promise<void> {
    const existing = await this.prisma.objectifCommercial.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Objectif introuvable');
    await this.prisma.objectifCommercial.delete({ where: { id } });
    await this.audit.record({
      userId: user.id,
      action: 'vente.objectif.deleted',
      entityType: 'ObjectifCommercial',
      entityId: id,
      oldValue: this.snapshot(existing),
    });
  }

  async getProgress(
    commercialId: string,
    periode: string,
    user: ScopedUser,
  ): Promise<ObjectifProgress> {
    this.assertCanView(user, commercialId);
    const { start, end } = this.periodBounds(periode);
    const inPeriod = { gte: start, lt: end };

    const [objectif, ventes, paiements, commissions] = await Promise.all([
      this.prisma.objectifCommercial.findUnique({
        where: { commercialId_periode: { commercialId, periode } },
      }),
      this.prisma.dossierVente.count({
        where: {
          commercialResponsableId: commercialId,
          createdAt: inPeriod,
          statut: { in: ENGAGED_SALE_STATUSES },
        },
      }),
      this.prisma.paiement.aggregate({
        where: {
          dossierVente: { commercialResponsableId: commercialId },
          statut: 'valide',
          datePaiement: inPeriod,
        },
        _sum: { montant: true },
      }),
      this.prisma.commissionVente.findMany({
        where: {
          commercialId,
          statut: { in: ['validee', 'payee'] },
          createdAt: inPeriod,
        },
        select: { montantValide: true, montantPaye: true, montantEstime: true },
      }),
    ]);

    const realise = {
      ventes,
      chiffreAffaires: Number(paiements._sum.montant ?? 0),
      commissions: commissions.reduce(
        (total, item) =>
          total +
          Number(item.montantPaye ?? item.montantValide ?? item.montantEstime),
        0,
      ),
    };

    const rate = (done: number, target: number | null): number | null =>
      target === null || target === 0
        ? null
        : Math.round((done / target) * 1000) / 10;

    const cibles = objectif
      ? {
          cibleVentes: objectif.cibleVentes,
          cibleChiffreAffaires:
            objectif.cibleChiffreAffaires === null
              ? null
              : Number(objectif.cibleChiffreAffaires),
          cibleCommissions:
            objectif.cibleCommissions === null
              ? null
              : Number(objectif.cibleCommissions),
          notes: objectif.notes,
        }
      : null;

    return {
      periode,
      commercialId,
      objectif: cibles,
      realise,
      taux: {
        ventes: rate(realise.ventes, cibles?.cibleVentes ?? null),
        chiffreAffaires: rate(
          realise.chiffreAffaires,
          cibles?.cibleChiffreAffaires ?? null,
        ),
        commissions: rate(
          realise.commissions,
          cibles?.cibleCommissions ?? null,
        ),
      },
    };
  }

  private snapshot(objectif: {
    commercialId: string;
    periode: string;
    cibleVentes: number | null;
    cibleChiffreAffaires: unknown;
    cibleCommissions: unknown;
    notes: string | null;
  }): Record<string, unknown> {
    return {
      commercialId: objectif.commercialId,
      periode: objectif.periode,
      cibleVentes: objectif.cibleVentes,
      cibleChiffreAffaires:
        objectif.cibleChiffreAffaires === null
          ? null
          : Number(objectif.cibleChiffreAffaires),
      cibleCommissions:
        objectif.cibleCommissions === null
          ? null
          : Number(objectif.cibleCommissions),
      notes: objectif.notes,
    };
  }
}
