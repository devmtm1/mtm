import { PermissionsService } from './permissions.service';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    findAll(): Promise<{
        id: string;
        action: string;
        createdAt: Date;
        name: string;
        description: string | null;
        resource: string;
    }[]>;
}
