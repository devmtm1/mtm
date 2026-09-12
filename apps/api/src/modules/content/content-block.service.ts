import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasAnyRole, PUBLISHER_ROLES } from '../rbac/role-groups';
import { AuditService } from '../audit/audit.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';

type ContentEditor = { id: string; roles: string[]; permissions: string[] };

/**
 * Textes administrables du site public (hero, à propos, coordonnées…).
 *
 * Chaque mutation est journalisée avec l'ancienne et la nouvelle valeur :
 * ce sont des contenus visibles de tous les visiteurs, et la section 24 du
 * cahier des charges exige la traçabilité de l'action « publier ».
 */
@Injectable()
export class ContentBlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.contentBlock.findMany({
      where: { isActive: true },
      select: this.publicSelect,
      orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
    });
  }

  async findAllAdmin() {
    return this.prisma.contentBlock.findMany({
      select: {
        id: true,
        key: true,
        title: true,
        content: true,
        type: true,
        ordre: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
    });
  }

  async findByKey(key: string) {
    const block = await this.prisma.contentBlock.findUnique({
      where: { key, isActive: true },
      select: this.publicSelect,
    });
    if (!block) throw new NotFoundException('Bloc de contenu introuvable');
    return block;
  }

  async findByType(type: string) {
    return this.prisma.contentBlock.findMany({
      where: { type, isActive: true },
      select: this.publicSelect,
      orderBy: { ordre: 'asc' },
    });
  }

  private readonly publicSelect = {
    key: true,
    title: true,
    content: true,
    type: true,
  } as const;

  /** Champs qui décrivent un bloc dans le journal d'audit. */
  private readonly auditSelect = {
    key: true,
    title: true,
    content: true,
    type: true,
    ordre: true,
    isActive: true,
  } as const;

  async create(dto: CreateContentBlockDto, user: ContentEditor) {
    const canPublish =
      hasAnyRole(user.roles, PUBLISHER_ROLES) ||
      user.permissions.includes('content:publier');
    const created = await this.prisma.contentBlock.create({
      data: {
        ...dto,
        isActive: Boolean(dto.isActive && canPublish),
        updatedById: user.id,
      },
    });
    await this.audit.record({
      userId: user.id,
      action: 'content.created',
      entityType: 'ContentBlock',
      entityId: created.id,
      newValue: this.snapshot(created),
    });
    return created;
  }

  async update(key: string, dto: UpdateContentBlockDto, userId: string) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Bloc de contenu introuvable');
    const updated = await this.prisma.contentBlock.update({
      where: { key },
      data: { ...dto, updatedById: userId },
    });
    await this.audit.record({
      userId,
      action: 'content.updated',
      entityType: 'ContentBlock',
      entityId: updated.id,
      oldValue: this.snapshot(existing),
      newValue: this.snapshot(updated),
    });
    return updated;
  }

  async remove(key: string, userId: string) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Bloc de contenu introuvable');
    await this.prisma.contentBlock.delete({ where: { key } });
    await this.audit.record({
      userId,
      action: 'content.deleted',
      entityType: 'ContentBlock',
      entityId: existing.id,
      oldValue: this.snapshot(existing),
    });
  }

  async setActive(key: string, isActive: boolean, userId: string) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Bloc de contenu introuvable');
    const updated = await this.prisma.contentBlock.update({
      where: { key },
      data: { isActive, updatedById: userId },
    });
    await this.audit.record({
      userId,
      action: isActive ? 'content.published' : 'content.unpublished',
      entityType: 'ContentBlock',
      entityId: updated.id,
      oldValue: { key, isActive: existing.isActive },
      newValue: { key, isActive },
    });
    return updated;
  }

  private snapshot(block: {
    key: string;
    title: string | null;
    content: string;
    type: string;
    ordre: number;
    isActive: boolean;
  }): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of Object.keys(
      this.auditSelect,
    ) as (keyof typeof this.auditSelect)[]) {
      result[field] = block[field];
    }
    return result;
  }
}
