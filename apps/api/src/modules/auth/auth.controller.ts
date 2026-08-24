import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthConfig } from '../../config/auth.config';
import { parseDurationToMs } from '../../common/utils/duration.util';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SkipPasswordCheck } from './decorators/skip-password-check.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import type { AuthenticatedUser } from './auth.types';

const REFRESH_COOKIE_NAME = 'mtm_refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.authConfig = this.configService.get<AuthConfig>('auth')!;
  }

  @Public()
  @Throttle({
    default: {
      limit: parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? '5', 10),
      ttl: parseInt(process.env.LOGIN_RATE_LIMIT_TTL ?? '60', 10) * 1000,
    },
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      dto.twoFactorCode,
      { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    );

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

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_COOKIE_NAME];

    if (!rawRefreshToken) {
      throw new ForbiddenException('Aucune session active');
    }

    const result = await this.authService.refresh(rawRefreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    this.setRefreshCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @SkipPasswordCheck()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = (
      req.cookies as Record<string, string> | undefined
    )?.[REFRESH_COOKIE_NAME];

    await this.authService.logout(rawRefreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME);

    return { success: true };
  }

  /**
   * Retourne le profil complet (avec rôles/permissions à jour) de
   * l'utilisateur authentifié. Utilisé par le frontend pour restaurer
   * une session après un rechargement de page : /auth/refresh ne
   * renvoie qu'un accessToken, pas le profil.
   */
  @Get('me')
  @SkipPasswordCheck()
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /**
   * Changement de mot de passe. Exempté du blocage mustChangePassword
   * puisque c'est précisément la route qui permet de le lever.
   */
  @Post('change-password')
  @SkipPasswordCheck()
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true };
  }

  @Post('2fa/setup')
  async setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(user.id, user.email);
  }

  @Post('2fa/confirm')
  async confirmTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    await this.authService.confirmTwoFactorSetup(user.id, dto.code);
    return { success: true };
  }

  @Post('2fa/disable')
  async disableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DisableTwoFactorDto,
  ) {
    await this.authService.disableTwoFactor(user.id, dto.currentPassword);
    return { success: true };
  }

  private setRefreshCookie(res: Response, rawRefreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('app.nodeEnv') === 'production',
      sameSite: 'strict',
      maxAge: parseDurationToMs(this.authConfig.jwtRefreshExpiresIn),
      path: '/api/auth',
    });
  }
}
