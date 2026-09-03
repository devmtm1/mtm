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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const assign_permissions_dto_1 = require("./dto/assign-permissions.dto");
const create_role_dto_1 = require("./dto/create-role.dto");
const update_role_dto_1 = require("./dto/update-role.dto");
const roles_service_1 = require("./roles.service");
let RolesController = class RolesController {
    rolesService;
    auditService;
    constructor(rolesService, auditService) {
        this.rolesService = rolesService;
        this.auditService = auditService;
    }
    findAll() {
        return this.rolesService.findAll();
    }
    findOne(id) {
        return this.rolesService.findById(id);
    }
    async create(dto, currentUser, req) {
        const role = await this.rolesService.create(dto);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'role.created',
            entityType: 'Role',
            entityId: role.id,
            newValue: { name: role.name, description: role.description },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return role;
    }
    async update(id, dto, currentUser, req) {
        const role = await this.rolesService.update(id, dto);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'role.updated',
            entityType: 'Role',
            entityId: id,
            newValue: { description: dto.description },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return role;
    }
    async remove(id, currentUser, req) {
        await this.rolesService.remove(id);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'role.deleted',
            entityType: 'Role',
            entityId: id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async assignPermissions(id, dto, currentUser, req) {
        await this.rolesService.assignPermissions(id, dto.permissionNames);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'role.permissions_assigned',
            entityType: 'Role',
            entityId: id,
            newValue: { permissionNames: dto.permissionNames },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async removePermission(id, permissionId, currentUser, req) {
        await this.rolesService.removePermission(id, permissionId);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'role.permission_removed',
            entityType: 'Role',
            entityId: id,
            oldValue: { permissionId },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:consulter'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_role_dto_1.CreateRoleDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_role_dto_1.UpdateRoleDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:supprimer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/permissions'),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_permissions_dto_1.AssignPermissionsDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "assignPermissions", null);
__decorate([
    (0, common_1.Post)(':id/permissions/:permissionId/remove'),
    (0, require_permissions_decorator_1.RequirePermissions)('roles:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('permissionId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "removePermission", null);
exports.RolesController = RolesController = __decorate([
    (0, swagger_1.ApiTags)('roles'),
    (0, common_1.Controller)('roles'),
    __metadata("design:paramtypes", [roles_service_1.RolesService,
        audit_service_1.AuditService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map