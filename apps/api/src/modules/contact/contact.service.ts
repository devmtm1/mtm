import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import type { Contact } from '@prisma/client';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    if (dto.terrainId) {
      const terrain = await this.prisma.terrain.findUnique({
        where: { id: dto.terrainId },
        select: { id: true },
      });
      if (!terrain) throw new NotFoundException('Terrain introuvable');
    }
    return this.prisma.contact.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        sujet: dto.sujet,
        message: dto.message,
        terrainId: dto.terrainId,
      },
    });
  }

  async findAll(options: { lu?: boolean } = {}): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: { ...(options.lu !== undefined ? { lu: options.lu } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { terrain: { select: { id: true, referenceInterne: true } } },
    });
  }

  async markRead(id: string): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: { lu: true },
    });
  }
}
