import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { TerrainsAccessService } from './terrains-access.service';
import { mediaOrderBy } from './terrain-queries';
import { CreateTerrainDto } from './dto/create-terrain.dto';
import { QueryTerrainDto } from './dto/query-terrain.dto';
import { UpdateTerrainDto } from './dto/update-terrain.dto';
import { SettingsService } from '../settings/settings.service';

const terrainInclude = {
  proprietaire: true,
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  medias: { orderBy: mediaOrderBy },
  documents: { orderBy: { createdAt: 'desc' as const } },
};

export const DEFAULT_TERRAIN_OPTIONS = {
  statutJuridique: [
    'Titre foncier',
    'Bail',
    'Délibération',
    'Morcellement',
    'Régularisation en cours',
  ],
  niveauVerification: ['Non vérifié', 'En cours', 'Vérifié', 'À compléter'],
  statutCommercial: ['Brouillon', 'Disponible', 'Réservé', 'Vendu', 'Suspendu'],
} as const;

/**
 * Fiche terrain interne (J1.1, section 8 CDC) : recherche dans le périmètre
 * de l'utilisateur, création, mise à jour avec justification des champs
 * sensibles, changement de statut, référentiels. Le catalogue public, les
 * médias/documents et les règles d'accès sont portés par les services voisins.
 */
