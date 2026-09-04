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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    prisma;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(input) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: input.userId ?? undefined,
                    action: input.action,
                    entityType: input.entityType,
                    entityId: input.entityId ?? undefined,
                    oldValue: this.toJson(input.oldValue),
                    newValue: this.toJson(input.newValue),
                    justification: input.justification,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                },
            });
        }
        catch (error) {
            this.logger.error("Échec de l'écriture du journal d'audit", error);
        }
    }
    async findAll(filters, pagination = {}) {
        const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
        const pageSize = pagination.pageSize && pagination.pageSize > 0
            ? Math.min(pagination.pageSize, 200)
            : 50;
        const where = {
            ...(filters.userId ? { userId: filters.userId } : {}),
            ...(filters.entityType ? { entityType: filters.entityType } : {}),
            ...(filters.entityId ? { entityId: filters.entityId } : {}),
            ...(filters.action ? { action: filters.action } : {}),
            ...(filters.from || filters.to
                ? {
                    createdAt: {
                        ...(filters.from ? { gte: filters.from } : {}),
                        ...(filters.to ? { lte: filters.to } : {}),
                    },
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async exportLogs(filters, justification, userId) {
        await this.record({
            userId,
            action: 'audit.exported',
            entityType: 'AuditLog',
            justification,
            newValue: { filters },
        });
        return this.prisma.auditLog.findMany({
            where: {
                ...(filters.userId ? { userId: filters.userId } : {}),
                ...(filters.entityType ? { entityType: filters.entityType } : {}),
                ...(filters.entityId ? { entityId: filters.entityId } : {}),
                ...(filters.action ? { action: filters.action } : {}),
                ...(filters.from || filters.to
                    ? {
                        createdAt: {
                            ...(filters.from ? { gte: filters.from } : {}),
                            ...(filters.to ? { lte: filters.to } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 2000,
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    toJson(value) {
        if (value === undefined || value === null)
            return undefined;
        try {
            return structuredClone(value);
        }
        catch {
            return this.serialize(value);
        }
    }
    serialize(value) {
        if (value === null || typeof value !== 'object')
            return value;
        if (value instanceof Date)
            return value.toISOString();
        if (Array.isArray(value))
            return value.map((item) => this.serialize(item));
        const record = value;
        if (typeof record.toJSON === 'function') {
            return this.serialize(record.toJSON());
        }
        const plain = {};
        for (const key of Object.keys(record)) {
            plain[key] = this.serialize(record[key]);
        }
        return plain;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map