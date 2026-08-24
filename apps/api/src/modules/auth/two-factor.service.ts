import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import type { AuthConfig } from '../../config/auth.config';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

@Injectable()
export class TwoFactorService {
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
}
