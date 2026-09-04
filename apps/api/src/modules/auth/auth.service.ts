import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import type { AuthConfig } from '../../config/auth.config';
import { parseDurationToMs } from '../../common/utils/duration.util';
import { PrismaService } from '../../database/prisma.service';
import { UsersService, UserWithRoles } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from './two-factor.service';
import { JwtPayload, LoginResponse } from './auth.types';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetResult {
  accepted: true;
  developmentToken?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
    private readonly auditService: AuditService,
  ) {
    this.authConfig = this.configService.get<AuthConfig>('auth')!;
  }

  async login(
    email: string,
    password: string,
    twoFactorCode: string | undefined,
    context: RequestContext,
  ): Promise<LoginResponse & { refreshToken?: string }> {
    const user = await this.usersService.findByEmail(email);

    // Message volontairement générique : ne jamais révéler si l'email
    // existe ou non (protection contre l'énumération de comptes).
    const invalidCredentialsMessage = 'Identifiants invalides';

    if (!user) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    if (!user?.isActive) {
      await this.recordAudit(user.id, 'auth.login.rejected_inactive', context);
      throw new ForbiddenException('Ce compte a été désactivé');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordAudit(user.id, 'auth.login.rejected_locked', context);
      throw new ForbiddenException(
        'Compte temporairement verrouillé suite à plusieurs échecs de connexion',
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      await this.handleFailedLogin(user, context);
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    // --- 2FA ---
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return {
          requiresTwoFactor: true,
          message: 'Code de double authentification requis',
        };
      }
      const secret = this.twoFactorService.decryptSecret(
        user.twoFactorSecret ?? '',
      );
      let codeValid = this.twoFactorService.verifyCode(twoFactorCode, secret);
      let usedRecoveryCode = false;

      if (!codeValid && user.twoFactorRecoveryCodes) {
        const recoveryResult = this.twoFactorService.verifyRecoveryCode(
          twoFactorCode,
          user.twoFactorRecoveryCodes,
        );
        if (recoveryResult.valid) {
          codeValid = true;
          usedRecoveryCode = true;
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorRecoveryCodes: this.twoFactorService.encryptRecoveryCodes(
                recoveryResult.remainingCodes,
              ),
            },
          });
          await this.recordAudit(
            user.id,
            'auth.login.used_recovery_code',
            context,
          );
        }
      }

      if (!codeValid) {
        await this.recordAudit(
          user.id,
          'auth.login.rejected_invalid_2fa',
          context,
        );
        throw new UnauthorizedException(
          'Code de double authentification ou code de secours invalide',
        );
      }
    }

    // --- Succès ---
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

  async refresh(
    rawRefreshToken: string,
    context: RequestContext,
  ): Promise<RefreshResult> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Session invalide, veuillez vous reconnecter',
      );
    }

    const user = await this.usersService.findById(existing.userId);
    if (!user?.isActive) {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    // Rotation : on révoque l'ancien token et on en émet un nouveau.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id, context);

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(
    email: string,
    context: RequestContext,
  ): Promise<PasswordResetResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return { accepted: true };

    const rawToken = randomBytes(32).toString('hex');
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

    // A mail/SMS provider will replace this development-only handoff.
    return process.env.NODE_ENV === 'production'
      ? { accepted: true }
      : { accepted: true, developmentToken: rawToken };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
    context: RequestContext,
  ): Promise<void> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Jeton de récupération invalide ou expiré',
      );
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.authConfig.bcryptSaltRounds,
    );
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
    await this.recordAudit(
      token.userId,
      'auth.password_reset.completed',
      context,
    );
  }

  // ============================================================
  // 2FA — activation
  // ============================================================

  async setupTwoFactor(userId: string, email: string) {
    const setup = await this.twoFactorService.generateSetup(email);
    // Le secret est stocké mais 2FA reste désactivé tant que l'utilisateur
    // n'a pas confirmé un code valide via confirmTwoFactorSetup().
    await this.usersService.setTwoFactorSecret(
      userId,
      this.twoFactorService.encryptSecret(setup.secret),
    );
    return {
      otpauthUrl: setup.otpauthUrl,
      qrCodeDataUrl: setup.qrCodeDataUrl,
    };
  }

  async confirmTwoFactorSetup(
    userId: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.usersService.findById(userId);
    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException(
        'Aucune configuration 2FA en attente pour cet utilisateur',
      );
    }

    const valid = this.twoFactorService.verifyCode(
      code,
      this.twoFactorService.decryptSecret(user.twoFactorSecret),
    );
    if (!valid) {
      throw new UnauthorizedException('Code invalide');
    }

    const recoveryCodes = this.twoFactorService.generateRecoveryCodes();
    const encryptedRecovery =
      this.twoFactorService.encryptRecoveryCodes(recoveryCodes);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: encryptedRecovery,
      },
    });
    await this.recordAudit(userId, 'auth.2fa.enabled', {});

    return { recoveryCodes };
  }

  async disableTwoFactor(
    userId: string,
    currentPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    await this.usersService.disableTwoFactor(userId);
    await this.recordAudit(userId, 'auth.2fa.disabled', {});
  }

  // ============================================================
  // Changement de mot de passe
  // ============================================================

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.authConfig.bcryptSaltRounds,
    );
    await this.usersService.changePassword(userId, hashedPassword);
    await this.recordAudit(userId, 'auth.password.changed', {});
  }

  // ============================================================
  // Privé
  // ============================================================

  private async handleFailedLogin(
    user: UserWithRoles,
    context: RequestContext,
  ): Promise<void> {
    const updated = await this.usersService.incrementFailedAttempts(user.id);
    await this.recordAudit(user.id, 'auth.login.failed', context);

    if (updated.failedLoginAttempts >= this.authConfig.accountLockThreshold) {
      const lockUntil = new Date(
        Date.now() + this.authConfig.accountLockDurationMinutes * 60 * 1000,
      );
      await this.usersService.lockAccount(user.id, lockUntil);
      await this.recordAudit(user.id, 'auth.account.locked', context);
      this.logger.warn(
        `Compte verrouillé après ${updated.failedLoginAttempts} échecs: ${user.email}`,
      );
    }
  }

  private generateAccessToken(user: UserWithRoles): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, {
      secret: this.authConfig.jwtAccessSecret,
      // Cast nécessaire : voir auth.module.ts (type strict `ms.StringValue`
      // incompatible avec une durée dynamique issue de la configuration).
      expiresIn: this.authConfig.jwtAccessExpiresIn as unknown as number,
    });
  }

  private async issueRefreshToken(
    userId: string,
    context: RequestContext,
  ): Promise<string> {
    const rawToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(this.authConfig.jwtRefreshExpiresIn),
    );

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

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toAuthenticatedUser(user: UserWithRoles) {
    return this.usersService.toAuthenticatedUser(user);
  }

  private async recordAudit(
    userId: string | null,
    action: string,
    context: RequestContext,
  ): Promise<void> {
    await this.auditService.record({
      userId,
      action,
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
