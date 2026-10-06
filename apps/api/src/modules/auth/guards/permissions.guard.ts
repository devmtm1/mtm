import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTHENTICATED_KEY } from '../decorators/authenticated.decorator';
import type { AuthenticatedUser } from '../auth.types';

@Injectable()
export class PermissionsGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      targets,
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // Une route sans permission n'est ouverte que si elle le déclare :
      // publique, ou réservée à tout utilisateur connecté. Un oubli de
      // décorateur ferme la route au lieu de l'ouvrir.
      const ouverteExplicitement =
        this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) ||
        this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets);
      if (!ouverteExplicitement) {
        throw new ForbiddenException(
          'Accès non déclaré pour cette route : permission requise',
        );
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Permissions insuffisantes pour cette action',
      );
    }

    return true;
  }
}
