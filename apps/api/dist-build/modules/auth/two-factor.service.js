"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TwoFactorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const otplib_1 = require("otplib");
const QRCode = __importStar(require("qrcode"));
const node_crypto_1 = require("node:crypto");
let TwoFactorService = class TwoFactorService {
    static { TwoFactorService_1 = this; }
    configService;
    static ENCRYPTION_PREFIX = 'enc:v1';
    constructor(configService) {
        this.configService = configService;
    }
    async generateSetup(email) {
        const authConfig = this.configService.get('auth');
        const secret = otplib_1.authenticator.generateSecret();
        const otpauthUrl = otplib_1.authenticator.keyuri(email, authConfig.twoFactorAppName, secret);
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return { secret, otpauthUrl, qrCodeDataUrl };
    }
    verifyCode(code, secret) {
        try {
            return otplib_1.authenticator.verify({ token: code, secret });
        }
        catch {
            return false;
        }
    }
    encryptSecret(secret) {
        const iv = (0, node_crypto_1.randomBytes)(12);
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.encryptionKey(), iv);
        const encrypted = Buffer.concat([
            cipher.update(secret, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return [
            TwoFactorService_1.ENCRYPTION_PREFIX,
            iv.toString('base64url'),
            tag.toString('base64url'),
            encrypted.toString('base64url'),
        ].join(':');
    }
    decryptSecret(storedSecret) {
        if (!storedSecret.startsWith(`${TwoFactorService_1.ENCRYPTION_PREFIX}:`)) {
            return storedSecret;
        }
        const [, , ivRaw, tagRaw, encryptedRaw] = storedSecret.split(':');
        if (!ivRaw || !tagRaw || !encryptedRaw) {
            return '';
        }
        try {
            const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.encryptionKey(), Buffer.from(ivRaw, 'base64url'));
            decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
            return Buffer.concat([
                decipher.update(Buffer.from(encryptedRaw, 'base64url')),
                decipher.final(),
            ]).toString('utf8');
        }
        catch {
            return '';
        }
    }
    encryptionKey() {
        const authConfig = this.configService.get('auth');
        return (0, node_crypto_1.createHash)('sha256').update(authConfig.jwtRefreshSecret).digest();
    }
};
exports.TwoFactorService = TwoFactorService;
exports.TwoFactorService = TwoFactorService = TwoFactorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TwoFactorService);
//# sourceMappingURL=two-factor.service.js.map