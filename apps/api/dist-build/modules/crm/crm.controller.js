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
exports.CrmController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const create_prospect_dto_1 = require("./dto/create-prospect.dto");
const query_prospect_dto_1 = require("./dto/query-prospect.dto");
const update_prospect_dto_1 = require("./dto/update-prospect.dto");
const create_activite_crm_dto_1 = require("./dto/create-activite-crm.dto");
const update_activite_crm_dto_1 = require("./dto/update-activite-crm.dto");
const create_document_crm_dto_1 = require("./dto/create-document-crm.dto");
const transition_pipeline_dto_1 = require("./dto/transition-pipeline.dto");
const convert_contact_dto_1 = require("./dto/convert-contact.dto");
const crm_service_1 = require("./crm.service");
let CrmController = class CrmController {
    crm;
    audit;
    constructor(crm, audit) {
        this.crm = crm;
        this.audit = audit;
    }
    findAll(query, user) {
        return this.crm.findAll(query, user);
    }
    getOptions() {
        return this.crm.getOptions();
    }
    getStats(user) {
        return this.crm.getStats(user);
    }
    getCommercials() {
        return this.crm.getCommercials();
    }
    upcomingTasks(user, limit) {
        const n = limit ? Math.min(Math.max(Number(limit), 1), 100) : 20;
        return this.crm.getUpcomingTasks(user, n);
    }
    getTimeline(id, user) {
        return this.crm.getTimeline(id, user);
    }
    async transitionPipeline(id, dto, user, req) {
        const result = await this.crm.transitionPipeline(id, dto.statutPipeline, user, dto.justification);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.pipeline.transition',
            entityType: 'Prospect',
            entityId: id,
            oldValue: result.before,
            newValue: result.prospect,
            justification: dto.justification,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result.prospect;
    }
    async convertContact(contactId, dto, user, req) {
        const prospect = await this.crm.convertContact(contactId, dto.commercialResponsableId, user);
        await this.audit.record({
            userId: user.id,
            action: 'contact.converted',
            entityType: 'Prospect',
            entityId: prospect.id,
            newValue: { contactId, prospectId: prospect.id },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return prospect;
    }
    async assignCommercial(id, commercialResponsableId, user, req) {
        const result = await this.crm.assignCommercial(id, commercialResponsableId, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.commercial.assigned',
            entityType: 'Prospect',
            entityId: id,
            oldValue: result.before,
            newValue: result.prospect,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return result.prospect;
    }
    findOne(id, user) {
        return this.crm.findOne(id, user);
    }
    find360(id, user) {
        return this.crm.findOne360(id, user);
    }
    getHistory(id, user) {
        return this.crm.getHistory(id, user);
    }
    async create(dto, user, req) {
        const prospect = await this.crm.create(dto, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.created',
            entityType: 'Prospect',
            entityId: prospect.id,
            newValue: prospect,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return prospect;
    }
    async update(id, dto, user, req) {
        const before = await this.crm.findOne(id, user);
        const prospect = await this.crm.update(id, dto, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.updated',
            entityType: 'Prospect',
            entityId: id,
            oldValue: before,
            newValue: prospect,
            justification: dto.justification,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return prospect;
    }
    async remove(id, user, req) {
        const before = await this.crm.findOne(id, user);
        await this.crm.remove(id, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.deleted',
            entityType: 'Prospect',
            entityId: id,
            oldValue: before,
            justification: 'Suppression du prospect',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async addActivite(id, dto, user, req) {
        const activite = await this.crm.addActivite(id, dto, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.activite.created',
            entityType: 'ActiviteCrm',
            entityId: activite.id,
            newValue: { prospectId: id, ...dto },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return activite;
    }
    async updateActivite(id, activiteId, dto, user, req) {
        const before = await this.crm.findOne(id, user);
        const activite = await this.crm.updateActivite(id, activiteId, dto, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.activite.updated',
            entityType: 'ActiviteCrm',
            entityId: activiteId,
            oldValue: {
                statut: before.activites?.find((a) => a.id === activiteId)?.statut ??
                    before.statutPipeline,
            },
            newValue: { statut: activite.statut },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return activite;
    }
    async removeActivite(id, activiteId, user, req) {
        await this.crm.removeActivite(id, activiteId, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.activite.deleted',
            entityType: 'ActiviteCrm',
            entityId: activiteId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async addDocument(id, dto, file, user) {
        if (!file)
            throw new common_1.BadRequestException('Un document est obligatoire');
        const document = await this.crm.addDocument(id, dto, file, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.document.created',
            entityType: 'DocumentCrm',
            entityId: document.id,
            newValue: { prospectId: id, type: dto.type },
        });
        return document;
    }
    async removeDocument(id, documentId, user) {
        await this.crm.removeDocument(id, documentId, user);
        await this.audit.record({
            userId: user.id,
            action: 'prospect.document.deleted',
            entityType: 'DocumentCrm',
            entityId: documentId,
        });
        return { success: true };
    }
};
exports.CrmController = CrmController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_prospect_dto_1.QueryProspectDto, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('options'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getOptions", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('commercials'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getCommercials", null);
__decorate([
    (0, common_1.Get)('upcoming-tasks'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "upcomingTasks", null);
__decorate([
    (0, common_1.Get)(':id/timeline'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Patch)(':id/pipeline'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transition_pipeline_dto_1.TransitionPipelineDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "transitionPipeline", null);
__decorate([
    (0, common_1.Post)('contacts/:contactId/convert'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:creer'),
    __param(0, (0, common_1.Param)('contactId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, convert_contact_dto_1.ConvertContactDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "convertContact", null);
__decorate([
    (0, common_1.Patch)(':id/assign-commercial'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('commercialResponsableId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "assignCommercial", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/360'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "find360", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_prospect_dto_1.CreateProspectDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_prospect_dto_1.UpdateProspectDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:supprimer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/activites'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_activite_crm_dto_1.CreateActiviteCrmDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "addActivite", null);
__decorate([
    (0, common_1.Patch)(':id/activites/:activiteId'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('activiteId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_activite_crm_dto_1.UpdateActiviteCrmDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "updateActivite", null);
__decorate([
    (0, common_1.Delete)(':id/activites/:activiteId'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('activiteId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "removeActivite", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_document_crm_dto_1.CreateDocumentCrmDto, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "addDocument", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:documentId'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "removeDocument", null);
exports.CrmController = CrmController = __decorate([
    (0, swagger_1.ApiTags)('crm'),
    (0, common_1.Controller)('crm/prospects'),
    __metadata("design:paramtypes", [crm_service_1.CrmService,
        audit_service_1.AuditService])
], CrmController);
//# sourceMappingURL=crm.controller.js.map