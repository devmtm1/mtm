import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface UploadedAsset {
  publicId: string;
  resourceType: string;
  secureUrl: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
    isPublic: boolean,
  ): Promise<UploadedAsset> {
    if (!file?.buffer) {
      throw new ServiceUnavailableException('Le fichier reçu est invalide');
    }
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Le stockage Cloudinary n’est pas configuré',
      );
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          type: isPublic ? 'upload' : 'authenticated',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(new Error(error?.message ?? 'Upload Cloudinary échoué'));
          } else resolve(uploaded);
        },
      );
      stream.end(file.buffer);
    });

    return {
      publicId: result.public_id,
      resourceType: result.resource_type,
      secureUrl: this.url(result.public_id, result.resource_type, isPublic),
    };
  }

  async destroy(
    publicId: string,
    resourceType: string,
    isPublic: boolean,
  ): Promise<void> {
    if (!this.isConfigured()) return;
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: isPublic ? 'upload' : 'authenticated',
      invalidate: true,
    });
  }

  url(publicId: string, resourceType: string, isPublic: boolean): string {
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: resourceType,
      type: isPublic ? 'upload' : 'authenticated',
      sign_url: !isPublic,
    });
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get('CLOUDINARY_CLOUD_NAME') &&
      this.config.get('CLOUDINARY_API_KEY') &&
      this.config.get('CLOUDINARY_API_SECRET'),
    );
  }
}
