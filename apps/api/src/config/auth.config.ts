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
  /**
   * Attribut SameSite du cookie de session (refresh token). `strict` suffit
   * quand front et API partagent le même site (localhost, même domaine) ;
   * `none` est obligatoire quand ils sont sur des sites différents
   * (ex. *.onrender.com, domaine public-suffix), sinon le navigateur
   * n'envoie jamais le cookie et la session ne survit pas à un rechargement.
   */
  refreshCookieSameSite: 'strict' | 'lax' | 'none';
}

const toSameSite = (value: string | undefined): 'strict' | 'lax' | 'none' =>
  value === 'none' || value === 'lax' ? value : 'strict';

const toNumber = (value: string | undefined, fallback: number): number =>
  Number.parseInt(value ?? String(fallback), 10);

export default registerAs('auth', (): AuthConfig => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  loginRateLimitTtl: toNumber(process.env.LOGIN_RATE_LIMIT_TTL, 60),
  loginRateLimitMax: toNumber(process.env.LOGIN_RATE_LIMIT_MAX, 5),
  accountLockThreshold: toNumber(process.env.ACCOUNT_LOCK_THRESHOLD, 5),
  accountLockDurationMinutes: toNumber(
    process.env.ACCOUNT_LOCK_DURATION_MINUTES,
    15,
  ),
  twoFactorAppName: process.env.TWO_FACTOR_APP_NAME ?? 'MTM Immobilier',
  refreshCookieSameSite: toSameSite(process.env.REFRESH_COOKIE_SAME_SITE),
}));
