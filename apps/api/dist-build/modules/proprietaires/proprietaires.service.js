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
exports.ProprietairesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ProprietairesService = class ProprietairesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.proprietaire.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
    }
    async findById(id) {
        const proprietaire = await this.prisma.proprietaire.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!proprietaire) {
            throw new common_1.NotFoundException('Propriétaire introuvable');
        }
        return proprietaire;
    }
    async create(dto) {
        if (dto.email) {
            const existing = await this.prisma.proprietaire.findFirst({
                where: { email: dto.email },
            });
            if (existing)
                throw new common_1.ConflictException('Un propriétaire avec cet email existe déjà');
        }
        return this.prisma.proprietaire.create({ data: dto });
    }
    async update(id, dto) {
        await this.ensureExists(id);
        return this.prisma.proprietaire.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.proprietaire.delete({ where: { id } });
    }
    async ensureExists(id) {
        const owner = await this.prisma.proprietaire.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!owner)
            throw new common_1.NotFoundException('Propriétaire introuvable');
    }
};
exports.ProprietairesService = ProprietairesService;
exports.ProprietairesService = ProprietairesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProprietairesService);
//# sourceMappingURL=proprietaires.service.js.map