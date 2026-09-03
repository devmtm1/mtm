import { PrismaService } from '../../database/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
export interface SafeSetting {
    id: string;
    key: string;
    value: unknown;
    description: string | null;
    isSensitive: boolean;
    updatedAt: Date;
    createdAt: Date;
    redacted: boolean;
}
export declare class SettingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(canViewSensitive: boolean): Promise<SafeSetting[]>;
    findByKey(key: string, canViewSensitive: boolean): Promise<SafeSetting>;
    getRawValue(key: string): Promise<unknown>;
    create(dto: CreateSettingDto, updatedById: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        isSensitive: boolean;
        updatedById: string | null;
    }>;
    update(key: string, value: unknown, description: string | undefined, updatedById: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        isSensitive: boolean;
        updatedById: string | null;
    }>;
    remove(key: string): Promise<void>;
    isSensitive(key: string): Promise<boolean>;
    private toSafeSetting;
    private toJson;
}
