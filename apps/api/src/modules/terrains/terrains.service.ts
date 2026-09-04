import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateTerrainDto } from './dto/create-terrain.dto';
import { QueryTerrainDto } from './dto/query-terrain.dto';
import { UpdateTerrainDto } from './dto/update-terrain.dto';
import { CreateTerrainAssetDto } from './dto/create-terrain-asset.dto';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import type { PublicTerrainResponse } from './dto/public-terrain.dto';

const terrainInclude = {
  proprietaire: true,
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  medias: { orderBy: { sortOrder: 'asc' as const } },
  documents: { orderBy: { createdAt: 'desc' as const } },
};

const publicTerrainSelect = {
  id: true,
  referenceInterne: true,
  nom: true,
  statutJuridique: true,
  niveauVerification: true,
  region: true,
  commune: true,
  localisationDetail: true,
  latitude: true,
  longitude: true,
  superficie: true,
  uniteSuperficie: true,
  dimensions: true,
  prixPublic: true,
  misEnAvant: true,
  accesRoutier: true,
  eauDisponible: true,
  electriciteDisponible: true,
  voisinage: true,
  vocation: true,
  proximiteAxes: true,
  pointsInteret: true,
  medias: {
    where: { isPublic: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  documents: {
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

const DEFAULT_TERRAIN_OPTIONS = {
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

@Injectable()
export class TerrainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly settings: SettingsService,
  ) {}

  async findAll(
    query: QueryTerrainDto,
    user?: { roles: string[]; permissions: string[] },
  ) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const where = {
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

  async findOne(
    id: string,
    user?: { roles: string[]; permissions: string[] },
  ) {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      include: terrainInclude,
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');
    return this.toInternal(terrain, user);
  }

  async findPublic(query: QueryTerrainDto) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const where = {
      statutCommercial: 'Disponible',
      ...(query.misEnAvant !== undefined
        ? { misEnAvant: query.misEnAvant }
        : {}),
      ...(query.statutJuridique
        ? { statutJuridique: query.statutJuridique }
        : {}),
      ...(query.niveauVerification
        ? { niveauVerification: query.niveauVerification }
        : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.commune ? { commune: query.commune } : {}),
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
        select: publicTerrainSelect,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.terrain.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toPublic(item)),
      total,
      page,
      pageSize,
    };
  }

  async findPublicOne(id: string) {
    const terrain = await this.prisma.terrain.findFirst({
      where: { id, statutCommercial: 'Disponible' },
      select: publicTerrainSelect,
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');
    return this.toPublic(terrain);
  }

  async create(dto: CreateTerrainDto) {
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
    return this.toInternal(terrain);
  }

  async update(id: string, dto: UpdateTerrainDto) {
    await this.ensureExists(id);
    await this.validateStatuses(dto);
    const terrainData = { ...dto } as Record<string, unknown>;
    delete terrainData['justification'];

    if (
      dto.prixPublic !== undefined &&
      dto.prixAcquisition !== undefined &&
      (dto.marge === undefined || dto.marge === null)
    ) {
      terrainData['marge'] = Number(dto.prixPublic) - Number(dto.prixAcquisition);
    }

    const terrain = await this.prisma.terrain.update({
      where: { id },
      data: terrainData as unknown as Prisma.TerrainUncheckedUpdateInput,
      include: terrainInclude,
    });
    return this.toInternal(terrain);
  }

  async updateStatus(
    id: string,
    field: 'statutJuridique' | 'niveauVerification' | 'statutCommercial',
    value: string,
  ) {
    await this.ensureExists(id);
    await this.validateStatuses({ [field]: value });
    const terrain = await this.prisma.terrain.update({
      where: { id },
      data: { [field]: value },
      include: terrainInclude,
    });
    return this.toInternal(terrain);
  }

  async getOptions() {
    const [legal, verification, commercial] = await Promise.all([
      this.settings.getRawValue('terrains.statutJuridique'),
      this.settings.getRawValue('terrains.niveauVerification'),
      this.settings.getRawValue('terrains.statutCommercial'),
    ]);
    return {
      statutJuridique: this.asOptions(legal, [
        'Titre foncier',
        'Bail',
        'Délibération',
        'Morcellement',
        'Régularisation en cours',
      ]),
      niveauVerification: this.asOptions(verification, [
        'Non vérifié',
        'En cours',
        'Vérifié',
        'À compléter',
      ]),
      statutCommercial: this.asOptions(commercial, [
        'Brouillon',
        'Disponible',
        'Réservé',
        'Vendu',
        'Suspendu',
      ]),
    };
  }

  async addMedia(
    id: string,
    dto: CreateTerrainAssetDto,
    file: Express.Multer.File,
  ) {
    await this.ensureExists(id);
    this.validateFileSize(file);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/terrains/${id}/media`,
      dto.isPublic ?? false,
    );
    return this.prisma.terrainMedia.create({
      data: {
        terrainId: id,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  async addDocument(
    id: string,
    dto: CreateTerrainAssetDto,
    file: Express.Multer.File,
  ) {
    await this.ensureExists(id);
    this.validateFileSize(file);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/terrains/${id}/documents`,
      dto.isPublic ?? false,
    );
    return this.prisma.terrainDocument.create({
      data: {
        terrainId: id,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  async removeMedia(id: string, mediaId: string): Promise<void> {
    const media = await this.prisma.terrainMedia.findFirst({
      where: { id: mediaId, terrainId: id },
    });
    if (!media) return;
    await this.prisma.terrainMedia.delete({ where: { id: mediaId } });
    await this.cloudinary.destroy(
      media.storageKey,
      media.resourceType,
      media.isPublic,
    );
  }

  async removeDocument(id: string, documentId: string): Promise<void> {
    const document = await this.prisma.terrainDocument.findFirst({
      where: { id: documentId, terrainId: id },
    });
    if (!document) return;
    await this.prisma.terrainDocument.delete({ where: { id: documentId } });
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      document.isPublic,
    );
  }

  toPublic(terrain: Record<string, unknown>): PublicTerrainResponse {
    const source = terrain as {
      id: string;
      referenceInterne: string;
      nom: string;
      statutJuridique: string;
      niveauVerification: string;
      region: string | null;
      commune: string | null;
      localisationDetail: string | null;
      latitude: number | null;
      longitude: number | null;
      superficie: number | null;
      uniteSuperficie: string | null;
      dimensions: Record<string, unknown> | null;
      prixPublic: number | null;
      misEnAvant: boolean;
      accesRoutier: string | null;
      eauDisponible: boolean | null;
      electriciteDisponible: boolean | null;
      voisinage: string | null;
      vocation: string | null;
      proximiteAxes: string | null;
      pointsInteret: Record<string, unknown> | null;
      medias: Array<{
        id: string;
        type: string;
        title: string | null;
        isPublic: boolean;
        sortOrder: number;
        storageKey: string;
        resourceType: string;
        capturedAt: string | null;
        createdAt: string;
      }> | null;
      documents: Array<{
        id: string;
        type: string;
        title: string | null;
        isPublic: boolean;
        version: number;
        storageKey: string;
        resourceType: string;
        createdAt: string;
      }> | null;
      createdAt: string;
      updatedAt: string;
    };

    const medias =
      source.medias?.map((media) => ({
        id: media.id,
        type: media.type,
        title: media.title,
        isPublic: media.isPublic,
        sortOrder: media.sortOrder,
        secureUrl: this.cloudinary.url(
          media.storageKey,
          media.resourceType,
          true,
        ),
        capturedAt: media.capturedAt,
        createdAt: media.createdAt,
      })) ?? [];

    const documents =
      source.documents?.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        isPublic: document.isPublic,
        version: document.version,
        secureUrl: this.cloudinary.url(
          document.storageKey,
          document.resourceType,
          true,
        ),
        createdAt: document.createdAt,
      })) ?? [];

    return {
      id: source.id,
      referenceInterne: source.referenceInterne,
      nom: source.nom,
      statutJuridique: source.statutJuridique,
      niveauVerification: source.niveauVerification,
      region: source.region,
      commune: source.commune,
      localisationDetail: source.localisationDetail,
      latitude: source.latitude,
      longitude: source.longitude,
      superficie: source.superficie,
      uniteSuperficie: source.uniteSuperficie,
      dimensions: source.dimensions,
      prixPublic: source.prixPublic,
      misEnAvant: source.misEnAvant,
      accesRoutier: source.accesRoutier,
      eauDisponible: source.eauDisponible,
      electriciteDisponible: source.electriciteDisponible,
      voisinage: source.voisinage,
      vocation: source.vocation,
      proximiteAxes: source.proximiteAxes,
      pointsInteret: source.pointsInteret,
      medias,
      documents,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.terrain.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Terrain introuvable');
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
      const value = data[field];
      if (value === undefined) continue;
      const configured = await this.settings.getRawValue(`terrains.${field}`);
      const allowed: string[] = Array.isArray(configured)
        ? configured.filter((item): item is string => typeof item === 'string')
        : [...DEFAULT_TERRAIN_OPTIONS[field]];
      if (!allowed.includes(value)) {
        throw new BadRequestException(`Statut de terrain invalide : ${field}`);
      }
    }
  }

  private validateFileSize(file: Express.Multer.File): void {
    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('Le fichier ne doit pas dépasser 10 Mo');
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
    return result as T;
  }

  private asOptions(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : fallback;
  }
}
