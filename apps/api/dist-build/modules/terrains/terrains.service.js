"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerrainsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const cloudinary_service_1 = require("../../common/storage/cloudinary.service");
const settings_service_1 = require("../settings/settings.service");
const terrainInclude = {
    proprietaire: true,
    commercialResponsable: {
        select: { id: true, firstName: true, lastName: true },
    },
    medias: { orderBy: { sortOrder: 'asc' } },
    documents: { orderBy: { createdAt: 'desc' } },
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
        orderBy: { sortOrder: 'asc' },
    },
    documents: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
    },
};
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
};
let TerrainsService = class TerrainsService {
    prisma;
    cloudinary;
    settings;
    constructor(prisma, cloudinary, settings) {
        this.prisma = prisma;
        this.cloudinary = cloudinary;
        this.settings = settings;
    }
    async findAll(query, user) {
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
                                mode: 'insensitive',
                            },
                        },
                        { nom: { contains: search, mode: 'insensitive' } },
                        {
                            parcelleMatricule: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                        { commune: { contains: search, mode: 'insensitive' } },
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
    async findOne(id, user) {
        const terrain = await this.prisma.terrain.findUnique({
            where: { id },
            include: terrainInclude,
        });
        if (!terrain)
            throw new common_1.NotFoundException('Terrain introuvable');
        return this.toInternal(terrain, user);
    }
    async findPublic(query) {
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
    async findPublicOne(id) {
        const terrain = await this.prisma.terrain.findFirst({
            where: { id, statutCommercial: 'Disponible' },
            select: publicTerrainSelect,
        });
        if (!terrain)
            throw new common_1.NotFoundException('Terrain introuvable');
        return this.toPublic(terrain);
    }
    async create(dto) {
        const existing = await this.prisma.terrain.findUnique({
            where: { referenceInterne: dto.referenceInterne },
        });
        if (existing)
            throw new common_1.ConflictException('Une référence terrain existe déjà');
        await this.validateStatuses(dto);
        const data = { ...dto };
        if (dto.prixPublic !== undefined &&
            dto.prixAcquisition !== undefined &&
            (dto.marge === undefined || dto.marge === null)) {
            data.marge = Number(dto.prixPublic) - Number(dto.prixAcquisition);
        }
        const terrain = await this.prisma.terrain.create({
            data,
            include: terrainInclude,
        });
        return this.toInternal(terrain);
    }
    async update(id, dto) {
        await this.ensureExists(id);
        await this.validateStatuses(dto);
        const terrainData = { ...dto };
        delete terrainData['justification'];
        if (dto.prixPublic !== undefined &&
            dto.prixAcquisition !== undefined &&
            (dto.marge === undefined || dto.marge === null)) {
            terrainData['marge'] = Number(dto.prixPublic) - Number(dto.prixAcquisition);
        }
        const terrain = await this.prisma.terrain.update({
            where: { id },
            data: terrainData,
            include: terrainInclude,
        });
        return this.toInternal(terrain);
    }
    async updateStatus(id, field, value) {
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
    async addMedia(id, dto, file) {
        await this.ensureExists(id);
        this.validateFileSize(file);
        const uploaded = await this.cloudinary.upload(file, `mtm/terrains/${id}/media`, dto.isPublic ?? false);
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
    async addDocument(id, dto, file) {
        await this.ensureExists(id);
        this.validateFileSize(file);
        const uploaded = await this.cloudinary.upload(file, `mtm/terrains/${id}/documents`, dto.isPublic ?? false);
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
    async removeMedia(id, mediaId) {
        const media = await this.prisma.terrainMedia.findFirst({
            where: { id: mediaId, terrainId: id },
        });
        if (!media)
            return;
        await this.prisma.terrainMedia.delete({ where: { id: mediaId } });
        await this.cloudinary.destroy(media.storageKey, media.resourceType, media.isPublic);
    }
    async removeDocument(id, documentId) {
        const document = await this.prisma.terrainDocument.findFirst({
            where: { id: documentId, terrainId: id },
        });
        if (!document)
            return;
        await this.prisma.terrainDocument.delete({ where: { id: documentId } });
        await this.cloudinary.destroy(document.storageKey, document.resourceType, document.isPublic);
    }
    toPublic(terrain) {
        const source = terrain;
        const medias = source.medias?.map((media) => ({
            id: media.id,
            type: media.type,
            title: media.title,
            isPublic: media.isPublic,
            sortOrder: media.sortOrder,
            secureUrl: this.cloudinary.url(media.storageKey, media.resourceType, true),
            capturedAt: media.capturedAt,
            createdAt: media.createdAt,
        })) ?? [];
        const documents = source.documents?.map((document) => ({
            id: document.id,
            type: document.type,
            title: document.title,
            isPublic: document.isPublic,
            version: document.version,
            secureUrl: this.cloudinary.url(document.storageKey, document.resourceType, true),
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
    async ensureExists(id) {
        const exists = await this.prisma.terrain.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Terrain introuvable');
    }
    async validateStatuses(data) {
        const fields = [
            'statutJuridique',
            'niveauVerification',
            'statutCommercial',
        ];
        for (const field of fields) {
            const value = data[field];
            if (value === undefined)
                continue;
            const configured = await this.settings.getRawValue(`terrains.${field}`);
            const allowed = Array.isArray(configured)
                ? configured.filter((item) => typeof item === 'string')
                : [...DEFAULT_TERRAIN_OPTIONS[field]];
            if (!allowed.includes(value)) {
                throw new common_1.BadRequestException(`Statut de terrain invalide : ${field}`);
            }
        }
    }
    validateFileSize(file) {
        const maxFileSize = 10 * 1024 * 1024;
        if (file.size > maxFileSize) {
            throw new common_1.BadRequestException('Le fichier ne doit pas dépasser 10 Mo');
        }
    }
    toInternal(terrain, user) {
        const value = terrain;
        const hasFinancialAccess = !user ||
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
                secureUrl: this.cloudinary.url(String(asset.storageKey), typeof asset.resourceType === 'string' ? asset.resourceType : 'image', Boolean(asset.isPublic)),
            })),
            documents: value.documents?.map((asset) => ({
                ...asset,
                secureUrl: this.cloudinary.url(String(asset.storageKey), typeof asset.resourceType === 'string' ? asset.resourceType : 'raw', Boolean(asset.isPublic)),
            })),
        };
        return result;
    }
    asOptions(value, fallback) {
        return Array.isArray(value) &&
            value.every((item) => typeof item === 'string')
            ? value
            : fallback;
    }
};
exports.TerrainsService = TerrainsService;
exports.TerrainsService = TerrainsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudinary_service_1.CloudinaryService,
        settings_service_1.SettingsService])
], TerrainsService);
//# sourceMappingURL=terrains.service.js.map