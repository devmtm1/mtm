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
exports.MandatsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const create_mandat_dto_1 = require("./dto/create-mandat.dto");
const query_mandat_dto_1 = require("./dto/query-mandat.dto");
const update_mandat_dto_1 = require("./dto/update-mandat.dto");
const create_mandat_lot_dto_1 = require("./dto/create-mandat-lot.dto");
const update_mandat_lot_dto_1 = require("./dto/update-mandat-lot.dto");
const create_mandat_document_dto_1 = require("./dto/create-mandat-document.dto");
const mandats_service_1 = require("./mandats.service");
let MandatsController = class MandatsController {
    mandats;
    audit;
    constructor(mandats, audit) {
        this.mandats = mandats;
        this.audit = audit;
    }
    findAll(query) {
        return this.mandats.findAll(query);
    }
    getOptions() {
        return this.mandats.getOptions();
    }
    getStats() {
        return this.mandats.getStats();
    }
    getFinancialSummary(id) {
        return this.mandats.getFinancialSummary(id);
    }
    getExpirants(jours) {
        return this.mandats.getExpirants(jours ? Number(jours) : undefined);
    }
    checkAlerts() {
        return this.mandats.checkAlerts();
    }
    findOne(id) {
        return this.mandats.findOne(id);
    }
    getHistory(id) {
        return this.mandats.getHistory(id);
    }
    async create(dto, user, req) {
        const mandat = await this.mandats.create(dto);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.created',
            entityType: 'Mandat',
            entityId: mandat.id,
            newValue: mandat,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return mandat;
    }
    async update(id, dto, user, req) {
        const before = await this.mandats.findOne(id);
        const mandat = await this.mandats.update(id, dto);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.updated',
            entityType: 'Mandat',
            entityId: id,
            oldValue: before,
            newValue: mandat,
            justification: dto.justification,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return mandat;
    }
    async remove(id, user, req) {
        const before = await this.mandats.findOne(id);
        await this.mandats.remove(id);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.deleted',
            entityType: 'Mandat',
            entityId: id,
            oldValue: before,
            justification: 'Suppression du mandat',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async addLot(id, dto, user, req) {
        const lot = await this.mandats.addLot(id, dto);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.lot.created',
            entityType: 'MandatLot',
            entityId: lot.id,
            newValue: {
                mandatId: id,
                terrainId: dto.terrainId,
                statutLot: dto.statutLot,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return lot;
    }
    async updateLot(id, lotId, dto, user, req) {
        const before = await this.mandats.findOne(id);
        const lot = await this.mandats.updateLot(id, lotId, dto);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.lot.updated',
            entityType: 'MandatLot',
            entityId: lotId,
            oldValue: {
                statutLot: before.lots?.find((l) => l.id === lotId)?.statutLot ?? before.statut,
            },
            newValue: { statutLot: lot.statutLot },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return lot;
    }
    async removeLot(id, lotId, user, req) {
        await this.mandats.removeLot(id, lotId);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.lot.deleted',
            entityType: 'MandatLot',
            entityId: lotId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async addDocument(id, dto, file, user) {
        if (!file)
            throw new common_1.BadRequestException('Un document est obligatoire');
        const document = await this.mandats.addDocument(id, dto, file);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.document.created',
            entityType: 'MandatDocument',
            entityId: document.id,
            newValue: { mandatId: id, type: dto.type },
        });
        return document;
    }
    async removeDocument(id, documentId, user) {
        await this.mandats.removeDocument(id, documentId);
        await this.audit.record({
            userId: user.id,
            action: 'mandat.document.deleted',
            entityType: 'MandatDocument',
            entityId: documentId,
        });
        return { success: true };
    }
};
exports.MandatsController = MandatsController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_mandat_dto_1.QueryMandatDto]),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('options'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "getOptions", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id/financial'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "getFinancialSummary", null);
__decorate([
    (0, common_1.Get)('expirants'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __param(0, (0, common_1.Query)('jours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "getExpirants", null);
__decorate([
    (0, common_1.Post)('alerts/check'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:administrer'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "checkAlerts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandatsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mandat_dto_1.CreateMandatDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_mandat_dto_1.UpdateMandatDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:supprimer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/lots'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_mandat_lot_dto_1.CreateMandatLotDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "addLot", null);
__decorate([
    (0, common_1.Patch)(':id/lots/:lotId'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('lotId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_mandat_lot_dto_1.UpdateMandatLotDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "updateLot", null);
__decorate([
    (0, common_1.Delete)(':id/lots/:lotId'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('lotId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "removeLot", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:modifier'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_mandat_document_dto_1.CreateMandatDocumentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "addDocument", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:documentId'),
    (0, require_permissions_decorator_1.RequirePermissions)('mandats:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MandatsController.prototype, "removeDocument", null);
exports.MandatsController = MandatsController = __decorate([
    (0, swagger_1.ApiTags)('mandats'),
    (0, common_1.Controller)('mandats'),
    __metadata("design:paramtypes", [mandats_service_1.MandatsService,
        audit_service_1.AuditService])
], MandatsController);
//# sourceMappingURL=mandats.controller.js.map