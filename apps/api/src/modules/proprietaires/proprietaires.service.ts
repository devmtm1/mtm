import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';

@Injectable()
export class ProprietairesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.proprietaire.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findById(id: string) {
    const proprietaire = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!proprietaire) {
      throw new NotFoundException('Propriétaire introuvable');
    }
    return proprietaire;
  }

  async create(dto: CreateProprietaireDto) {
    if (dto.email) {
      const existing = await this.prisma.proprietaire.findFirst({
        where: { email: dto.email },
      });
      if (existing)
        throw new ConflictException(
          'Un propriétaire avec cet email existe déjà',
        );
    }
    return this.prisma.proprietaire.create({ data: dto });
  }

  async update(id: string, dto: UpdateProprietaireDto) {
    await this.ensureExists(id);
    return this.prisma.proprietaire.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.proprietaire.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const owner = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('Propriétaire introuvable');
  }
}
