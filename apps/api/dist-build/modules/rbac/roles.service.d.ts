import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
        name: string;
        updatedAt: Date;
        description: string | null;
        isSystem: boolean;
    })[]>;
    findById(id: string): Promise<{
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
        name: string;
        updatedAt: Date;
        description: string | null;
        isSystem: boolean;
    }>;
    create(dto: CreateRoleDto): Promise<Role>;
    update(id: string, dto: UpdateRoleDto): Promise<Role>;
    remove(id: string): Promise<void>;
    assignPermissions(roleId: string, permissionNames: string[]): Promise<void>;
    removePermission(roleId: string, permissionId: string): Promise<void>;
}
