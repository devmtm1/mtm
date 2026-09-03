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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../database/prisma.service");
const cloudinary_service_1 = require("../../common/storage/cloudinary.service");
let HealthService = HealthService_1 = class HealthService {
    prisma;
    configService;
    cloudinaryService;
    logger = new common_1.Logger(HealthService_1.name);
    constructor(prisma, configService, cloudinaryService) {
        this.prisma = prisma;
        this.configService = configService;
        this.cloudinaryService = cloudinaryService;
    }
    async check() {
        const database = await this.checkDatabase();
        const storage = this.checkStorage();
        const auth = this.checkAuth();
        const hasCriticalFailure = database === 'down' || auth === 'down';
        return {
            status: hasCriticalFailure ? 'error' : 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database,
            storage,
            auth,
        };
    }
    async checkDatabase() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return 'up';
        }
        catch (error) {
            this.logger.error('Échec du ping base de données', error);
            return 'down';
        }
    }
    checkStorage() {
        const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');
        if (!cloudName || !apiKey || !apiSecret) {
            return 'skipped';
        }
        try {
            const configured = !!cloudName && !!apiKey && !!apiSecret;
            return configured ? 'up' : 'down';
        }
        catch (error) {
            this.logger.error('Échec du vérification du stockage', error);
            return 'down';
        }
    }
    checkAuth() {
        const accessSecret = this.configService.get('JWT_ACCESS_SECRET');
        const refreshSecret = this.configService.get('JWT_REFRESH_SECRET');
        if (!accessSecret || accessSecret.length < 32) {
            this.logger.error('JWT_ACCESS_SECRET manquant ou trop court');
            return 'down';
        }
        if (!refreshSecret || refreshSecret.length < 32) {
            this.logger.error('JWT_REFRESH_SECRET manquant ou trop court');
            return 'down';
        }
        return 'up';
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        cloudinary_service_1.CloudinaryService])
], HealthService);
//# sourceMappingURL=health.service.js.map