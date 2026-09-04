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
exports.ContactController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const contact_service_1 = require("./contact.service");
const create_contact_dto_1 = require("./dto/create-contact.dto");
let ContactController = class ContactController {
    contacts;
    audit;
    constructor(contacts, audit) {
        this.contacts = contacts;
        this.audit = audit;
    }
    async create(dto) {
        const contact = await this.contacts.create(dto);
        await this.audit.record({
            action: 'contact.created',
            entityType: 'Contact',
            entityId: contact.id,
            newValue: {
                nom: contact.nom,
                email: contact.email,
                sujet: contact.sujet,
            },
        });
        return { success: true };
    }
    findAll(lu) {
        return this.contacts.findAll({
            lu: lu === 'true' ? true : lu === 'false' ? false : undefined,
        });
    }
    async markRead(id, user) {
        await this.audit.record({
            userId: user.id,
            action: 'contact.read',
            entityType: 'Contact',
            entityId: id,
        });
        return this.contacts.markRead(id);
    }
    async convertToProspect(id, commercialResponsableId, user) {
        const prospect = await this.contacts.convertToProspect(id, commercialResponsableId);
        await this.audit.record({
            userId: user.id,
            action: 'contact.converted_to_prospect',
            entityType: 'Contact',
            entityId: id,
            newValue: { prospectId: prospect.id },
        });
        return prospect;
    }
};
exports.ContactController = ContactController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_contact_dto_1.CreateContactDto]),
    __metadata("design:returntype", Promise)
], ContactController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:consulter'),
    __param(0, (0, common_1.Query)('lu')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContactController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ContactController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-prospect'),
    (0, require_permissions_decorator_1.RequirePermissions)('crm:creer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('commercialResponsableId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ContactController.prototype, "convertToProspect", null);
exports.ContactController = ContactController = __decorate([
    (0, swagger_1.ApiTags)('contacts'),
    (0, common_1.Controller)('contacts'),
    __metadata("design:paramtypes", [contact_service_1.ContactService,
        audit_service_1.AuditService])
], ContactController);
//# sourceMappingURL=contact.controller.js.map