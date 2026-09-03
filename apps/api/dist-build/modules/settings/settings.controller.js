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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const create_setting_dto_1 = require("./dto/create-setting.dto");
const update_setting_dto_1 = require("./dto/update-setting.dto");
const settings_service_1 = require("./settings.service");
const ADMINISTER_PERMISSION = 'settings:administrer';
let SettingsController = class SettingsController {
    settingsService;
    auditService;
    constructor(settingsService, auditService) {
        this.settingsService = settingsService;
        this.auditService = auditService;
    }
    findAll(user) {
        const canViewSensitive = user.permissions.includes(ADMINISTER_PERMISSION);
        return this.settingsService.findAll(canViewSensitive);
    }
    findOne(key, user) {
        const canViewSensitive = user.permissions.includes(ADMINISTER_PERMISSION);
        return this.settingsService.findByKey(key, canViewSensitive);
    }
    async create(dto, user, req) {
        if (dto.isSensitive && !user.permissions.includes(ADMINISTER_PERMISSION)) {
            throw new common_1.ForbiddenException('La création d’un paramètre sensible nécessite la permission settings:administrer');
        }
        const setting = await this.settingsService.create(dto, user.id);
        await this.auditService.record({
            userId: user.id,
            action: 'setting.created',
            entityType: 'SystemSetting',
            entityId: setting.id,
            newValue: { key: dto.key, isSensitive: dto.isSensitive ?? false },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return setting;
    }
    async update(key, dto, user, req) {
        const sensitive = await this.settingsService.isSensitive(key);
        if (sensitive && !user.permissions.includes(ADMINISTER_PERMISSION)) {
            throw new common_1.ForbiddenException('La modification de ce paramètre sensible nécessite la permission settings:administrer');
        }
        const setting = await this.settingsService.update(key, dto.value, dto.description, user.id);
        await this.auditService.record({
            userId: user.id,
            action: 'setting.updated',
            entityType: 'SystemSetting',
            entityId: setting.id,
            newValue: sensitive ? { key } : { key, value: dto.value },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return setting;
    }
    async remove(key, user, req) {
        const sensitive = await this.settingsService.isSensitive(key);
        if (sensitive && !user.permissions.includes(ADMINISTER_PERMISSION)) {
            throw new common_1.ForbiddenException('La suppression de ce paramètre sensible nécessite la permission settings:administrer');
        }
        await this.settingsService.remove(key);
        await this.auditService.record({
            userId: user.id,
            action: 'setting.deleted',
            entityType: 'SystemSetting',
            entityId: key,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:consulter'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:consulter'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_setting_dto_1.CreateSettingDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':key'),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:modifier'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_setting_dto_1.UpdateSettingDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':key'),
    (0, require_permissions_decorator_1.RequirePermissions)('settings:supprimer'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "remove", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('settings'),
    (0, common_1.Controller)('settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        audit_service_1.AuditService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map