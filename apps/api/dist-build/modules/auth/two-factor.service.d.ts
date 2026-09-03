import { ConfigService } from '@nestjs/config';
export interface TwoFactorSetup {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
}
export declare class TwoFactorService {
    private readonly configService;
    private static readonly ENCRYPTION_PREFIX;
    constructor(configService: ConfigService);
    generateSetup(email: string): Promise<TwoFactorSetup>;
    verifyCode(code: string, secret: string): boolean;
    encryptSecret(secret: string): string;
    decryptSecret(storedSecret: string): string;
    private encryptionKey;
}
