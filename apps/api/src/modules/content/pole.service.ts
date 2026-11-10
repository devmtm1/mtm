import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { hasAnyRole, PUBLISHER_ROLES } from '../rbac/role-groups';
import { CreatePoleDto } from './dto/create-pole.dto';
import { UpdatePoleDto } from './dto/update-pole.dto';

/** Identifiant lisible d'un pôle, pour l'ancre de la page : « MTM Clean » → « mtm-clean ». */
export function slugDe(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Des puces propres : sans blancs, sans lignes vides. */
function nettoyerPoints(points: string[] | undefined): string[] | undefined {
  return points?.map((p) => p.trim()).filter(Boolean);
}

@Injectable()
export class PoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Site public : uniquement ce qui s'affiche, jamais d'identifiant de stockage. */
  async findPublic() {
    const lignes = await this.prisma.pole.findMany({
      where: { isActive: true },
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
    return lignes.map((p, index) => ({
      id: p.id,
      slug: p.slug,
      numero: String(index + 1).padStart(2, '0'),
      nom: p.nom,
      accroche: p.accroche,
      description: p.description,
      points: p.points,
      imageUrl: this.imageUrl(p),
      lienUrl: p.lienUrl,
      libelleLien: p.libelleLien,
      surAccueil: p.surAccueil,
      lies: p.lies,
    }));
  }

  async findAllAdmin() {
    const lignes = await this.prisma.pole.findMany({
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
    return lignes.map((p) => ({ ...p, imageUrl: this.imageUrl(p) }));
  }

  async create(
    dto: CreatePoleDto,
    user: { roles: string[]; permissions: string[] },
  ) {
    // Créer et publier sont deux droits distincts, comme pour les réalisations.
    const peutPublier =
      hasAnyRole(user.roles, PUBLISHER_ROLES) ||
      user.permissions.includes('content:publier');
    const pole = await this.prisma.pole.create({
      data: {
        slug: await this.slugLibre(slugDe(dto.nom)),
        nom: dto.nom.trim(),
        accroche: dto.accroche?.trim() || undefined,
        description: dto.description?.trim() || undefined,
        points: nettoyerPoints(dto.points) ?? [],
        lienUrl: dto.lienUrl?.trim() || undefined,
        libelleLien: dto.libelleLien?.trim() || undefined,
        ordre: dto.ordre ?? 0,
        surAccueil: dto.surAccueil ?? false,
        lies: dto.lies ?? [],
        isActive: Boolean((dto.isActive ?? false) && peutPublier),
      },
    });
    return { ...pole, imageUrl: this.imageUrl(pole) };
  }

  async update(id: string, dto: UpdatePoleDto) {
    await this.ensureExists(id);
    const pole = await this.prisma.pole.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined ? { nom: dto.nom.trim() } : {}),
        // Une chaîne vidée efface le champ au lieu de laisser un blanc.
        ...(dto.accroche !== undefined
          ? { accroche: dto.accroche.trim() || null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.points !== undefined
          ? { points: nettoyerPoints(dto.points) }
          : {}),
        ...(dto.lienUrl !== undefined
          ? { lienUrl: dto.lienUrl.trim() || null }
          : {}),
        ...(dto.libelleLien !== undefined
          ? { libelleLien: dto.libelleLien.trim() || null }
          : {}),
        ...(dto.ordre !== undefined ? { ordre: dto.ordre } : {}),
        ...(dto.surAccueil !== undefined ? { surAccueil: dto.surAccueil } : {}),
        ...(dto.lies !== undefined ? { lies: dto.lies } : {}),
      },
    });
    return { ...pole, imageUrl: this.imageUrl(pole) };
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    const pole = await this.prisma.pole.update({
      where: { id },
      data: { isActive },
    });
    return { ...pole, imageUrl: this.imageUrl(pole) };
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    const pole = await this.ensureExists(id);
    validateUploadedAsset(file, 'media');
    const envoye = await this.cloudinary.upload(file, 'mtm/poles', true);
    if (pole.storageKey) {
      await this.cloudinary.destroy(pole.storageKey, pole.resourceType, true);
    }
    const mis = await this.prisma.pole.update({
      where: { id },
      data: { storageKey: envoye.publicId, resourceType: envoye.resourceType },
    });
    return { ...mis, imageUrl: this.imageUrl(mis) };
  }

  async remove(id: string): Promise<void> {
    const pole = await this.ensureExists(id);
    await this.prisma.pole.delete({ where: { id } });
    if (pole.storageKey) {
      await this.cloudinary.destroy(pole.storageKey, pole.resourceType, true);
    }
  }

  /** La photo envoyée, sinon celle fournie avec le site, sinon rien (le site affiche alors un fond de marque). */
  private imageUrl(p: {
    storageKey: string | null;
    resourceType: string;
    imageDefaut: string | null;
  }): string | null {
    if (p.storageKey) {
      return this.cloudinary.url(p.storageKey, p.resourceType, true) || null;
    }
    return p.imageDefaut;
  }

  /** « mtm-clean », puis « mtm-clean-2 »… : l'ancre d'un pôle ne doit jamais en recouvrir un autre. */
  private async slugLibre(base: string): Promise<string> {
    const racine = base || 'pole';
    for (let n = 1; ; n += 1) {
      const candidat = n === 1 ? racine : `${racine}-${n}`;
      const pris = await this.prisma.pole.findUnique({
        where: { slug: candidat },
        select: { id: true },
      });
      if (!pris) return candidat;
    }
  }

  private async ensureExists(id: string) {
    const pole = await this.prisma.pole.findUnique({ where: { id } });
    if (!pole) throw new NotFoundException('Pôle introuvable');
    return pole;
  }
}
