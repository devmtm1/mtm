import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Publication } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import {
  AttacherVideoDto,
  CreatePublicationDto,
  UpdatePublicationDto,
} from './dto/publication.dto';

export type StatutPublication =
  'sans_video' | 'brouillon' | 'programmee' | 'en_ligne';

/** Sous-dossier Cloudinary des vidéos (la racine de l'environnement est ajoutée par le service de stockage). */
export const DOSSIER_PUBLICATIONS = 'mtm/publications';

/** Formats de vidéo lisibles dans un navigateur : un autre format n'est pas accepté. */
const FORMATS_VIDEO = new Set(['mp4', 'mov', 'm4v', 'webm']);
/** Au-delà, ce n'est plus un conseil mais un film : on invite à le découper. */
const DUREE_MAX_SECONDES = 20 * 60;

/** Première heure du jour (UTC) : une publication « du 15 » est en ligne le 15 à minuit. */
const debutDeJournee = (jour: string): Date =>
  new Date(`${jour.slice(0, 10)}T00:00:00.000Z`);

/**
 * Vidéos de la page « Actualités et conseils » du site public : conseils, actualités du foncier,
 * de la construction… Le site ne montre que ce qui est publié, doté d'une vidéo et dont la date
 * de publication est atteinte.
 */
@Injectable()
export class PublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Ce que le site public affiche : la vidéo à la une d'abord, puis les plus récentes. */
  async findPublic(maintenant = new Date()) {
    const lignes = await this.prisma.publication.findMany({
      where: {
        isActive: true,
        storageKey: { not: null },
        OR: [
          { datePublication: null },
          { datePublication: { lte: maintenant } },
        ],
      },
      orderBy: [
        { misEnAvant: 'desc' },
        { datePublication: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
    return lignes.map((publication) => ({
      id: publication.id,
      titre: publication.titre,
      categorie: publication.categorie,
      resume: publication.resume,
      videoUrl: this.videoUrl(publication),
      posterUrl: this.posterUrl(publication),
      dureeSecondes: publication.dureeSecondes,
      largeur: publication.largeur,
      hauteur: publication.hauteur,
      datePublication: (publication.datePublication ?? publication.createdAt)
        .toISOString(),
      misEnAvant: publication.misEnAvant,
    }));
  }

  async findAllAdmin() {
    const maintenant = new Date();
    const lignes = await this.prisma.publication.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    return lignes.map((publication) => this.pourAdmin(publication, maintenant));
  }

  /** Une publication neuve naît brouillon : on y ajoute la vidéo, puis on la publie. */
  async create(dto: CreatePublicationDto) {
    const publication = await this.prisma.$transaction(async (tx) => {
      if (dto.misEnAvant) {
        await tx.publication.updateMany({
          where: { misEnAvant: true },
          data: { misEnAvant: false },
        });
      }
      return tx.publication.create({
        data: {
          titre: dto.titre.trim(),
          categorie: dto.categorie ?? 'conseil',
          resume: dto.resume?.trim() || undefined,
          datePublication: dto.datePublication
            ? debutDeJournee(dto.datePublication)
            : undefined,
          misEnAvant: dto.misEnAvant ?? false,
          isActive: false,
        },
      });
    });
    return this.pourAdmin(publication, new Date());
  }

  async update(id: string, dto: UpdatePublicationDto) {
    await this.ensureExists(id);
    const publication = await this.prisma.$transaction(async (tx) => {
      if (dto.misEnAvant) {
        await tx.publication.updateMany({
          where: { misEnAvant: true, id: { not: id } },
          data: { misEnAvant: false },
        });
      }
      return tx.publication.update({
        where: { id },
        data: {
          ...(dto.titre !== undefined ? { titre: dto.titre.trim() } : {}),
          ...(dto.categorie !== undefined ? { categorie: dto.categorie } : {}),
          // Une chaîne vidée efface le champ au lieu de laisser un blanc.
          ...(dto.resume !== undefined
            ? { resume: dto.resume.trim() || null }
            : {}),
          ...(dto.datePublication !== undefined
            ? {
                datePublication: dto.datePublication
                  ? debutDeJournee(dto.datePublication)
                  : null,
              }
            : {}),
          ...(dto.misEnAvant !== undefined
            ? { misEnAvant: dto.misEnAvant }
            : {}),
        },
      });
    });
    return this.pourAdmin(publication, new Date());
  }

  async setActive(id: string, isActive: boolean) {
    const existante = await this.ensureExists(id);
    if (isActive && !existante.storageKey) {
      throw new BadRequestException(
        'Ajoutez d’abord la vidéo : une publication sans vidéo ne peut pas être publiée',
      );
    }
    const publication = await this.prisma.publication.update({
      where: { id },
      data: { isActive },
    });
    return this.pourAdmin(publication, new Date());
  }

  /** Autorisation d'envoi direct d'une vidéo vers Cloudinary (le navigateur envoie, l'API ne voit pas le fichier). */
  autorisationEnvoi() {
    return this.cloudinary.signedUploadParams(DOSSIER_PUBLICATIONS);
  }

  /**
   * Rattache à la publication une vidéo que le navigateur vient d'envoyer à Cloudinary.
   * L'API vérifie que l'identifiant est bien dans le dossier des publications et que Cloudinary
   * connaît cette vidéo (format, durée, taille) : elle ne croit pas ce que dit le navigateur.
   */
  async attacherVideo(id: string, dto: AttacherVideoDto) {
    const existante = await this.ensureExists(id);
    const prefixe = `${this.cloudinary.dossier(DOSSIER_PUBLICATIONS)}/`;
    if (!dto.publicId.startsWith(prefixe)) {
      throw new BadRequestException(
        'Cette vidéo n’a pas été envoyée depuis le formulaire de publication',
      );
    }
    const info = await this.cloudinary.videoInfo(dto.publicId);
    if (info.bytes <= 0) {
      throw new BadRequestException('La vidéo envoyée est vide');
    }
    if (!info.format || !FORMATS_VIDEO.has(info.format.toLowerCase())) {
      throw new BadRequestException(
        'Format de vidéo non accepté : utilisez un fichier MP4 (H.264), MOV ou WebM',
      );
    }
    if (info.duration !== null && info.duration > DUREE_MAX_SECONDES) {
      throw new BadRequestException(
        'La vidéo dépasse 20 minutes : découpez-la en plusieurs conseils plus courts',
      );
    }

    const publication = await this.prisma.publication.update({
      where: { id },
      data: {
        storageKey: dto.publicId,
        dureeSecondes:
          info.duration !== null ? Math.round(info.duration) : null,
        largeur: info.width,
        hauteur: info.height,
        tailleOctets: info.bytes,
      },
    });
    if (existante.storageKey && existante.storageKey !== dto.publicId) {
      await this.cloudinary.destroy(existante.storageKey, 'video', true);
    }
    return this.pourAdmin(publication, new Date());
  }

  async remove(id: string): Promise<void> {
    const existante = await this.ensureExists(id);
    await this.prisma.publication.delete({ where: { id } });
    if (existante.storageKey) {
      await this.cloudinary.destroy(existante.storageKey, 'video', true);
    }
  }

  /** Où en est la diffusion d'une publication, à l'instant donné. */
  static statut(
    publication: Pick<Publication, 'storageKey' | 'isActive' | 'datePublication'>,
    maintenant: Date,
  ): StatutPublication {
    if (!publication.storageKey) return 'sans_video';
    if (!publication.isActive) return 'brouillon';
    if (publication.datePublication && publication.datePublication > maintenant) {
      return 'programmee';
    }
    return 'en_ligne';
  }

  private pourAdmin(publication: Publication, maintenant: Date) {
    return {
      ...publication,
      videoUrl: this.videoUrl(publication),
      posterUrl: this.posterUrl(publication),
      statut: PublicationService.statut(publication, maintenant),
    };
  }

  private videoUrl(publication: Publication): string | null {
    return publication.storageKey
      ? this.cloudinary.videoUrl(publication.storageKey, publication.tailleOctets)
      : null;
  }

  private posterUrl(publication: Publication): string | null {
    return publication.storageKey
      ? this.cloudinary.videoPosterUrl(publication.storageKey, 2)
      : null;
  }

  private async ensureExists(id: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id },
    });
    if (!publication) throw new NotFoundException('Publication introuvable');
    return publication;
  }
}
