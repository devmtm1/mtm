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
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface Pagination {
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? undefined,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? undefined,
          // Prisma attend un type JSON très strict ; toJson() retourne `unknown`,
          // le cast est donc nécessaire ici.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          oldValue: this.toJson(input.oldValue) as any,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          newValue: this.toJson(input.newValue) as any,
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
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
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

  async exportLogs(
    filters: AuditQueryFilters,
    justification: string,
    userId: string,
  ) {
    await this.record({
      userId,
      action: 'audit.exported',
      entityType: 'AuditLog',
      justification,
      newValue: { filters },
    });

    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  private toJson(value: unknown) {
    if (value === undefined || value === null) return undefined;
    try {
      return structuredClone(value);
    } catch {
      return this.serialize(value);
    }
  }

  private serialize(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.serialize(item));
    const record = value as Record<string, unknown>;
    if (typeof record.toJSON === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return this.serialize(record.toJSON());
    }
    const plain: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      plain[key] = this.serialize(record[key]);
    }
    return plain;
  }
}
