import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hasSupervisionScope } from '../rbac/role-groups';

export type MandatUser = { id: string; roles: string[]; permissions: string[] };

/**
 * Règles de périmètre des mandats, partagées par les services du module :
 * un commercial ne voit que les mandats dont il est responsable, la
 * direction et les managers voient tout.
 */
@Injectable()
export class MandatsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureAccessible(id: string, user: MandatUser): Promise<void> {
    const exists = await this.prisma.mandat.findFirst({
      where: { id, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Mandat introuvable');
  }

  ownershipFilter(user: MandatUser): Prisma.MandatWhereInput {
    if (this.hasGlobalScope(user)) return {};
    return { commercialResponsableId: user.id };
  }

  hasGlobalScope(user: MandatUser): boolean {
    return hasSupervisionScope(user, 'mandats');
  }
}
