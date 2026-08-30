import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_TWO_FACTOR_REQUIREMENT_KEY } from '../decorators/skip-two-factor-requirement.decorator';
import type { AuthenticatedUser } from '../auth.types';

const SENSITIVE_ROLES = new Set([
  'administrateur',
  'direction',
  'comptable',
  'rh',
]);

@Injectable()
export class SensitiveTwoFactorGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TWO_FACTOR_REQUIREMENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) return true;

    const sensitive = user.roles.some((role) => SENSITIVE_ROLES.has(role));
    if (sensitive && !user.twoFactorEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TWO_FACTOR_REQUIRED',
        message:
          'La double authentification est obligatoire pour ce compte sensible.',
      });
    }

    return true;
  }
}
