"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
let CloudinaryService = class CloudinaryService {
    config;
    constructor(config) {
        this.config = config;
        cloudinary_1.v2.config({
            cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
            api_key: this.config.get('CLOUDINARY_API_KEY'),
            api_secret: this.config.get('CLOUDINARY_API_SECRET'),
            secure: true,
        });
    }
    async upload(file, folder, isPublic) {
        if (!file?.buffer) {
            throw new common_1.ServiceUnavailableException('Le fichier reçu est invalide');
        }
        if (!this.isConfigured()) {
            throw new common_1.ServiceUnavailableException('Le stockage Cloudinary n’est pas configuré');
        }
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream({
                folder,
                resource_type: 'auto',
                type: isPublic ? 'upload' : 'authenticated',
                use_filename: true,
                unique_filename: true,
                overwrite: false,
            }, (error, uploaded) => {
                if (error || !uploaded) {
                    reject(new Error(error?.message ?? 'Upload Cloudinary échoué'));
                }
                else
                    resolve(uploaded);
            });
            stream.end(file.buffer);
        });
        return {
            publicId: result.public_id,
            resourceType: result.resource_type,
            secureUrl: this.url(result.public_id, result.resource_type, isPublic),
        };
    }
    async destroy(publicId, resourceType, isPublic) {
        if (!this.isConfigured())
            return;
        await cloudinary_1.v2.uploader.destroy(publicId, {
            resource_type: resourceType,
            type: isPublic ? 'upload' : 'authenticated',
            invalidate: true,
        });
    }
    url(publicId, resourceType, isPublic) {
        return cloudinary_1.v2.url(publicId, {
            secure: true,
            resource_type: resourceType,
            type: isPublic ? 'upload' : 'authenticated',
            sign_url: !isPublic,
        });
    }
    isConfigured() {
        return Boolean(this.config.get('CLOUDINARY_CLOUD_NAME') &&
            this.config.get('CLOUDINARY_API_KEY') &&
            this.config.get('CLOUDINARY_API_SECRET'));
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map