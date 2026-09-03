"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const toNumber = (value, fallback) => Number.parseInt(value ?? String(fallback), 10);
exports.default = (0, config_1.registerAs)('auth', () => ({
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
    loginRateLimitTtl: toNumber(process.env.LOGIN_RATE_LIMIT_TTL, 60),
    loginRateLimitMax: toNumber(process.env.LOGIN_RATE_LIMIT_MAX, 5),
    accountLockThreshold: toNumber(process.env.ACCOUNT_LOCK_THRESHOLD, 5),
    accountLockDurationMinutes: toNumber(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 15),
    twoFactorAppName: process.env.TWO_FACTOR_APP_NAME ?? 'MTM Immobilier',
}));
//# sourceMappingURL=auth.config.js.map