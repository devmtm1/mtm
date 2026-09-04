import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import type { AuthConfig } from '../../config/auth.config';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

@Injectable()
export class TwoFactorService {
  private static readonly ENCRYPTION_PREFIX = 'enc:v1';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Génère un nouveau secret TOTP et le QR code correspondant, à afficher
   * à l'utilisateur pour qu'il l'ajoute dans son application
   * d'authentification (Google Authenticator, Authy, etc.).
   * Le secret n'est PAS encore persisté ni activé à ce stade.
   */
  async generateSetup(email: string): Promise<TwoFactorSetup> {
    const authConfig = this.configService.get<AuthConfig>('auth')!;
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      email,
      authConfig.twoFactorAppName,
      secret,
    );
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  /**
   * Vérifie un code TOTP à 6 chiffres saisi par l'utilisateur contre son
   * secret. Utilisé à la fois pour l'activation du 2FA et à chaque login
   * une fois le 2FA activé.
   */
  verifyCode(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      TwoFactorService.ENCRYPTION_PREFIX,
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decryptSecret(storedSecret: string): string {
    if (!storedSecret.startsWith(`${TwoFactorService.ENCRYPTION_PREFIX}:`)) {
      // Compatibilité avec les secrets Phase 0 existants stockés en clair.
      return storedSecret;
    }

    const [, , ivRaw, tagRaw, encryptedRaw] = storedSecret.split(':');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      return '';
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(ivRaw, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return '';
    }
  }

  /**
   * Génère 8 codes de secours aléatoires à 10 caractères alphanumériques.
   */
  generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = randomBytes(5).toString('hex').toUpperCase(); // Ex: 4F2A8B9C1E
      codes.push(code);
    }
    return codes;
  }

  encryptRecoveryCodes(codes: string[]): string {
    return this.encryptSecret(JSON.stringify(codes));
  }

  decryptRecoveryCodes(stored: string | null): string[] {
    if (!stored) return [];
    try {
      const raw = this.decryptSecret(stored);
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  verifyRecoveryCode(
    code: string,
    storedRecoveryCodes: string | null,
  ): { valid: boolean; remainingCodes: string[] } {
    const codes = this.decryptRecoveryCodes(storedRecoveryCodes);
    const normalizedInput = code.trim().toUpperCase();
    const index = codes.indexOf(normalizedInput);
    if (index === -1) {
      return { valid: false, remainingCodes: codes };
    }
    const remainingCodes = codes.filter((_, i) => i !== index);
    return { valid: true, remainingCodes };
  }

  private encryptionKey(): Buffer {
    const authConfig = this.configService.get<AuthConfig>('auth')!;
    return createHash('sha256').update(authConfig.jwtRefreshSecret).digest();
  }
}
