import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | 'findByEmail'
      | 'findById'
      | 'incrementFailedAttempts'
      | 'resetFailedAttempts'
      | 'lockAccount'
      | 'updateLastLogin'
      | 'getPermissionNames'
      | 'toAuthenticatedUser'
      | 'changePassword'
      | 'disableTwoFactor'
    >
  >;
  let prismaMock: {
    auditLog: { create: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  const baseUser = {
    id: 'user-1',
    email: 'admin@mtm-immobilier.sn',
    password: 'hashed-password',
    firstName: 'Admin',
    lastName: 'MTM',
    isActive: true,
    mustChangePassword: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorRecoveryCodes: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      resetFailedAttempts: jest.fn(),
      lockAccount: jest.fn(),
      updateLastLogin: jest.fn(),
      getPermissionNames: jest.fn().mockReturnValue([]),
      toAuthenticatedUser: jest
        .fn()
        .mockImplementation((user: typeof baseUser) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: [],
          permissions: [],
          mustChangePassword: user.mustChangePassword,
          twoFactorEnabled: user.twoFactorEnabled,
        })),
      changePassword: jest.fn(),
      disableTwoFactor: jest.fn(),
    };

    prismaMock = {
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const configService = {
      get: jest.fn().mockReturnValue({
        jwtAccessSecret: 'test-secret-min-32-characters-long',
        jwtAccessExpiresIn: '15m',
        jwtRefreshSecret: 'test-refresh-secret-min-32-chars',
        jwtRefreshExpiresIn: '7d',
        bcryptSaltRounds: 4, // faible en test pour la vitesse
        loginRateLimitTtl: 60,
        loginRateLimitMax: 5,
        accountLockThreshold: 5,
        accountLockDurationMinutes: 15,
        twoFactorAppName: 'MTM Immobilier',
      }),
    } as unknown as ConfigService;

    const jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    } as unknown as JwtService;

    const twoFactorService = {
      verifyCode: jest.fn(),
      generateSetup: jest.fn(),
      encryptSecret: jest.fn((secret: string) => `enc:${secret}`),
      decryptSecret: jest.fn((secret: string) => secret),
    } as unknown as TwoFactorService;

    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;

    service = new AuthService(
      usersService as unknown as UsersService,
      prismaMock as unknown as PrismaService,
      jwtService,
      configService,
      twoFactorService,
      auditService,
    );
  });

  describe('login', () => {
    it("rejette avec un message générique si l'utilisateur n'existe pas", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('inconnu@mtm.sn', 'password', undefined, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette si le compte est inactif', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });

      await expect(
        service.login(baseUser.email, 'password', undefined, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejette si le compte est verrouillé', async () => {
      const future = new Date(Date.now() + 60_000);
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        lockedUntil: future,
      });

      await expect(
        service.login(baseUser.email, 'password', undefined, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('incrémente les échecs et verrouille après le seuil configuré', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });
      usersService.incrementFailedAttempts.mockResolvedValue({
        ...baseUser,
        failedLoginAttempts: 5,
      });

      await expect(
        service.login(baseUser.email, 'mauvais-mot-de-passe', undefined, {}),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.incrementFailedAttempts).toHaveBeenCalledWith(
        baseUser.id,
      );
      expect(usersService.lockAccount).toHaveBeenCalledWith(
        baseUser.id,
        expect.any(Date),
      );
    });

    it('retourne requiresTwoFactor=true si le 2FA est activé sans code fourni', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
      });

      const result = await service.login(
        baseUser.email,
        'correct-password',
        undefined,
        {},
      );

      expect(result.requiresTwoFactor).toBe(true);
    });

    it('réussit et retourne un accessToken + refreshToken avec mot de passe correct', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });

      const result = await service.login(
        baseUser.email,
        'correct-password',
        undefined,
        { ipAddress: '127.0.0.1' },
      );

      expect(result.requiresTwoFactor).toBe(false);
      if (!result.requiresTwoFactor) {
        expect(result.accessToken).toBe('signed.jwt.token');
        expect(result.refreshToken).toEqual(expect.any(String));
        expect(result.user.email).toBe(baseUser.email);
      }
      expect(usersService.resetFailedAttempts).toHaveBeenCalledWith(
        baseUser.id,
      );
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rejette un token inconnu', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejette un token révoqué', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('revoked-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejette un token expiré', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.refresh('expired-token', {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('effectue la rotation et retourne de nouveaux tokens si valide', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      usersService.findById.mockResolvedValue(baseUser);

      const result = await service.refresh('valid-token', {});

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it("ne fait rien si aucun token n'est fourni", async () => {
      await service.logout(undefined);
      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('révoque le token fourni', async () => {
      await service.logout('some-token');
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('rejette si le mot de passe actuel est incorrect', async () => {
      const hashedPassword = await bcrypt.hash('bon-mot-de-passe', 4);
      usersService.findById.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });

      await expect(
        service.changePassword(
          baseUser.id,
          'mauvais-mot-de-passe',
          'NouveauMdp123!',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.changePassword).not.toHaveBeenCalled();
    });

    it('change le mot de passe si le mot de passe actuel est correct', async () => {
      const hashedPassword = await bcrypt.hash('bon-mot-de-passe', 4);
      usersService.findById.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });
      usersService.changePassword.mockResolvedValue(baseUser);

      await service.changePassword(
        baseUser.id,
        'bon-mot-de-passe',
        'NouveauMdp123!',
      );

      expect(usersService.changePassword).toHaveBeenCalledWith(
        baseUser.id,
        expect.any(String),
      );
    });
  });

  describe('disableTwoFactor', () => {
    it('rejette si le mot de passe actuel est incorrect', async () => {
      const hashedPassword = await bcrypt.hash('bon-mot-de-passe', 4);
      usersService.findById.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });

      await expect(
        service.disableTwoFactor(baseUser.id, 'mauvais-mot-de-passe'),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.disableTwoFactor).not.toHaveBeenCalled();
    });

    it('désactive le 2FA si le mot de passe actuel est correct', async () => {
      const hashedPassword = await bcrypt.hash('bon-mot-de-passe', 4);
      usersService.findById.mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });
      usersService.disableTwoFactor.mockResolvedValue(baseUser);

      await service.disableTwoFactor(baseUser.id, 'bon-mot-de-passe');

      expect(usersService.disableTwoFactor).toHaveBeenCalledWith(baseUser.id);
    });
  });

  describe('récupération de compte', () => {
    it('répond de façon générique pour un email inconnu', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('inconnu@mtm.sn', {}),
      ).resolves.toEqual({ accepted: true });
      expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('crée un token temporaire pour un compte actif hors production', async () => {
      usersService.findByEmail.mockResolvedValue(baseUser);

      const result = await service.requestPasswordReset(baseUser.email, {});

      expect(result.accepted).toBe(true);
      expect(result.developmentToken).toHaveLength(64);
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();
    });

    it('réinitialise le mot de passe et invalide les sessions', async () => {
      const rawToken = 'a'.repeat(64);
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: baseUser.id,
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      await service.resetPassword(rawToken, 'NouveauMotDePasse123!', {});

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: baseUser.id } }),
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: baseUser.id, revokedAt: null },
        }),
      );
    });
  });
});
