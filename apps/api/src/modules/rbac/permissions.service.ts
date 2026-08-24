import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Les permissions sont un référentiel fixe (issu du seed, section 24 du
   * CDC : consulter, creer, modifier, valider, supprimer, exporter, payer,
   * publier, administrer × ressources). Elles ne sont pas créées via l'API
   * en Phase 0 — seule leur consultation et leur attribution aux rôles
   * sont exposées.
   */
  async findAll() {
    return await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async findByResource(resource: string) {
    return await this.prisma.permission.findMany({
      where: { resource },
      orderBy: { action: 'asc' },
    });
  }
}
