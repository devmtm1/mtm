import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    private readonly auditService;
    constructor(settingsService: SettingsService, auditService: AuditService);
    findAll(user: AuthenticatedUser): Promise<import("./settings.service").SafeSetting[]>;
    findOne(key: string, user: AuthenticatedUser): Promise<import("./settings.service").SafeSetting>;
    create(dto: CreateSettingDto, user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        isSensitive: boolean;
        updatedById: string | null;
    }>;
    update(key: string, dto: UpdateSettingDto, user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        isSensitive: boolean;
        updatedById: string | null;
    }>;
    remove(key: string, user: AuthenticatedUser, req: Request): Promise<{
        success: boolean;
    }>;
}
