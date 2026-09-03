import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly rolesService;
    private readonly auditService;
    constructor(rolesService: RolesService, auditService: AuditService);
    findAll(): Promise<({
        _count: {
            users: number;
        };
        permissions: ({
            permission: {
                id: string;
                action: string;
                createdAt: Date;
                name: string;
                description: string | null;
                resource: string;
            };
        } & {
            roleId: string;
            assignedAt: Date;
            permissionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    })[]>;
    findOne(id: string): Promise<{
        permissions: ({
            permission: {
                id: string;
                action: string;
                createdAt: Date;
                name: string;
                description: string | null;
                resource: string;
            };
        } & {
            roleId: string;
            assignedAt: Date;
            permissionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    }>;
    create(dto: CreateRoleDto, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    }>;
    update(id: string, dto: UpdateRoleDto, currentUser: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
    }>;
    remove(id: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    assignPermissions(id: string, dto: AssignPermissionsDto, currentUser: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
    removePermission(id: string, permissionId: string, currentUser: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
}
