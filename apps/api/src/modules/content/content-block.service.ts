import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';

@Injectable()
export class ContentBlockService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(
    dto: CreateContentBlockDto,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    const canPublish =
      user.roles.some((role) =>
        ['administrateur', 'direction'].includes(role),
      ) || user.permissions.includes('content:publier');
    return this.prisma.contentBlock.create({
      data: {
        ...dto,
        isActive: Boolean(dto.isActive && canPublish),
        updatedById: user.id,
      },
    });
  }

  async update(key: string, dto: UpdateContentBlockDto, userId: string) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Bloc de contenu introuvable');
    return this.prisma.contentBlock.update({
      where: { key },
      data: { ...dto, updatedById: userId },
    });
  }

  async remove(key: string) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Bloc de contenu introuvable');
    await this.prisma.contentBlock.delete({ where: { key } });
  }

  async setActive(key: string, isActive: boolean, userId: string) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Bloc de contenu introuvable');
    return this.prisma.contentBlock.update({
      where: { key },
      data: { isActive, updatedById: userId },
    });
  }
}
