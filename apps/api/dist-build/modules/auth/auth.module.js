"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const core_1 = require("@nestjs/core");
const users_module_1 = require("../users/users.module");
const audit_module_1 = require("../audit/audit.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const two_factor_service_1 = require("./two-factor.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const permissions_guard_1 = require("./guards/permissions.guard");
const must_change_password_guard_1 = require("./guards/must-change-password.guard");
const sensitive_two_factor_guard_1 = require("./guards/sensitive-two-factor.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            audit_module_1.AuditModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const authConfig = configService.get('auth');
                    return {
                        secret: authConfig.jwtAccessSecret,
                        signOptions: {
                            expiresIn: authConfig.jwtAccessExpiresIn,
                        },
                    };
                },
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            two_factor_service_1.TwoFactorService,
            jwt_strategy_1.JwtStrategy,
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: must_change_password_guard_1.MustChangePasswordGuard },
            { provide: core_1.APP_GUARD, useClass: sensitive_two_factor_guard_1.SensitiveTwoFactorGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map