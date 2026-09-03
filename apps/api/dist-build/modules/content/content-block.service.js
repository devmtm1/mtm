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
exports.ContentBlockService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ContentBlockService = class ContentBlockService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.contentBlock.findMany({
            where: { isActive: true },
            select: this.publicSelect,
            orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
        });
    }
    async findByKey(key) {
        const block = await this.prisma.contentBlock.findUnique({
            where: { key, isActive: true },
            select: this.publicSelect,
        });
        if (!block)
            throw new common_1.NotFoundException('Bloc de contenu introuvable');
        return block;
    }
    async findByType(type) {
        return this.prisma.contentBlock.findMany({
            where: { type, isActive: true },
            select: this.publicSelect,
            orderBy: { ordre: 'asc' },
        });
    }
    publicSelect = {
        key: true,
        title: true,
        content: true,
        type: true,
    };
    async create(dto, userId) {
        return this.prisma.contentBlock.create({
            data: { ...dto, updatedById: userId },
        });
    }
    async update(key, dto, userId) {
        const existing = await this.prisma.contentBlock.findUnique({
            where: { key },
        });
        if (!existing)
            throw new common_1.NotFoundException('Bloc de contenu introuvable');
        return this.prisma.contentBlock.update({
            where: { key },
            data: { ...dto, updatedById: userId },
        });
    }
    async remove(key) {
        const existing = await this.prisma.contentBlock.findUnique({
            where: { key },
        });
        if (!existing)
            throw new common_1.NotFoundException('Bloc de contenu introuvable');
        await this.prisma.contentBlock.delete({ where: { key } });
    }
};
exports.ContentBlockService = ContentBlockService;
exports.ContentBlockService = ContentBlockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContentBlockService);
//# sourceMappingURL=content-block.service.js.map