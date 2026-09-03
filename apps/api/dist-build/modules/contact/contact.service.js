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
exports.ContactService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ContactService = class ContactService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        if (dto.terrainId) {
            const terrain = await this.prisma.terrain.findUnique({
                where: { id: dto.terrainId },
                select: { id: true },
            });
            if (!terrain)
                throw new common_1.NotFoundException('Terrain introuvable');
        }
        return this.prisma.contact.create({
            data: {
                nom: dto.nom,
                email: dto.email,
                telephone: dto.telephone,
                sujet: dto.sujet,
                message: dto.message,
                terrainId: dto.terrainId,
            },
        });
    }
    async findAll(options = {}) {
        return this.prisma.contact.findMany({
            where: { ...(options.lu !== undefined ? { lu: options.lu } : {}) },
            orderBy: { createdAt: 'desc' },
            include: { terrain: { select: { id: true, referenceInterne: true } } },
        });
    }
    async markRead(id) {
        return this.prisma.contact.update({
            where: { id },
            data: { lu: true },
        });
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContactService);
//# sourceMappingURL=contact.service.js.map