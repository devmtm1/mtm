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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const bcrypt = __importStar(require("bcrypt"));
const duration_util_1 = require("../../common/utils/duration.util");
const prisma_service_1 = require("../../database/prisma.service");
const users_service_1 = require("../users/users.service");
const audit_service_1 = require("../audit/audit.service");
const two_factor_service_1 = require("./two-factor.service");
let AuthService = AuthService_1 = class AuthService {
    usersService;
    prisma;
    jwtService;
    configService;
    twoFactorService;
    auditService;
    logger = new common_1.Logger(AuthService_1.name);
    authConfig;
    constructor(usersService, prisma, jwtService, configService, twoFactorService, auditService) {
        this.usersService = usersService;
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.twoFactorService = twoFactorService;
        this.auditService = auditService;
        this.authConfig = this.configService.get('auth');
    }
    async login(email, password, twoFactorCode, context) {
        const user = await this.usersService.findByEmail(email);
        const invalidCredentialsMessage = 'Identifiants invalides';
        if (!user) {
            throw new common_1.UnauthorizedException(invalidCredentialsMessage);
        }
        if (!user?.isActive) {
            await this.recordAudit(user.id, 'auth.login.rejected_inactive', context);
            throw new common_1.ForbiddenException('Ce compte a été désactivé');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            await this.recordAudit(user.id, 'auth.login.rejected_locked', context);
            throw new common_1.ForbiddenException('Compte temporairement verrouillé suite à plusieurs échecs de connexion');
        }
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            await this.handleFailedLogin(user, context);
            throw new common_1.UnauthorizedException(invalidCredentialsMessage);
        }
        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                return {
                    requiresTwoFactor: true,
                    message: 'Code de double authentification requis',
                };
            }
            const secret = this.twoFactorService.decryptSecret(user.twoFactorSecret ?? '');
            const codeValid = this.twoFactorService.verifyCode(twoFactorCode, secret);
            if (!codeValid) {
                await this.recordAudit(user.id, 'auth.login.rejected_invalid_2fa', context);
                throw new common_1.UnauthorizedException('Code de double authentification invalide');
            }
        }
        await this.usersService.resetFailedAttempts(user.id);
        await this.usersService.updateLastLogin(user.id);
        await this.recordAudit(user.id, 'auth.login.success', context);
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id, context);
        return {
            requiresTwoFactor: false,
            accessToken,
            refreshToken,
            user: this.toAuthenticatedUser(user),
        };
    }
    async refresh(rawRefreshToken, context) {
        const tokenHash = this.hashToken(rawRefreshToken);
        const existing = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
        });
        if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Session invalide, veuillez vous reconnecter');
        }
        const user = await this.usersService.findById(existing.userId);
        if (!user?.isActive) {
            throw new common_1.UnauthorizedException('Compte introuvable ou désactivé');
        }
        await this.prisma.refreshToken.update({
            where: { id: existing.id },
            data: { revokedAt: new Date() },
        });
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id, context);
        return { accessToken, refreshToken };
    }
    async logout(rawRefreshToken) {
        if (!rawRefreshToken)
            return;
        const tokenHash = this.hashToken(rawRefreshToken);
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async requestPasswordReset(email, context) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.isActive)
            return { accepted: true };
        const rawToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
        await this.prisma.passwordResetToken.deleteMany({
            where: { userId: user.id, usedAt: null },
        });
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: this.hashToken(rawToken),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });
        await this.recordAudit(user.id, 'auth.password_reset.requested', context);
        return process.env.NODE_ENV === 'production'
            ? { accepted: true }
            : { accepted: true, developmentToken: rawToken };
    }
    async resetPassword(rawToken, newPassword, context) {
        const token = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash: this.hashToken(rawToken) },
        });
        if (!token || token.usedAt || token.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Jeton de récupération invalide ou expiré');
        }
        const hashedPassword = await bcrypt.hash(newPassword, this.authConfig.bcryptSaltRounds);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: token.userId },
                data: {
                    password: hashedPassword,
                    mustChangePassword: false,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId: token.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: token.id },
                data: { usedAt: new Date() },
            }),
        ]);
        await this.recordAudit(token.userId, 'auth.password_reset.completed', context);
    }
    async setupTwoFactor(userId, email) {
        const setup = await this.twoFactorService.generateSetup(email);
        await this.usersService.setTwoFactorSecret(userId, this.twoFactorService.encryptSecret(setup.secret));
        return {
            otpauthUrl: setup.otpauthUrl,
            qrCodeDataUrl: setup.qrCodeDataUrl,
        };
    }
    async confirmTwoFactorSetup(userId, code) {
        const user = await this.usersService.findById(userId);
        if (!user?.twoFactorSecret) {
            throw new common_1.UnauthorizedException('Aucune configuration 2FA en attente pour cet utilisateur');
        }
        const valid = this.twoFactorService.verifyCode(code, this.twoFactorService.decryptSecret(user.twoFactorSecret));
        if (!valid) {
            throw new common_1.UnauthorizedException('Code invalide');
        }
        await this.usersService.enableTwoFactor(userId);
        await this.recordAudit(userId, 'auth.2fa.enabled', {});
    }
    async disableTwoFactor(userId, currentPassword) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur introuvable');
        }
        const passwordValid = await bcrypt.compare(currentPassword, user.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Mot de passe incorrect');
        }
        await this.usersService.disableTwoFactor(userId);
        await this.recordAudit(userId, 'auth.2fa.disabled', {});
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Utilisateur introuvable');
        }
        const passwordValid = await bcrypt.compare(currentPassword, user.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Mot de passe actuel incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, this.authConfig.bcryptSaltRounds);
        await this.usersService.changePassword(userId, hashedPassword);
        await this.recordAudit(userId, 'auth.password.changed', {});
    }
    async handleFailedLogin(user, context) {
        const updated = await this.usersService.incrementFailedAttempts(user.id);
        await this.recordAudit(user.id, 'auth.login.failed', context);
        if (updated.failedLoginAttempts >= this.authConfig.accountLockThreshold) {
            const lockUntil = new Date(Date.now() + this.authConfig.accountLockDurationMinutes * 60 * 1000);
            await this.usersService.lockAccount(user.id, lockUntil);
            await this.recordAudit(user.id, 'auth.account.locked', context);
            this.logger.warn(`Compte verrouillé après ${updated.failedLoginAttempts} échecs: ${user.email}`);
        }
    }
    generateAccessToken(user) {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.sign(payload, {
            secret: this.authConfig.jwtAccessSecret,
            expiresIn: this.authConfig.jwtAccessExpiresIn,
        });
    }
    async issueRefreshToken(userId, context) {
        const rawToken = (0, node_crypto_1.randomBytes)(64).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + (0, duration_util_1.parseDurationToMs)(this.authConfig.jwtRefreshExpiresIn));
        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            },
        });
        return rawToken;
    }
    hashToken(rawToken) {
        return (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex');
    }
    toAuthenticatedUser(user) {
        return this.usersService.toAuthenticatedUser(user);
    }
    async recordAudit(userId, action, context) {
        await this.auditService.record({
            userId,
            action,
            entityType: 'User',
            entityId: userId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        two_factor_service_1.TwoFactorService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map