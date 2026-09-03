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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const require_permissions_decorator_1 = require("../auth/decorators/require-permissions.decorator");
const audit_service_1 = require("../audit/audit.service");
const assign_role_dto_1 = require("../rbac/dto/assign-role.dto");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const users_service_1 = require("./users.service");
let UsersController = class UsersController {
    usersService;
    auditService;
    constructor(usersService, auditService) {
        this.usersService = usersService;
        this.auditService = auditService;
    }
    async findAll() {
        const users = await this.usersService.findAll();
        return users.map((user) => this.toSafeUser(user));
    }
    async create(dto, currentUser, req) {
        const user = await this.usersService.create(dto);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.created',
            entityType: 'User',
            entityId: user.id,
            newValue: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return this.toSafeUser(user);
    }
    async update(id, dto, currentUser, req) {
        const before = await this.usersService.findById(id);
        const user = await this.usersService.update(id, dto);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.updated',
            entityType: 'User',
            entityId: id,
            oldValue: before
                ? {
                    email: before.email,
                    firstName: before.firstName,
                    lastName: before.lastName,
                }
                : undefined,
            newValue: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            justification: 'Modification administrative du compte',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return this.toSafeUser(user);
    }
    async remove(id, currentUser, req) {
        await this.usersService.remove(id);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.deleted',
            entityType: 'User',
            entityId: id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async activate(id, currentUser, req) {
        const user = await this.usersService.setActive(id, true);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.activated',
            entityType: 'User',
            entityId: id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return this.toSafeUser(user);
    }
    async deactivate(id, currentUser, req) {
        const user = await this.usersService.setActive(id, false);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.deactivated',
            entityType: 'User',
            entityId: id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return this.toSafeUser(user);
    }
    async resetTwoFactor(id, currentUser, req) {
        const before = await this.usersService.findById(id);
        const user = await this.usersService.resetTwoFactor(id);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.2fa_reset',
            entityType: 'User',
            entityId: id,
            oldValue: { twoFactorEnabled: before?.twoFactorEnabled ?? false },
            newValue: { twoFactorEnabled: false },
            justification: 'Réinitialisation administrative pour récupération de compte',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return this.toSafeUser(user);
    }
    async assignRole(id, dto, currentUser, req) {
        await this.usersService.assignRole(id, dto.roleId);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.role_assigned',
            entityType: 'User',
            entityId: id,
            newValue: { roleId: dto.roleId },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async removeRole(id, roleId, currentUser, req) {
        await this.usersService.removeRole(id, roleId);
        await this.auditService.record({
            userId: currentUser.id,
            action: 'user.role_removed',
            entityType: 'User',
            entityId: id,
            oldValue: { roleId },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    toSafeUser(user) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            twoFactorEnabled: user.twoFactorEnabled,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            roles: user.roles?.map((r) => r.role.name) ?? [],
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permissions_decorator_1.RequirePermissions)('users:consulter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permissions_decorator_1.RequirePermissions)('users:creer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:supprimer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:modifier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)(':id/2fa/reset'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetTwoFactor", null);
__decorate([
    (0, common_1.Post)(':id/roles'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_role_dto_1.AssignRoleDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "assignRole", null);
__decorate([
    (0, common_1.Post)(':id/roles/:roleId/remove'),
    (0, require_permissions_decorator_1.RequirePermissions)('users:administrer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('roleId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeRole", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        audit_service_1.AuditService])
], UsersController);
//# sourceMappingURL=users.controller.js.map