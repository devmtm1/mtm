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
        const contact = await this.prisma.contact.create({
            data: {
                nom: dto.nom,
                email: dto.email,
                telephone: dto.telephone,
                sujet: dto.sujet,
                message: dto.message,
                terrainId: dto.terrainId,
            },
        });
        try {
            let prospect = await this.prisma.prospect.findFirst({
                where: {
                    OR: [
                        ...(dto.email ? [{ email: dto.email }] : []),
                        ...(dto.telephone ? [{ telephone: dto.telephone }] : []),
                    ],
                },
            });
            if (!prospect) {
                const [prenom, ...rest] = (dto.nom || '').split(' ');
                prospect = await this.prisma.prospect.create({
                    data: {
                        nom: rest.length ? rest.join(' ') : dto.nom,
                        prenom: rest.length ? prenom : undefined,
                        email: dto.email,
                        telephone: dto.telephone,
                        sourceAcquisition: 'contact_public',
                        besoins: `[${dto.sujet || 'Contact public'}] ${dto.message}`,
                        statutPipeline: 'nouveau_contact',
                    },
                });
            }
            await this.prisma.activiteCrm.create({
                data: {
                    prospectId: prospect.id,
                    type: 'note',
                    titre: `Demande de contact web: ${dto.sujet || 'Sans sujet'}`,
                    description: dto.message,
                    statut: 'realise',
                    priorite: 'haute',
                },
            });
        }
        catch {
        }
        return contact;
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
    async convertToProspect(id, commercialResponsableId) {
        const contact = await this.prisma.contact.findUnique({ where: { id } });
        if (!contact)
            throw new common_1.NotFoundException('Message de contact introuvable');
        let prospect = await this.prisma.prospect.findFirst({
            where: {
                OR: [
                    ...(contact.email ? [{ email: contact.email }] : []),
                    ...(contact.telephone ? [{ telephone: contact.telephone }] : []),
                ],
            },
        });
        if (!prospect) {
            const [prenom, ...rest] = (contact.nom || '').split(' ');
            prospect = await this.prisma.prospect.create({
                data: {
                    nom: rest.length ? rest.join(' ') : contact.nom,
                    prenom: rest.length ? prenom : undefined,
                    email: contact.email,
                    telephone: contact.telephone,
                    sourceAcquisition: 'contact_public',
                    besoins: `[${contact.sujet || 'Contact public'}] ${contact.message}`,
                    statutPipeline: 'nouveau_contact',
                    commercialResponsableId: commercialResponsableId || undefined,
                },
            });
        }
        else if (commercialResponsableId) {
            prospect = await this.prisma.prospect.update({
                where: { id: prospect.id },
                data: { commercialResponsableId },
            });
        }
        await this.prisma.contact.update({
            where: { id },
            data: { lu: true },
        });
        return prospect;
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContactService);
//# sourceMappingURL=contact.service.js.map