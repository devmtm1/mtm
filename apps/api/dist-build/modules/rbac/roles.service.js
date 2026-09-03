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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let RolesService = class RolesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return await this.prisma.role.findMany({
            include: {
                permissions: { include: { permission: true } },
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: { permissions: { include: { permission: true } } },
        });
        if (!role) {
            throw new common_1.NotFoundException('Rôle introuvable');
        }
        return role;
    }
    async create(dto) {
        const existing = await this.prisma.role.findUnique({
            where: { name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException('Un rôle avec ce nom existe déjà');
        }
        return this.prisma.role.create({
            data: { name: dto.name, description: dto.description },
        });
    }
    async update(id, dto) {
        await this.findById(id);
        return this.prisma.role.update({
            where: { id },
            data: { description: dto.description },
        });
    }
    async remove(id) {
        const role = await this.findById(id);
        if (role.isSystem) {
            throw new common_1.BadRequestException('Ce rôle système ne peut pas être supprimé');
        }
        await this.prisma.role.delete({ where: { id } });
    }
    async assignPermissions(roleId, permissionNames) {
        await this.findById(roleId);
        const permissions = await this.prisma.permission.findMany({
            where: { name: { in: permissionNames } },
        });
        const foundNames = new Set(permissions.map((p) => p.name));
        const missing = permissionNames.filter((name) => !foundNames.has(name));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Permissions inconnues: ${missing.join(', ')}`);
        }
        await this.prisma.$transaction(permissions.map((permission) => this.prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: { roleId, permissionId: permission.id },
            },
            update: {},
            create: { roleId, permissionId: permission.id },
        })));
    }
    async removePermission(roleId, permissionId) {
        await this.findById(roleId);
        await this.prisma.rolePermission.deleteMany({
            where: { roleId, permissionId },
        });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map