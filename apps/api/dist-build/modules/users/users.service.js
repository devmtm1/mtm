"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../database/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return await this.prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: { include: { permission: true } },
                            },
                        },
                    },
                },
            },
        });
    }
    async findById(id) {
        return await this.prisma.user.findUnique({
            where: { id },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: { include: { permission: true } },
                            },
                        },
                    },
                },
            },
        });
    }
    getPermissionNames(user) {
        const names = new Set();
        for (const userRole of user.roles) {
            for (const rolePermission of userRole.role.permissions) {
                names.add(rolePermission.permission.name);
            }
        }
        return Array.from(names);
    }
    toAuthenticatedUser(user) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles.map((userRole) => userRole.role.name),
            permissions: this.getPermissionNames(user),
            mustChangePassword: user.mustChangePassword,
            twoFactorEnabled: user.twoFactorEnabled,
        };
    }
    async incrementFailedAttempts(userId) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { failedLoginAttempts: { increment: 1 } },
        });
    }
    async resetFailedAttempts(userId) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });
    }
    async lockAccount(userId, until) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { lockedUntil: until },
        });
    }
    async updateLastLogin(userId) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }
    async setTwoFactorSecret(userId, secret) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret },
        });
    }
    async enableTwoFactor(userId) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
    }
    async disableTwoFactor(userId) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });
    }
    async resetTwoFactor(userId) {
        return await this.disableTwoFactor(userId);
    }
    async changePassword(userId, hashedPassword) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, mustChangePassword: false },
        });
    }
    async create(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Un utilisateur avec cet email existe déjà');
        }
        const bcryptSaltRounds = 12;
        const hashedPassword = await bcrypt.hash(dto.password, bcryptSaltRounds);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                mustChangePassword: true,
                roles: {
                    create: { roleId: dto.roleId },
                },
            },
        });
        return (await this.findById(user.id));
    }
    async findAll() {
        return await this.prisma.user.findMany({
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: { include: { permission: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(userId, dto) {
        const data = {};
        if (dto.email)
            data.email = dto.email;
        if (dto.firstName)
            data.firstName = dto.firstName;
        if (dto.lastName)
            data.lastName = dto.lastName;
        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 12);
            data.mustChangePassword = true;
            await this.prisma.refreshToken.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }
        await this.prisma.user.update({ where: { id: userId }, data });
        if (dto.roleId) {
            await this.prisma.userRole.deleteMany({ where: { userId } });
            await this.prisma.userRole.create({
                data: { userId, roleId: dto.roleId },
            });
        }
        return (await this.findById(userId));
    }
    async remove(userId) {
        await this.prisma.user.delete({ where: { id: userId } });
    }
    async setActive(userId, isActive) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { isActive },
        });
    }
    async assignRole(userId, roleId) {
        await this.prisma.userRole.upsert({
            where: { userId_roleId: { userId, roleId } },
            update: {},
            create: { userId, roleId },
        });
    }
    async removeRole(userId, roleId) {
        await this.prisma.userRole.deleteMany({
            where: { userId, roleId },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map