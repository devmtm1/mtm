import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { AssignRoleDto } from '../rbac/dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    private readonly auditService;
    constructor(usersService: UsersService, auditService: AuditService);
    findAll(): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        twoFactorEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: string[];
    }[]>;
    create(dto: CreateUserDto, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        twoFactorEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: string[];
    }>;
    update(id: string, dto: UpdateUserDto, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        twoFactorEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: string[];
    }>;
    remove(id: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    activate(id: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        twoFactorEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: string[];
    }>;
    deactivate(id: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        twoFactorEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: string[];
    }>;
    resetTwoFactor(id: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        twoFactorEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: string[];
    }>;
    assignRole(id: string, dto: AssignRoleDto, currentUser: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    removeRole(id: string, roleId: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    private toSafeUser;
}
