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
      select: { id: true, archiveLe: true },
    });
    if (!terrain) throw new NotFoundException('Bien introuvable');
    if (terrain.archiveLe) {
      throw new ConflictException(
        'Ce bien est archivé : restaurez-le avant de le confier à un mandat',
      );
    }

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

  /**
   * Confie au mandat tous les lots d'un programme, en une fois. Les lots déjà
   * rattachés à ce mandat, archivés, ou couverts par un autre mandat exclusif
   * actif (si celui-ci l'est aussi) sont laissés de côté et comptés à part.
   */
  async addProgramme(mandatId: string, programmeId: string, user: MandatUser) {
    await this.access.ensureAccessible(mandatId, user);
    const programme = await this.prisma.programmeLotissement.findUnique({
      where: { id: programmeId },
      select: { id: true },
    });
    if (!programme) throw new NotFoundException('Programme introuvable');

    const mandat = await this.prisma.mandat.findUnique({
      where: { id: mandatId },
      select: { exclusivite: true, statut: true },
    });
    const lots = await this.prisma.terrain.findMany({
      where: { programmeId, archiveLe: null },
      select: { id: true },
    });
    const dejaLies = new Set(
      (
        await this.prisma.mandatLot.findMany({
          where: { mandatId, terrainId: { in: lots.map((l) => l.id) } },
          select: { terrainId: true },
        })
      ).map((l) => l.terrainId),
    );
    const pris = new Set<string>();
    if (mandat?.exclusivite && mandat.statut === 'Actif') {
      const autres = await this.prisma.mandatLot.findMany({
        where: {
          terrainId: { in: lots.map((l) => l.id) },
          mandat: { id: { not: mandatId }, statut: 'Actif', exclusivite: true },
        },
        select: { terrainId: true },
      });
      for (const a of autres) pris.add(a.terrainId);
    }
    const aAjouter = lots.filter((l) => !dejaLies.has(l.id) && !pris.has(l.id));
    if (aAjouter.length > 0) {
      await this.prisma.mandatLot.createMany({
        data: aAjouter.map((l) => ({ mandatId, terrainId: l.id })),
      });
    }
    return {
      ajoutes: aAjouter.length,
      dejaRattaches: dejaLies.size,
      exclusifsAilleurs: pris.size,
    };
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
