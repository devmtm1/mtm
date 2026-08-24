import { registerAs } from '@nestjs/config';

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

export default registerAs('auth', (): AuthConfig => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  loginRateLimitTtl: parseInt(process.env.LOGIN_RATE_LIMIT_TTL ?? '60', 10),
  loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? '5', 10),
  accountLockThreshold: parseInt(process.env.ACCOUNT_LOCK_THRESHOLD ?? '5', 10),
  accountLockDurationMinutes: parseInt(
    process.env.ACCOUNT_LOCK_DURATION_MINUTES ?? '15',
    10,
  ),
  twoFactorAppName: process.env.TWO_FACTOR_APP_NAME ?? 'MTM Immobilier',
}));
