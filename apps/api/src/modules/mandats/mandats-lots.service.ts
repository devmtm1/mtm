import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMandatLotDto } from './dto/create-mandat-lot.dto';
import { UpdateMandatLotDto } from './dto/update-mandat-lot.dto';
import {
  MandatsAccessService,
  type MandatUser,
} from './mandats-access.service';

/** Lots (terrains) rattachés à un mandat : ajout, mise à jour, retrait. */
@Injectable()
export class MandatsLotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MandatsAccessService,
  ) {}

  async addLot(mandatId: string, dto: CreateMandatLotDto, user: MandatUser) {
    await this.access.ensureAccessible(mandatId, user);
    const terrain = await this.prisma.terrain.findUnique({
      where: { id: dto.terrainId },
      select: { id: true },
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');

    const mandat = await this.prisma.mandat.findUnique({
      where: { id: mandatId },
      select: { exclusivite: true, statut: true },
    });
    if (mandat?.exclusivite && mandat.statut === 'Actif') {
      const conflicting = await this.prisma.mandat.findFirst({
        where: {
          id: { not: mandatId },
          statut: 'Actif',
          exclusivite: true,
          lots: { some: { terrainId: dto.terrainId } },
        },
        select: { id: true },
      });
      if (conflicting) {
        throw new ConflictException(
          'Ce terrain est déjà couvert par un mandat exclusif actif',
        );
      }
    }

    const existing = await this.prisma.mandatLot.findFirst({
      where: { mandatId, terrainId: dto.terrainId },
    });
    if (existing)
      throw new ConflictException('Ce terrain est déjà rattaché à ce mandat');

    return this.prisma.mandatLot.create({
      data: {
        mandatId,
        terrainId: dto.terrainId,
        statutLot: dto.statutLot ?? 'Confie',
      },
      include: {
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            commune: true,
            region: true,
            superficie: true,
            prixPublic: true,
            statutCommercial: true,
          },
        },
      },
    });
  }

  async updateLot(
    mandatId: string,
    lotId: string,
    dto: UpdateMandatLotDto,
    user: MandatUser,
  ) {
    await this.access.ensureAccessible(mandatId, user);
    const lot = await this.prisma.mandatLot.findFirst({
      where: { id: lotId, mandatId },
    });
    if (!lot) throw new NotFoundException('Lot introuvable dans ce mandat');

    return this.prisma.mandatLot.update({
      where: { id: lotId },
      data: dto,
      include: {
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            commune: true,
            region: true,
            superficie: true,
            prixPublic: true,
            statutCommercial: true,
          },
        },
      },
    });
  }

  async removeLot(
    mandatId: string,
    lotId: string,
    user: MandatUser,
  ): Promise<void> {
    await this.access.ensureAccessible(mandatId, user);
    const lot = await this.prisma.mandatLot.findFirst({
      where: { id: lotId, mandatId },
    });
    if (!lot) throw new NotFoundException('Lot introuvable dans ce mandat');
    await this.prisma.mandatLot.delete({ where: { id: lotId } });
  }
}
