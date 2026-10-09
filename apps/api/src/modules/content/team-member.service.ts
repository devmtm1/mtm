import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { hasAnyRole, PUBLISHER_ROLES } from '../rbac/role-groups';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

/** Natures qui n'existent qu'une fois : on modifie l'existante plutôt que d'en créer une seconde. */
const UNIQUES = ['directeur', 'groupe'];

@Injectable()
export class TeamMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Page publique : uniquement ce qui s'affiche (jamais d'identifiant de
   * stockage ni de date interne).
   */
  async findPublic() {
    const lignes = await this.prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
    const publique = (m: (typeof lignes)[number]) => ({
      id: m.id,
      nom: m.nom,
      poste: m.poste,
      message: m.message,
      imageUrl: this.imageUrl(m),
    });
    const directeur = lignes.find((m) => m.kind === 'directeur');
    const groupe = lignes.find((m) => m.kind === 'groupe');
    return {
      directeur: directeur ? publique(directeur) : null,
      groupe: groupe
        ? {
            id: groupe.id,
            legende: groupe.nom,
            imageUrl: this.imageUrl(groupe),
          }
        : null,
      membres: lignes.filter((m) => m.kind === 'membre').map(publique),
    };
  }

  async findAllAdmin() {
    const lignes = await this.prisma.teamMember.findMany({
      orderBy: [{ kind: 'asc' }, { ordre: 'asc' }, { createdAt: 'asc' }],
    });
    return lignes.map((m) => ({ ...m, imageUrl: this.imageUrl(m) }));
  }

  async create(
    dto: CreateTeamMemberDto,
    user: { roles: string[]; permissions: string[] },
  ) {
    if (UNIQUES.includes(dto.kind)) {
      const existe = await this.prisma.teamMember.count({
        where: { kind: dto.kind },
      });
      if (existe > 0) {
        throw new ConflictException(
          dto.kind === 'directeur'
            ? 'Le mot du directeur existe déjà : modifiez-le'
            : 'La photo de groupe existe déjà : modifiez-la',
        );
      }
    }
    // Créer et publier sont deux droits distincts, comme pour les réalisations.
    const peutPublier =
      hasAnyRole(user.roles, PUBLISHER_ROLES) ||
      user.permissions.includes('content:publier');
    const membre = await this.prisma.teamMember.create({
      data: {
        kind: dto.kind,
        nom: dto.nom.trim(),
        poste: dto.poste?.trim() || undefined,
        message: dto.message?.trim() || undefined,
        ordre: dto.ordre ?? 0,
        isActive: Boolean((dto.isActive ?? false) && peutPublier),
      },
    });
    return { ...membre, imageUrl: this.imageUrl(membre) };
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    await this.ensureExists(id);
    const membre = await this.prisma.teamMember.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.nom !== undefined ? { nom: dto.nom.trim() } : {}),
        // Une chaîne vidée efface le champ au lieu de laisser un blanc.
        ...(dto.poste !== undefined ? { poste: dto.poste.trim() || null } : {}),
        ...(dto.message !== undefined
          ? { message: dto.message.trim() || null }
          : {}),
      },
    });
    return { ...membre, imageUrl: this.imageUrl(membre) };
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    const membre = await this.prisma.teamMember.update({
      where: { id },
      data: { isActive },
    });
    return { ...membre, imageUrl: this.imageUrl(membre) };
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    const membre = await this.ensureExists(id);
    validateUploadedAsset(file, 'media');
    const envoye = await this.cloudinary.upload(file, 'mtm/equipe', true);
    if (membre.storageKey) {
      await this.cloudinary.destroy(
        membre.storageKey,
        membre.resourceType,
        true,
      );
    }
    const mis = await this.prisma.teamMember.update({
      where: { id },
      data: { storageKey: envoye.publicId, resourceType: envoye.resourceType },
    });
    return { ...mis, imageUrl: this.imageUrl(mis) };
  }

  async remove(id: string): Promise<void> {
    const membre = await this.ensureExists(id);
    await this.prisma.teamMember.delete({ where: { id } });
    if (membre.storageKey) {
      await this.cloudinary.destroy(
        membre.storageKey,
        membre.resourceType,
        true,
      );
    }
  }

  private imageUrl(m: { storageKey: string | null; resourceType: string }) {
    return m.storageKey
      ? this.cloudinary.url(m.storageKey, m.resourceType, true)
      : null;
  }

  private async ensureExists(id: string) {
    const membre = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!membre) throw new NotFoundException('Membre introuvable');
    return membre;
  }
}