@Injectable()
export class TerrainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly settings: SettingsService,
    private readonly access: TerrainsAccessService,
  ) {}

  async findAll(
    query: QueryTerrainDto,
    user?: { roles: string[]; permissions: string[] },
  ) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const ownership = this.access.ownershipFilter(user);
    const where = {
      ...ownership,
      ...(search
        ? {
            OR: [
              {
                referenceInterne: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { nom: { contains: search, mode: 'insensitive' as const } },
              {
                parcelleMatricule: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { commune: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.statutJuridique
        ? { statutJuridique: query.statutJuridique }
        : {}),
      ...(query.niveauVerification
        ? { niveauVerification: query.niveauVerification }
        : {}),
      ...(query.statutCommercial
        ? { statutCommercial: query.statutCommercial }
        : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.commune ? { commune: query.commune } : {}),
      ...(query.vocation ? { vocation: query.vocation } : {}),
      ...(query.proprietaireId ? { proprietaireId: query.proprietaireId } : {}),
      ...(query.superficieMin !== undefined || query.superficieMax !== undefined
        ? {
            superficie: {
              ...(query.superficieMin !== undefined
                ? { gte: query.superficieMin }
                : {}),
              ...(query.superficieMax !== undefined
                ? { lte: query.superficieMax }
                : {}),
            },
          }
        : {}),
      ...(query.prixPublicMin !== undefined || query.prixPublicMax !== undefined
        ? {
            prixPublic: {
              ...(query.prixPublicMin !== undefined
                ? { gte: query.prixPublicMin }
                : {}),
              ...(query.prixPublicMax !== undefined
                ? { lte: query.prixPublicMax }
                : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.terrain.findMany({
        where,
        include: terrainInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.terrain.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toInternal(item, user)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, user?: { roles: string[]; permissions: string[] }) {
    const terrain = await this.prisma.terrain.findFirst({
      where: { id, ...this.access.ownershipFilter(user) },
      include: terrainInclude,
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');
    return this.toInternal(terrain, user);
  }

  async create(
    dto: CreateTerrainDto,
    user: { roles: string[]; permissions: string[] },
  ) {
    const existing = await this.prisma.terrain.findUnique({
      where: { referenceInterne: dto.referenceInterne },
    });
    if (existing)
      throw new ConflictException('Une référence terrain existe déjà');
    await this.validateStatuses(dto);

    const data = { ...dto } as unknown as Prisma.TerrainUncheckedCreateInput;
    if (
      dto.prixPublic !== undefined &&
      dto.prixAcquisition !== undefined &&
      (dto.marge === undefined || dto.marge === null)
    ) {
      data.marge = Number(dto.prixPublic) - Number(dto.prixAcquisition);
    }

    const terrain = await this.prisma.terrain.create({
      data,
      include: terrainInclude,
    });
    return this.toInternal(terrain, user);
  }

  async update(
    id: string,
    dto: UpdateTerrainDto,
    user: { roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    await this.validateStatuses(dto);
    this.assertJustificationForSensitiveFields(
      dto as unknown as Record<string, unknown>,
    );
    const terrainData = { ...dto } as Record<string, unknown>;
    delete terrainData['justification'];

    if (
      dto.prixPublic !== undefined &&
      dto.prixAcquisition !== undefined &&
      (dto.marge === undefined || dto.marge === null)
    ) {
      terrainData['marge'] =
        Number(dto.prixPublic) - Number(dto.prixAcquisition);
    }

    const terrain = await this.prisma.terrain.update({
      where: { id },
      data: terrainData,
      include: terrainInclude,
    });
    return this.toInternal(terrain, user);
  }

  async updateStatus(
    id: string,
    field: 'statutJuridique' | 'niveauVerification' | 'statutCommercial',
    value: string,
    justification: string | undefined,
    user: { roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    await this.validateStatuses({ [field]: value });
    if (field === 'statutJuridique' && !justification?.trim()) {
      throw new BadRequestException(
        'Une justification est obligatoire pour modifier le statut juridique d’un terrain',
      );
    }
    const terrain = await this.prisma.terrain.update({
      where: { id },
      data: { [field]: value },
      include: terrainInclude,
    });
    return this.toInternal(terrain, user);
  }

  async getOptions() {
    const [legal, verification, commercial] = await Promise.all([
      this.settings.getRawValue('terrains.statutJuridique'),
      this.settings.getRawValue('terrains.niveauVerification'),
      this.settings.getRawValue('terrains.statutCommercial'),
    ]);
    return {
      statutJuridique: SettingsService.asStringList(
        legal,
        DEFAULT_TERRAIN_OPTIONS.statutJuridique,
      ),
      niveauVerification: SettingsService.asStringList(
        verification,
        DEFAULT_TERRAIN_OPTIONS.niveauVerification,
      ),
      statutCommercial: SettingsService.asStringList(
        commercial,
        DEFAULT_TERRAIN_OPTIONS.statutCommercial,
      ),
    };
  }

  private async validateStatuses(
    data: Partial<
      Pick<
        CreateTerrainDto,
        'statutJuridique' | 'niveauVerification' | 'statutCommercial'
      >
    >,
  ): Promise<void> {
    const fields = [
      'statutJuridique',
      'niveauVerification',
      'statutCommercial',
    ] as const;

    for (const field of fields) {
      await this.settings.assertInList(
        `terrains.${field}`,
        DEFAULT_TERRAIN_OPTIONS[field],
        data[field],
        `Statut de terrain invalide : ${field}`,
      );
    }
  }

  private static readonly SENSITIVE_FIELDS = [
    'prixAcquisition',
    'marge',
    'commission',
    'proprietaireId',
  ] as const;

  private assertJustificationForSensitiveFields(
    dto: Record<string, unknown>,
  ): void {
    const touchesSensitiveField = TerrainsService.SENSITIVE_FIELDS.some(
      (field) => dto[field] !== undefined,
    );
    if (
      touchesSensitiveField &&
      !(typeof dto['justification'] === 'string' && dto['justification'].trim())
    ) {
      throw new BadRequestException(
        'Une justification est obligatoire pour modifier un champ sensible (prix d’acquisition, marge, commission, propriétaire)',
      );
    }
  }

  private toInternal<T extends Record<string, unknown>>(
    terrain: T,
    user?: { roles?: string[]; permissions?: string[] },
  ): T {
    const value: T & {
      medias?: Array<Record<string, unknown>>;
      documents?: Array<Record<string, unknown>>;
    } = terrain;

    const hasFinancialAccess =
      !user ||
      user.roles?.includes('administrateur') ||
      user.roles?.includes('direction') ||
      user.permissions?.includes('terrains:consulter_financier');

    const result = {
      ...terrain,
      ...(!hasFinancialAccess && {
        prixAcquisition: null,
        marge: null,
        commission: null,
        notesInternes: null,
      }),
      medias: value.medias?.map((asset) => ({
        ...asset,
        secureUrl: this.cloudinary.url(
          String(asset.storageKey),
          typeof asset.resourceType === 'string' ? asset.resourceType : 'image',
          Boolean(asset.isPublic),
        ),
      })),
      documents: value.documents?.map((asset) => ({
        ...asset,
        secureUrl: this.cloudinary.url(
          String(asset.storageKey),
          typeof asset.resourceType === 'string' ? asset.resourceType : 'raw',
          Boolean(asset.isPublic),
        ),
      })),
    };
    return result;
  }
}
