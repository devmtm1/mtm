import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare class PermissionsGuard {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
