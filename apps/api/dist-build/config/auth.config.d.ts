export interface AuthConfig {
    jwtAccessSecret: string;
    jwtAccessExpiresIn: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiresIn: string;
    bcryptSaltRounds: number;
    loginRateLimitTtl: number;
    loginRateLimitMax: number;
    accountLockThreshold: number;
    accountLockDurationMinutes: number;
    twoFactorAppName: string;
}
declare const _default: (() => AuthConfig) & import("@nestjs/config").ConfigFactoryKeyHost<AuthConfig>;
export default _default;
