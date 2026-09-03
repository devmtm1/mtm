import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import type { AuthenticatedUser } from './auth.types';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    private readonly authConfig;
    constructor(authService: AuthService, configService: ConfigService);
    login(dto: LoginDto, req: Request, res: Response): Promise<(import("./auth.types").TwoFactorRequiredResult & {
        refreshToken?: string;
    }) | {
        requiresTwoFactor: boolean;
        accessToken: string;
        user: AuthenticatedUser;
    }>;
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    requestPasswordReset(dto: RequestPasswordResetDto, req: Request): Promise<import("./auth.service").PasswordResetResult>;
    resetPassword(dto: ResetPasswordDto, req: Request): Promise<{
        success: boolean;
    }>;
    logout(req: Request, res: Response): Promise<{
        success: boolean;
    }>;
    me(user: AuthenticatedUser): AuthenticatedUser;
    changePassword(user: AuthenticatedUser, dto: ChangePasswordDto): Promise<{
        success: boolean;
    }>;
    setupTwoFactor(user: AuthenticatedUser): Promise<{
        otpauthUrl: string;
        qrCodeDataUrl: string;
    }>;
    confirmTwoFactor(user: AuthenticatedUser, dto: VerifyTwoFactorDto): Promise<{
        success: boolean;
    }>;
    disableTwoFactor(user: AuthenticatedUser, dto: DisableTwoFactorDto): Promise<{
        success: boolean;
    }>;
    private setRefreshCookie;
}
