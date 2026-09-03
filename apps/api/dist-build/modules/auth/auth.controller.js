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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const duration_util_1 = require("../../common/utils/duration.util");
const auth_service_1 = require("./auth.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const public_decorator_1 = require("./decorators/public.decorator");
const skip_password_check_decorator_1 = require("./decorators/skip-password-check.decorator");
const skip_two_factor_requirement_decorator_1 = require("./decorators/skip-two-factor-requirement.decorator");
const change_password_dto_1 = require("./dto/change-password.dto");
const disable_two_factor_dto_1 = require("./dto/disable-two-factor.dto");
const login_dto_1 = require("./dto/login.dto");
const request_password_reset_dto_1 = require("./dto/request-password-reset.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const verify_two_factor_dto_1 = require("./dto/verify-two-factor.dto");
const REFRESH_COOKIE_NAME = 'mtm_refresh_token';
let AuthController = class AuthController {
    authService;
    configService;
    authConfig;
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
        this.authConfig = this.configService.get('auth');
    }
    async login(dto, req, res) {
        const result = await this.authService.login(dto.email, dto.password, dto.twoFactorCode, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
        if (result.requiresTwoFactor) {
            return result;
        }
        if (result.refreshToken) {
            this.setRefreshCookie(res, result.refreshToken);
        }
        return {
            requiresTwoFactor: false,
            accessToken: result.accessToken,
            user: result.user,
        };
    }
    async refresh(req, res) {
        const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (!rawRefreshToken) {
            throw new common_1.ForbiddenException('Aucune session active');
        }
        const result = await this.authService.refresh(rawRefreshToken, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        this.setRefreshCookie(res, result.refreshToken);
        return { accessToken: result.accessToken };
    }
    requestPasswordReset(dto, req) {
        return this.authService.requestPasswordReset(dto.email, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async resetPassword(dto, req) {
        await this.authService.resetPassword(dto.token, dto.newPassword, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true };
    }
    async logout(req, res) {
        const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
        await this.authService.logout(rawRefreshToken);
        res.clearCookie(REFRESH_COOKIE_NAME);
        return { success: true };
    }
    me(user) {
        return user;
    }
    async changePassword(user, dto) {
        await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
        return { success: true };
    }
    async setupTwoFactor(user) {
        return this.authService.setupTwoFactor(user.id, user.email);
    }
    async confirmTwoFactor(user, dto) {
        await this.authService.confirmTwoFactorSetup(user.id, dto.code);
        return { success: true };
    }
    async disableTwoFactor(user, dto) {
        await this.authService.disableTwoFactor(user.id, dto.currentPassword);
        return { success: true };
    }
    setRefreshCookie(res, rawRefreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
            httpOnly: true,
            secure: this.configService.get('app.nodeEnv') === 'production',
            sameSite: 'strict',
            maxAge: (0, duration_util_1.parseDurationToMs)(this.authConfig.jwtRefreshExpiresIn),
            path: '/api/auth',
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({
        default: {
            limit: Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? '5', 10),
            ttl: Number.parseInt(process.env.LOGIN_RATE_LIMIT_TTL ?? '60', 10) * 1000,
        },
    }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({
        default: { limit: 3, ttl: 60000 },
    }),
    (0, common_1.Post)('password-reset/request'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_password_reset_dto_1.RequestPasswordResetDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('password-reset/confirm'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, skip_password_check_decorator_1.SkipPasswordCheck)(),
    (0, skip_two_factor_requirement_decorator_1.SkipTwoFactorRequirement)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, skip_password_check_decorator_1.SkipPasswordCheck)(),
    (0, skip_two_factor_requirement_decorator_1.SkipTwoFactorRequirement)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, skip_password_check_decorator_1.SkipPasswordCheck)(),
    (0, skip_two_factor_requirement_decorator_1.SkipTwoFactorRequirement)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('2fa/setup'),
    (0, skip_two_factor_requirement_decorator_1.SkipTwoFactorRequirement)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setupTwoFactor", null);
__decorate([
    (0, common_1.Post)('2fa/confirm'),
    (0, skip_two_factor_requirement_decorator_1.SkipTwoFactorRequirement)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_two_factor_dto_1.VerifyTwoFactorDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmTwoFactor", null);
__decorate([
    (0, common_1.Post)('2fa/disable'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, disable_two_factor_dto_1.DisableTwoFactorDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "disableTwoFactor", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map