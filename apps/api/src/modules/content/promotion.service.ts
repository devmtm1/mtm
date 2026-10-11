import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Promotion } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export type StatutDiffusion =
  'sans_media' | 'brouillon' | 'programmee' | 'en_ligne' | 'expiree';

/** Première heure du jour (UTC) : une promotion « du 15 » démarre le 15 à minuit. */
const debutDeJournee = (jour: string): Date =>
  new Date(`${jour.slice(0, 10)}T00:00:00.000Z`);

/** Dernière milliseconde du jour (UTC) : une promotion « jusqu'au 31 » reste en ligne tout le 31. */
const finDeJournee = (jour: string): Date =>
  new Date(`${jour.slice(0, 10)}T23:59:59.999Z`);

/**
 * Publicités et promotions du bandeau d'accueil. Tant qu'au moins une est en
 * ligne (publiée, média présent, dans sa période de diffusion), le site la
 * montre à la place de sa vidéo habituelle.
 */
@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Ce que le site public affiche : uniquement les promotions en ligne, dans l'ordre choisi. */
  async findPublic(maintenant = new Date()) {
    const lignes = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        storageKey: { not: null },
        AND: [
          { OR: [{ dateDebut: null }, { dateDebut: { lte: maintenant } }] },
          { OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] },
        ],
      },
      orderBy: [{ ordre: 'asc' }, { createdAt: 'desc' }],
    });
    return lignes.map((promotion) => ({
      id: promotion.id,
      titre: promotion.titre,
      description: promotion.description,
      type: promotion.resourceType === 'video' ? 'video' : 'image',
      mediaUrl: this.mediaUrl(promotion),
      posterUrl:
        promotion.resourceType === 'video' && promotion.storageKey
          ? this.cloudinary.videoPosterUrl(promotion.storageKey)
          : null,
      lienUrl: promotion.lienUrl,
      libelleLien: promotion.libelleLien,
    }));
  }

  async findAllAdmin() {
    const maintenant = new Date();
    const lignes = await this.prisma.promotion.findMany({
      orderBy: [{ ordre: 'asc' }, { createdAt: 'desc' }],
    });
    return lignes.map((promotion) => this.pourAdmin(promotion, maintenant));
  }

  /**
   * Une promotion neuve n'a pas encore de média : elle naît brouillon et se
   * publie (permission content:publier) une fois l'image ou la vidéo envoyée.
   */
  async create(dto: CreatePromotionDto) {
    this.assertPeriode(dto.dateDebut ?? undefined, dto.dateFin ?? undefined);
    const promotion = await this.prisma.promotion.create({
      data: {
        titre: dto.titre.trim(),
        description: dto.description?.trim() || undefined,
        lienUrl: dto.lienUrl?.trim() || undefined,
        libelleLien: dto.libelleLien?.trim() || undefined,
        dateDebut: dto.dateDebut ? debutDeJournee(dto.dateDebut) : undefined,
        dateFin: dto.dateFin ? finDeJournee(dto.dateFin) : undefined,
        ordre: dto.ordre ?? 0,
        isActive: false,
      },
    });
    return this.pourAdmin(promotion, new Date());
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existante = await this.ensureExists(id);
    const debut =
      dto.dateDebut !== undefined
        ? dto.dateDebut
        : existante.dateDebut?.toISOString();
    const fin =
      dto.dateFin !== undefined
        ? dto.dateFin
        : existante.dateFin?.toISOString();
    this.assertPeriode(debut || undefined, fin || undefined);

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.titre !== undefined ? { titre: dto.titre.trim() } : {}),
        // Une chaîne vidée efface le champ au lieu de laisser un blanc.
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.lienUrl !== undefined
          ? { lienUrl: dto.lienUrl.trim() || null }
          : {}),
        ...(dto.libelleLien !== undefined
          ? { libelleLien: dto.libelleLien.trim() || null }
          : {}),
        ...(dto.dateDebut !== undefined
          ? { dateDebut: dto.dateDebut ? debutDeJournee(dto.dateDebut) : null }
          : {}),
        ...(dto.dateFin !== undefined
          ? { dateFin: dto.dateFin ? finDeJournee(dto.dateFin) : null }
          : {}),
        ...(dto.ordre !== undefined ? { ordre: dto.ordre } : {}),
      },
    });
    return this.pourAdmin(promotion, new Date());
  }

  async setActive(id: string, isActive: boolean) {
    const existante = await this.ensureExists(id);
    if (isActive && !existante.storageKey) {
      throw new BadRequestException(
        'Ajoutez d’abord l’image ou la vidéo : une promotion sans média ne peut pas être publiée',
      );
    }
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: { isActive },
    });
    return this.pourAdmin(promotion, new Date());
  }

  /** Remplace l'image ou la vidéo ; l'ancienne est supprimée de Cloudinary. */
  async uploadMedia(id: string, file: Express.Multer.File) {
    const existante = await this.ensureExists(id);
    validateUploadedAsset(file, 'media');
    const envoye = await this.cloudinary.upload(file, 'mtm/promotions', true);
    if (existante.storageKey) {
      await this.cloudinary.destroy(
        existante.storageKey,
        existante.resourceType,
        true,
      );
    }
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: { storageKey: envoye.publicId, resourceType: envoye.resourceType },
    });
    return this.pourAdmin(promotion, new Date());
  }

  async remove(id: string): Promise<void> {
    const existante = await this.ensureExists(id);
    await this.prisma.promotion.delete({ where: { id } });
    if (existante.storageKey) {
      await this.cloudinary.destroy(
        existante.storageKey,
        existante.resourceType,
        true,
      );
    }
  }

  /** Où en est la diffusion d'une promotion, à l'instant donné. */
  static statut(
    promotion: Pick<
      Promotion,
      'storageKey' | 'isActive' | 'dateDebut' | 'dateFin'
    >,
    maintenant: Date,
  ): StatutDiffusion {
    if (!promotion.storageKey) return 'sans_media';
    if (!promotion.isActive) return 'brouillon';
    if (promotion.dateDebut && promotion.dateDebut > maintenant) {
      return 'programmee';
    }
    if (promotion.dateFin && promotion.dateFin < maintenant) return 'expiree';
    return 'en_ligne';
  }

  private pourAdmin(promotion: Promotion, maintenant: Date) {
    return {
      ...promotion,
      mediaUrl: this.mediaUrl(promotion),
      posterUrl:
        promotion.resourceType === 'video' && promotion.storageKey
          ? this.cloudinary.videoPosterUrl(promotion.storageKey)
          : null,
      statut: PromotionService.statut(promotion, maintenant),
    };
  }

  private mediaUrl(promotion: Promotion): string | null {
    return promotion.storageKey
      ? this.cloudinary.url(promotion.storageKey, promotion.resourceType, true)
      : null;
  }

  private assertPeriode(debut?: string, fin?: string): void {
    if (debut && fin && fin.slice(0, 10) < debut.slice(0, 10)) {
      throw new BadRequestException(
        'La date de fin ne peut pas précéder la date de début',
      );
    }
  }

  private async ensureExists(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Promotion introuvable');
    return promotion;
  }
}
