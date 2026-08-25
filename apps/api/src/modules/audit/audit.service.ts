import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface RecordAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  justification?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface Pagination {
  page?: number;
  pageSize?: number;
}

/**
 * Service d'audit générique et réutilisable (section 24 du CDC).
 * Tout module — Phase 0 ou futurs modules métier — doit passer par ce
 * service plutôt que d'écrire directement dans audit_logs, afin de
 * garantir un format cohérent et centralisé.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre une entrée d'audit. Ne lève jamais d'exception : un échec
   * d'écriture d'audit ne doit jamais faire échouer l'action métier
   * qu'il documente (ex: un login réussi ne doit pas être annulé parce
   * que l'audit log a échoué à s'écrire).
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? undefined,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? undefined,
          oldValue: this.toJson(input.oldValue),
          newValue: this.toJson(input.newValue),
          justification: input.justification,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      this.logger.error("Échec de l'écriture du journal d'audit", error);
    }
  }

  async findAll(filters: AuditQueryFilters, pagination: Pagination = {}) {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const pageSize =
      pagination.pageSize && pagination.pageSize > 0
        ? Math.min(pagination.pageSize, 200)
        : 50;

    const where = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private toJson(value: unknown) {
    if (value === undefined || value === null) return undefined;
    // Prisma attend un JSON sérialisable ; on passe par JSON.stringify/parse
    // pour éliminer les valeurs non sérialisables (undefined imbriqués, etc.)
    return JSON.parse(JSON.stringify(value)) as object;
  }
}
