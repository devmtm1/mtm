import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from './two-factor.service';
import { LoginResponse } from './auth.types';
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
export declare class AuthService {
    private readonly usersService;
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly twoFactorService;
    private readonly auditService;
    private readonly logger;
    private readonly authConfig;
    constructor(usersService: UsersService, prisma: PrismaService, jwtService: JwtService, configService: ConfigService, twoFactorService: TwoFactorService, auditService: AuditService);
    login(email: string, password: string, twoFactorCode: string | undefined, context: RequestContext): Promise<LoginResponse & {
        refreshToken?: string;
    }>;
    refresh(rawRefreshToken: string, context: RequestContext): Promise<RefreshResult>;
    logout(rawRefreshToken: string | undefined): Promise<void>;
    requestPasswordReset(email: string, context: RequestContext): Promise<PasswordResetResult>;
    resetPassword(rawToken: string, newPassword: string, context: RequestContext): Promise<void>;
    setupTwoFactor(userId: string, email: string): Promise<{
        otpauthUrl: string;
        qrCodeDataUrl: string;
    }>;
    confirmTwoFactorSetup(userId: string, code: string): Promise<void>;
    disableTwoFactor(userId: string, currentPassword: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    private handleFailedLogin;
    private generateAccessToken;
    private issueRefreshToken;
    private hashToken;
    private toAuthenticatedUser;
    private recordAudit;
}
