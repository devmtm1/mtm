import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';
import type { AuthenticatedUser } from '../auth.types';

/**
 * Bloque l'accès à toute route (sauf allowlist explicite) tant que
 * l'utilisateur a mustChangePassword === true. Défense en profondeur :
 * le frontend redirige déjà vers /change-password, mais un client tiers
 * ou un token réutilisé ne doit pas pouvoir contourner cette exigence
 * simplement en ignorant le frontend.
 */
@Injectable()
export class MustChangePasswordGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Vous devez changer votre mot de passe avant de continuer.',
      });
    }

    return true;
  }
}
