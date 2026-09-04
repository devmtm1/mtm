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
var CronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let CronService = CronService_1 = class CronService {
    prisma;
    audit;
    logger = new common_1.Logger(CronService_1.name);
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async handleMandatsEcheances() {
        this.logger.log('Vérification quotidienne de l\'échéance des mandats...');
        const now = new Date();
        const activeMandats = await this.prisma.mandat.findMany({
            where: {
                statut: 'actif',
                dateFin: { gte: now },
            },
            select: {
                id: true,
                referenceInterne: true,
                dateFin: true,
                alerteEcheanceJours: true,
                commercialResponsableId: true,
            },
        });
        let countAlerts = 0;
        for (const mandat of activeMandats) {
            if (!mandat.dateFin)
                continue;
            const daysUntilExpiry = Math.ceil((mandat.dateFin.getTime() - now.getTime()) / (1000 * 3600 * 24));
            const alertThreshold = mandat.alerteEcheanceJours ?? 30;
            if (daysUntilExpiry <= alertThreshold) {
                countAlerts++;
                await this.audit.record({
                    userId: mandat.commercialResponsableId,
                    action: 'mandat.echeance_imminente',
                    entityType: 'Mandat',
                    entityId: mandat.id,
                    newValue: {
                        referenceInterne: mandat.referenceInterne,
                        dateFin: mandat.dateFin,
                        daysRemaining: daysUntilExpiry,
                    },
                });
            }
        }
        this.logger.log(`Alerte mandats : ${countAlerts} mandats proches de l'expiration.`);
    }
    async handleCrmRelances() {
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 3600 * 1000);
        const pendingTasks = await this.prisma.activiteCrm.findMany({
            where: {
                statut: 'a_faire',
                dateEcheance: { lte: next24h },
            },
            include: {
                prospect: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        commercialResponsableId: true,
                    },
                },
            },
        });
        for (const task of pendingTasks) {
            const isOverdue = task.dateEcheance && task.dateEcheance < now;
            await this.audit.record({
                userId: task.prospect.commercialResponsableId,
                action: isOverdue ? 'crm.activite_en_retard' : 'crm.activite_echeance_proche',
                entityType: 'ActiviteCrm',
                entityId: task.id,
                newValue: {
                    titre: task.titre,
                    dateEcheance: task.dateEcheance,
                    prospectId: task.prospectId,
                    isOverdue,
                },
            });
        }
    }
};
exports.CronService = CronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "handleMandatsEcheances", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "handleCrmRelances", null);
exports.CronService = CronService = CronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CronService);
//# sourceMappingURL=cron.service.js.map