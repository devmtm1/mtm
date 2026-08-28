import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';

@Injectable()
export class ContentBlockService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.contentBlock.findMany({
      orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
    });
  }

  async findByKey(key: string) {
    const block = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!block) throw new NotFoundException('Bloc de contenu introuvable');
    return block;
  }

  async findByType(type: string) {
    return this.prisma.contentBlock.findMany({
      where: { type },
      orderBy: { ordre: 'asc' },
    });
  }

  async create(dto: CreateContentBlockDto, userId: string) {
    return this.prisma.contentBlock.create({
      data: { ...dto, updatedById: userId },
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
}
