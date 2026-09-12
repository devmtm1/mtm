import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import { QueryTerrainDto } from './dto/query-terrain.dto';
import type {
  PublicPointInteret,
  PublicTerrainResponse,
} from './dto/public-terrain.dto';
import { DEFAULT_TERRAIN_OPTIONS } from './terrains.service';
import { publicTerrainSelect } from './terrain-queries';

/**
 * Catalogue public des terrains (J1.2, sections 5-7 et 11 CDC). Seuls les
 * terrains « Disponible » sont exposés, uniquement via la projection
 * `publicTerrainSelect` : ce service est le seul point de sortie des données
 * terrain vers le site vitrine.
 */
@Injectable()
export class TerrainsPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly settings: SettingsService,
  ) {}

  async findPublic(query: QueryTerrainDto) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const where = {
      statutCommercial: 'Disponible',
      // Recherche libre du catalogue public : restreinte aux champs publics
      // (jamais parcelleMatricule ni notes internes).
      ...(search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' as const } },
              {
                referenceInterne: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { commune: { contains: search, mode: 'insensitive' as const } },
              { region: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
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
      ...(query.vocation ? { vocation: query.vocation } : {}),
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

  /**
   * Options des filtres du catalogue public. Les statuts juridiques viennent
   * du paramétrage administrable (section 25 CDC) ; les zones et vocations
   * sont dérivées des terrains réellement publiés, pour que les filtres
   * proposés correspondent toujours aux données disponibles.
   */
  async getPublicFilterOptions() {
    const [legal, published] = await Promise.all([
      this.settings.getRawValue('terrains.statutJuridique'),
      this.prisma.terrain.findMany({
        where: { statutCommercial: 'Disponible' },
        select: { region: true, commune: true, vocation: true },
      }),
    ]);

    const distinct = (values: (string | null)[]): string[] =>
      [
        ...new Set(
          values.filter((value): value is string => Boolean(value?.trim())),
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr'));

    return {
      statutJuridique: SettingsService.asStringList(
        legal,
        DEFAULT_TERRAIN_OPTIONS.statutJuridique,
      ),
      region: distinct(published.map((terrain) => terrain.region)),
      commune: distinct(published.map((terrain) => terrain.commune)),
      vocation: distinct(published.map((terrain) => terrain.vocation)),
    };
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
      description: string | null;
      accesRoutier: string | null;
      eauDisponible: boolean | null;
      electriciteDisponible: boolean | null;
      voisinage: string | null;
      vocation: string | null;
      proximiteAxes: string | null;
      pointsInteret: PublicPointInteret[] | null;
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
      description: source.description,
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
}
