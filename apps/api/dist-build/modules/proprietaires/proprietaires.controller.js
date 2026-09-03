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
exports.ProprietairesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const create_proprietaire_dto_1 = require("./dto/create-proprietaire.dto");
const update_proprietaire_dto_1 = require("./dto/update-proprietaire.dto");
const proprietaires_service_1 = require("./proprietaires.service");
let ProprietairesController = class ProprietairesController {
    proprietaires;
    audit;
    constructor(proprietaires, audit) {
        this.proprietaires = proprietaires;
        this.audit = audit;
    }
    findAll() {
        return this.proprietaires.findAll();
    }
    findOne(id) {
        return this.proprietaires.findById(id);
    }
    async create(dto, user, req) {
        const proprietaire = await this.proprietaires.create(dto);
        await this.audit.record({
            userId: user.id,
            action: 'proprietaire.created',
            entityType: 'Proprietaire',
            entityId: proprietaire.id,
            newValue: {
                firstName: proprietaire.firstName,
                lastName: proprietaire.lastName,
                email: proprietaire.email,
                phone: proprietaire.phone,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return proprietaire;
    }
    async update(id, dto, user, req) {
        const before = await this.proprietaires.findById(id);
        const proprietaire = await this.proprietaires.update(id, dto);
        await this.audit.record({
            userId: user.id,
            action: 'proprietaire.updated',
            entityType: 'Proprietaire',
            entityId: id,
            oldValue: {
                firstName: before.firstName,
                lastName: before.lastName,
                email: before.email,
                phone: before.phone,
                notes: before.notes,
            },
            newValue: {
                firstName: proprietaire.firstName,
                lastName: proprietaire.lastName,
                email: proprietaire.email,
                phone: proprietaire.phone,
                notes: proprietaire.notes,
            },
            justification: 'Modification des informations du propriétaire',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return proprietaire;
    }
    async remove(id, user, req) {
        const before = await this.proprietaires.findById(id);
        await this.proprietaires.remove(id);
        await this.audit.record({
            userId: user.id,
            action: 'proprietaire.deleted',
            entityType: 'Proprietaire',
            entityId: id,
            oldValue: {
                firstName: before.firstName,
                lastName: before.lastName,
                email: before.email,
            },
            justification: 'Suppression du propriétaire',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
};
exports.ProprietairesController = ProprietairesController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProprietairesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProprietairesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:administrer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_proprietaire_dto_1.CreateProprietaireDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ProprietairesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_proprietaire_dto_1.UpdateProprietaireDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ProprietairesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('terrains:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProprietairesController.prototype, "remove", null);
exports.ProprietairesController = ProprietairesController = __decorate([
    (0, swagger_1.ApiTags)('proprietaires'),
    (0, common_1.Controller)('proprietaires'),
    __metadata("design:paramtypes", [proprietaires_service_1.ProprietairesService,
        audit_service_1.AuditService])
], ProprietairesController);
//# sourceMappingURL=proprietaires.controller.js.map