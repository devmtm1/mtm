import { ConfigService } from '@nestjs/config';
export interface UploadedAsset {
    publicId: string;
    resourceType: string;
    secureUrl: string;
}
export declare class CloudinaryService {
    private readonly config;
    constructor(config: ConfigService);
    upload(file: Express.Multer.File, folder: string, isPublic: boolean): Promise<UploadedAsset>;
    destroy(publicId: string, resourceType: string, isPublic: boolean): Promise<void>;
    url(publicId: string, resourceType: string, isPublic: boolean): string;
    private isConfigured;
}
