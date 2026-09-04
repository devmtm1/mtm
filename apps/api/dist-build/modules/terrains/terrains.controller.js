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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerrainsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const create_terrain_dto_1 = require("./dto/create-terrain.dto");
const query_terrain_dto_1 = require("./dto/query-terrain.dto");
const update_terrain_dto_1 = require("./dto/update-terrain.dto");
const update_terrain_status_dto_1 = require("./dto/update-terrain-status.dto");
const create_terrain_asset_dto_1 = require("./dto/create-terrain-asset.dto");
const terrains_service_1 = require("./terrains.service");
let TerrainsController = class TerrainsController {
    terrains;
    audit;
    constructor(terrains, audit) {
        this.terrains = terrains;
        this.audit = audit;
    }
    findPublic(query) {
        return this.terrains.findPublic(query);
    }
    findPublicOne(id) {
        return this.terrains.findPublicOne(id);
    }
    findAll(query, user) {
        return this.terrains.findAll(query, user);
    }
    getOptions() {
        return this.terrains.getOptions();
    }
    findOne(id, user) {
        return this.terrains.findOne(id, user);
    }
    async create(dto, user, req) {
        const terrain = await this.terrains.create(dto);
        await this.audit.record({
            userId: user.id,
            action: 'terrain.created',
            entityType: 'Terrain',
            entityId: terrain.id,
            newValue: terrain,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return terrain;
    }
    async update(id, dto, user, req) {
        const before = await this.terrains.findOne(id);
        const terrain = await this.terrains.update(id, dto);
        await this.audit.record({
            userId: user.id,
            action: 'terrain.updated',
            entityType: 'Terrain',
            entityId: id,
            oldValue: before,
            newValue: terrain,
            justification: dto.justification,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return terrain;
    }
    updateJuridical(id, dto, user, req) {
        return this.updateStatus(id, 'statutJuridique', dto.value, dto.justification, user, req);
    }
    updateVerification(id, dto, user, req) {
        return this.updateStatus(id, 'niveauVerification', dto.value, dto.justification, user, req);
    }
    updateCommercial(id, dto, user, req) {
        return this.updateStatus(id, 'statutCommercial', dto.value, dto.justification, user, req);
    }
    async updateStatus(id, field, value, justification, user, req) {
        const before = await this.terrains.findOne(id);
        const terrain = await this.terrains.updateStatus(id, field, value);
        await this.audit.record({
            userId: user.id,
            action: `terrain.${field}.updated`,
            entityType: 'Terrain',
            entityId: id,
            oldValue: { [field]: before[field] },
            newValue: { [field]: value },
            justification,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return terrain;
    }
    async addMedia(id, dto, file, user) {
        if (!file)
            throw new common_1.BadRequestException('Un fichier média est obligatoire');
        const media = await this.terrains.addMedia(id, dto, file);
        await this.audit.record({
            userId: user.id,
            action: 'terrain.media.created',
            entityType: 'TerrainMedia',
            entityId: media.id,
            newValue: { terrainId: id, type: dto.type },
        });
        return media;
    }
    async addDocument(id, dto, file, user) {
        if (!file)
            throw new common_1.BadRequestException('Un document est obligatoire');
        const document = await this.terrains.addDocument(id, dto, file);
        await this.audit.record({
            userId: user.id,
            action: 'terrain.document.created',
            entityType: 'TerrainDocument',
            entityId: document.id,
            newValue: { terrainId: id, type: dto.type },
        });
        return document;
    }
    async removeMedia(id, mediaId, user) {
        await this.terrains.removeMedia(id, mediaId);
        await this.audit.record({
            userId: user.id,
            action: 'terrain.media.deleted',
            entityType: 'TerrainMedia',
            entityId: mediaId,
        });
        return { success: true };
    }
    async removeDocument(id, documentId, user) {
        await this.terrains.removeDocument(id, documentId);
        await this.audit.record({
            userId: user.id,
            action: 'terrain.document.deleted',
            entityType: 'TerrainDocument',
            entityId: documentId,
        });
        return { success: true };
    }
};
exports.TerrainsController = TerrainsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('public'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_terrain_dto_1.QueryTerrainDto]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "findPublic", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('public/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "findPublicOne", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:consulter'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_terrain_dto_1.QueryTerrainDto, Object]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('options'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "getOptions", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_terrain_dto_1.CreateTerrainDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TerrainsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_terrain_dto_1.UpdateTerrainDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TerrainsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/juridical-status'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:valider'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_terrain_status_dto_1.UpdateTerrainStatusDto, Object, Object]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "updateJuridical", null);
__decorate([
    (0, common_1.Patch)(':id/verification-status'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:valider'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_terrain_status_dto_1.UpdateTerrainStatusDto, Object, Object]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "updateVerification", null);
__decorate([
    (0, common_1.Patch)(':id/commercial-status'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_terrain_status_dto_1.UpdateTerrainStatusDto, Object, Object]),
    __metadata("design:returntype", void 0)
], TerrainsController.prototype, "updateCommercial", null);
__decorate([
    (0, common_1.Post)(':id/media'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:modifier'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_terrain_asset_dto_1.CreateTerrainAssetDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TerrainsController.prototype, "addMedia", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:modifier'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_terrain_asset_dto_1.CreateTerrainAssetDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TerrainsController.prototype, "addDocument", null);
__decorate([
    (0, common_1.Delete)(':id/media/:mediaId'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('mediaId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TerrainsController.prototype, "removeMedia", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:documentId'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TerrainsController.prototype, "removeDocument", null);
exports.TerrainsController = TerrainsController = __decorate([
    (0, swagger_1.ApiTags)('terrains'),
    (0, common_1.Controller)('terrains'),
    __metadata("design:paramtypes", [terrains_service_1.TerrainsService,
        audit_service_1.AuditService])
], TerrainsController);
//# sourceMappingURL=terrains.controller.js.map