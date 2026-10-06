import type { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { TwoFactorService } from './two-factor.service';

function creerService(
  refreshSecret = 'secret-de-test-au-moins-32-caracteres!!',
) {
  const config = {
    get: jest.fn().mockReturnValue({
      twoFactorAppName: 'MTM Immobilier',
      jwtRefreshSecret: refreshSecret,
    }),
  };
  return new TwoFactorService(config as unknown as ConfigService);
}

describe('TwoFactorService', () => {
  const service = creerService();

  describe('code TOTP', () => {
    it('accepte le code courant et refuse un code faux ou mal formé', () => {
      const secret = authenticator.generateSecret();
      expect(service.verifyCode(authenticator.generate(secret), secret)).toBe(
        true,
      );
      expect(service.verifyCode('000000', secret)).toBe(
        authenticator.generate(secret) === '000000',
      );
      expect(service.verifyCode('abc', secret)).toBe(false);
      expect(service.verifyCode('', secret)).toBe(false);
    });

    it('refuse un code valide pour un autre secret', () => {
      const secretA = authenticator.generateSecret();
      const secretB = authenticator.generateSecret();
      expect(service.verifyCode(authenticator.generate(secretA), secretB)).toBe(
        false,
      );
    });

    it('prépare l’activation : secret, URL otpauth au nom de l’application et QR code', async () => {
      const setup = await service.generateSetup('admin@mtm.sn');
      expect(setup.otpauthUrl).toContain('otpauth://totp/');
      expect(decodeURIComponent(setup.otpauthUrl)).toContain('MTM Immobilier');
      expect(setup.otpauthUrl).toContain(setup.secret);
      expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('chiffrement du secret au repos', () => {
    it('chiffre puis déchiffre sans perte, et ne stocke jamais le secret en clair', () => {
      const secret = authenticator.generateSecret();
      const stocke = service.encryptSecret(secret);
      expect(stocke.startsWith('enc:v1:')).toBe(true);
      expect(stocke).not.toContain(secret);
      expect(service.decryptSecret(stocke)).toBe(secret);
    });

    it('produit un chiffré différent à chaque appel (IV aléatoire)', () => {
      expect(service.encryptSecret('JBSWY3DPEHPK3PXP')).not.toBe(
        service.encryptSecret('JBSWY3DPEHPK3PXP'),
      );
    });

    it('renvoie vide quand la clé change : un secret volé en base est inutilisable', () => {
      const stocke = service.encryptSecret('JBSWY3DPEHPK3PXP');
      const autre = creerService('une-autre-cle-secrete-de-32-caracteres!!');
      expect(autre.decryptSecret(stocke)).toBe('');
    });

    it('détecte une altération du chiffré (authentification GCM)', () => {
      const stocke = service.encryptSecret('JBSWY3DPEHPK3PXP');
      const morceaux = stocke.split(':');
      morceaux[4] = Buffer.from('falsifie').toString('base64url');
      expect(service.decryptSecret(morceaux.join(':'))).toBe('');
    });

    it('renvoie vide pour un chiffré tronqué', () => {
      expect(service.decryptSecret('enc:v1:abc')).toBe('');
    });

    it('relit tel quel un ancien secret stocké en clair (compatibilité Phase 0)', () => {
      expect(service.decryptSecret('JBSWY3DPEHPK3PXP')).toBe(
        'JBSWY3DPEHPK3PXP',
      );
    });
  });

  describe('codes de secours', () => {
    it('en génère huit, distincts, de dix caractères hexadécimaux', () => {
      const codes = service.generateRecoveryCodes();
      expect(codes).toHaveLength(8);
      expect(new Set(codes).size).toBe(8);
      for (const code of codes) expect(code).toMatch(/^[0-9A-F]{10}$/);
    });

    it('un code de secours est à usage unique', () => {
      const codes = service.generateRecoveryCodes();
      const stockes = service.encryptRecoveryCodes(codes);

      const premier = service.verifyRecoveryCode(codes[0], stockes);
      expect(premier.valid).toBe(true);
      expect(premier.remainingCodes).toHaveLength(7);
      expect(premier.remainingCodes).not.toContain(codes[0]);

      // Une fois retiré de la liste restante, le même code est refusé.
      const restants = service.encryptRecoveryCodes(premier.remainingCodes);
      expect(service.verifyRecoveryCode(codes[0], restants).valid).toBe(false);
    });

    it('accepte la saisie en minuscules avec espaces, refuse un code inconnu', () => {
      const codes = service.generateRecoveryCodes();
      const stockes = service.encryptRecoveryCodes(codes);
      expect(
        service.verifyRecoveryCode(` ${codes[3].toLowerCase()} `, stockes)
          .valid,
      ).toBe(true);
      expect(service.verifyRecoveryCode('ZZZZZZZZZZ', stockes).valid).toBe(
        false,
      );
    });

    it('sans codes enregistrés, rien n’est valide', () => {
      expect(service.verifyRecoveryCode('ABCDEF0123', null)).toEqual({
        valid: false,
        remainingCodes: [],
      });
    });
  });
});
