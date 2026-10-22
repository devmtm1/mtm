import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { EtatDesLieuxDto } from './dto/etat-des-lieux.dto';
import {
  comparerEtats,
  compterDegradations,
  lirePieces,
  type ComparaisonPiece,
} from './etat-des-lieux.helper';

export type CibleEtat = { sejourId: string } | { bailLocatifId: string };
export type TypeEtat = 'entree' | 'sortie';

const etatInclude = {
  photos: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.EtatDesLieuxInclude;

type EtatLu = Prisma.EtatDesLieuxGetPayload<{ include: typeof etatInclude }>;

/**
 * États des lieux d'entrée et de sortie, d'un séjour ou d'un bail. Un seul par
 * type et par séjour (ou bail) : on corrige, on ne duplique pas. La comparaison
 * entrée / sortie sert à justifier une retenue sur la caution.
 */
@Injectable()
export class EtatsDesLieuxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: LocatifAccessService,
  ) {}

  /** Entrée, sortie et ce qui s'est dégradé entre les deux. */
  presenter(etats: EtatLu[]) {
    const vue = (etat: EtatLu | undefined) =>
      etat
        ? {
            id: etat.id,
            type: etat.type,
            dateEtat: etat.dateEtat,
            pieces: lirePieces(etat.pieces),
            releveEau: etat.releveEau,
            releveElectricite: etat.releveElectricite,
            nombreCles: etat.nombreCles,
            observations: etat.observations,
            signataire: etat.signataire,
            photos: etat.photos.map((photo) => ({
              id: photo.id,
              legende: photo.legende,
              // Photos de l'intérieur d'un logement : jamais publiques.
              url: this.cloudinary.url(
                photo.storageKey,
                photo.resourceType,
                false,
              ),
            })),
          }
        : null;
    const entree = vue(etats.find((etat) => etat.type === 'entree'));
    const sortie = vue(etats.find((etat) => etat.type === 'sortie'));
    const comparaison: ComparaisonPiece[] =
      entree && sortie ? comparerEtats(entree.pieces, sortie.pieces) : [];
    return {
      entree,
      sortie,
      comparaison,
      degradations: compterDegradations(comparaison),
    };
  }

  async lire(cible: CibleEtat, user: LocatifUser) {
    await this.verifierAcces(cible, user);
    const etats = await this.prisma.etatDesLieux.findMany({
      where: this.filtre(cible),
      include: etatInclude,
    });
    return this.presenter(etats);
  }

  async enregistrer(
    cible: CibleEtat,
    type: string,
    dto: EtatDesLieuxDto,
    user: LocatifUser,
  ) {
    const typeEtat = this.assertType(type);
    await this.verifierAcces(cible, user);
    await this.assertMomentCoherent(cible, typeEtat);

    const donnees = {
      dateEtat: dto.dateEtat ? new Date(dto.dateEtat) : new Date(),
      pieces: dto.pieces.map((piece) => ({
        piece: piece.piece.trim(),
        etat: piece.etat,
        observation: piece.observation?.trim() || null,
      })) as unknown as Prisma.InputJsonValue,
      releveEau: dto.releveEau?.trim() || null,
      releveElectricite: dto.releveElectricite?.trim() || null,
      nombreCles: dto.nombreCles ?? null,
      observations: dto.observations?.trim() || null,
      signataire: dto.signataire?.trim() || null,
      realiseParId: user.id,
    };
    const existant = await this.prisma.etatDesLieux.findFirst({
      where: { ...this.filtre(cible), type: typeEtat },
      select: { id: true },
    });
    if (existant) {
      await this.prisma.etatDesLieux.update({
        where: { id: existant.id },
        data: donnees,
      });
    } else {
      await this.prisma.etatDesLieux.create({
        data: { ...donnees, type: typeEtat, ...cible },
      });
    }
    return this.lire(cible, user);
  }

  async ajouterPhoto(
    etatId: string,
    file: Express.Multer.File,
    legende: string | undefined,
    user: LocatifUser,
  ) {
    const etat = await this.trouver(etatId, user);
    if (!file?.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Une photo (JPG, PNG ou WebP) est attendue',
      );
    }
    validateUploadedAsset(file, 'media');
    const envoye = await this.cloudinary.upload(
      file,
      `locatif/etats-des-lieux/${etat.id}`,
      false,
    );
    await this.prisma.etatDesLieuxPhoto.create({
      data: {
        etatId: etat.id,
        storageKey: envoye.publicId,
        resourceType: envoye.resourceType,
        legende: legende?.trim() || null,
      },
    });
    return this.relire(etat);
  }

  async supprimerPhoto(etatId: string, photoId: string, user: LocatifUser) {
    const etat = await this.trouver(etatId, user);
    const photo = await this.prisma.etatDesLieuxPhoto.findFirst({
      where: { id: photoId, etatId: etat.id },
    });
    if (!photo) throw new NotFoundException('Photo introuvable');
    await this.cloudinary.destroy(photo.storageKey, photo.resourceType, false);
    await this.prisma.etatDesLieuxPhoto.delete({ where: { id: photoId } });
    return this.relire(etat);
  }

  // --- internes ---

  private filtre(cible: CibleEtat): Prisma.EtatDesLieuxWhereInput {
    return 'sejourId' in cible
      ? { sejourId: cible.sejourId }
      : { bailLocatifId: cible.bailLocatifId };
  }

  private assertType(type: string): TypeEtat {
    if (type !== 'entree' && type !== 'sortie') {
      throw new BadRequestException(
        'Type d’état des lieux invalide : « entree » ou « sortie »',
      );
    }
    return type;
  }

  private async verifierAcces(cible: CibleEtat, user: LocatifUser) {
    if ('bailLocatifId' in cible) {
      await this.access.ensureBailAccessible(cible.bailLocatifId, user);
      return;
    }
    const sejour = await this.prisma.sejourLocatif.findUnique({
      where: { id: cible.sejourId },
      select: { bienLocatifId: true },
    });
    if (!sejour) throw new NotFoundException('Séjour introuvable');
    await this.access.ensureBienAccessible(sejour.bienLocatifId, user);
  }

  /**
   * Un état des lieux d'entrée se fait à l'arrivée du voyageur, celui de sortie à
   * son départ : pas sur une simple demande, ni sur un séjour annulé.
   */
  private async assertMomentCoherent(cible: CibleEtat, type: TypeEtat) {
    if (!('sejourId' in cible)) return;
    const sejour = await this.prisma.sejourLocatif.findUnique({
      where: { id: cible.sejourId },
      select: { statut: true },
    });
    if (!sejour) throw new NotFoundException('Séjour introuvable');
    const permis =
      type === 'entree'
        ? ['confirmee', 'en_cours', 'terminee']
        : ['en_cours', 'terminee'];
    if (!permis.includes(sejour.statut)) {
      throw new BadRequestException(
        type === 'entree'
          ? 'L’état des lieux d’entrée se fait sur un séjour confirmé.'
          : 'L’état des lieux de sortie se fait une fois le client arrivé.',
      );
    }
  }

  private async trouver(etatId: string, user: LocatifUser) {
    const etat = await this.prisma.etatDesLieux.findUnique({
      where: { id: etatId },
      select: { id: true, sejourId: true, bailLocatifId: true },
    });
    if (!etat) throw new NotFoundException('État des lieux introuvable');
    await this.verifierAcces(
      etat.sejourId
        ? { sejourId: etat.sejourId }
        : { bailLocatifId: etat.bailLocatifId as string },
      user,
    );
    return etat;
  }

  private async relire(etat: {
    sejourId: string | null;
    bailLocatifId: string | null;
  }) {
    const etats = await this.prisma.etatDesLieux.findMany({
      where: etat.sejourId
        ? { sejourId: etat.sejourId }
        : { bailLocatifId: etat.bailLocatifId as string },
      include: etatInclude,
    });
    return this.presenter(etats);
  }
}

export { etatInclude };
