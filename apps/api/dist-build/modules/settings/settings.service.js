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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(canViewSensitive) {
        const settings = await this.prisma.systemSetting.findMany({
            orderBy: { key: 'asc' },
        });
        return settings.map((s) => this.toSafeSetting(s, canViewSensitive));
    }
    async findByKey(key, canViewSensitive) {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key },
        });
        if (!setting) {
            throw new common_1.NotFoundException('Paramètre introuvable');
        }
        return this.toSafeSetting(setting, canViewSensitive);
    }
    async getRawValue(key) {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key },
        });
        return setting?.value;
    }
    async create(dto, updatedById) {
        const existing = await this.prisma.systemSetting.findUnique({
            where: { key: dto.key },
        });
        if (existing) {
            throw new common_1.ConflictException('Un paramètre avec cette clé existe déjà');
        }
        return this.prisma.systemSetting.create({
            data: {
                key: dto.key,
                value: this.toJson(dto.value),
                description: dto.description,
                isSensitive: dto.isSensitive ?? false,
                updatedById,
            },
        });
    }
    async update(key, value, description, updatedById) {
        const existing = await this.prisma.systemSetting.findUnique({
            where: { key },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Paramètre introuvable');
        }
        return this.prisma.systemSetting.update({
            where: { key },
            data: {
                value: this.toJson(value),
                ...(description !== undefined ? { description } : {}),
                updatedById,
            },
        });
    }
    async remove(key) {
        const existing = await this.prisma.systemSetting.findUnique({
            where: { key },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Paramètre introuvable');
        }
        await this.prisma.systemSetting.delete({ where: { key } });
    }
    async isSensitive(key) {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key },
            select: { isSensitive: true },
        });
        return setting?.isSensitive ?? false;
    }
    toSafeSetting(setting, canViewSensitive) {
        const shouldRedact = setting.isSensitive && !canViewSensitive;
        return {
            id: setting.id,
            key: setting.key,
            value: shouldRedact ? undefined : setting.value,
            description: setting.description,
            isSensitive: setting.isSensitive,
            updatedAt: setting.updatedAt,
            createdAt: setting.createdAt,
            redacted: shouldRedact,
        };
    }
    toJson(value) {
        if (value === undefined) {
            return {};
        }
        return structuredClone(value);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map