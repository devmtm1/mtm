import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import type { AuthConfig } from '../../config/auth.config';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { MustChangePasswordGuard } from './guards/must-change-password.guard';
import { SensitiveTwoFactorGuard } from './guards/sensitive-two-factor.guard';

@Module({
  imports: [
    UsersModule,
    AuditModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get<AuthConfig>('auth')!;
        return {
          secret: authConfig.jwtAccessSecret,
          signOptions: {
            // Cast nécessaire : @nestjs/jwt attend le type strict `StringValue`
            // du package `ms`, incompatible avec une durée lue dynamiquement
            // depuis une variable d'environnement (déjà validée par Joi).
            expiresIn: authConfig.jwtAccessExpiresIn as unknown as number,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    // Guards globaux : toute route est protégée par défaut (JWT), puis
    // bloquée si un changement de mot de passe est requis (sauf routes
    // exemptées via @SkipPasswordCheck), puis vérifiée au niveau
    // permissions si @RequirePermissions est déclaré.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
    { provide: APP_GUARD, useClass: SensitiveTwoFactorGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
