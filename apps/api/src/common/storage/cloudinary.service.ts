import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface UploadedAsset {
  publicId: string;
  resourceType: string;
  secureUrl: string;
}

/** Durée de validité d'un lien de document privé remis à l'utilisateur. */
const PRIVATE_LINK_TTL_SECONDS = 2 * 60 * 60;
/** Durée de validité du lien Cloudinary vers lequel l'API redirige. */
const DOWNLOAD_TTL_SECONDS = 10 * 60;
/** Le format d'un fichier ne change pas : une consultation par fichier suffit. */
const FORMAT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly formatCache = new Map<
    string,
    { format: string; expiresAt: number }
  >();

  /**
   * Racine des fichiers envoyés (CLOUDINARY_FOLDER) : « mtm-prod » en
   * production, « mtm-staging » en test. Elle sépare les deux
   * environnements même lorsqu'ils partagent le même compte Cloudinary —
   * sans elle, une photo d'essai peut se retrouver sur le site public.
   * Les fichiers déjà envoyés ne bougent pas : la base retient leur
   * identifiant complet, ce préfixe ne concerne que les nouveaux envois.
   */
  private readonly rootFolder: string;

  constructor(private readonly config: ConfigService) {
    this.rootFolder = (
      this.config.get<string>('CLOUDINARY_FOLDER') ?? ''
    ).replace(/^\/+|\/+$/g, '');
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
      if (this.isTestEnvironment())
        return this.storeForTests(file, folder, isPublic);
      throw new ServiceUnavailableException(
        'Le stockage Cloudinary n’est pas configuré',
      );
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: this.rootFolder ? `${this.rootFolder}/${folder}` : folder,
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

    if (result.format) {
      this.formatCache.set(
        this.cacheKey(result.public_id, result.resource_type),
        {
          format: result.format,
          expiresAt: Date.now() + FORMAT_CACHE_TTL_MS,
        },
      );
    }

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
    this.formatCache.delete(this.cacheKey(publicId, resourceType));
  }

  /**
   * Lien à remettre à l'utilisateur. Public : URL Cloudinary directe. Privé :
   * lien signé vers l'API (`/files/private`), valable deux heures, que l'API
   * échange contre un téléchargement Cloudinary authentifié. Les URL
   * « authenticated » signées ne conviennent pas : Cloudinary refuse (401)
   * la livraison des PDF et ZIP tant que l'option « PDF and ZIP files
   * delivery » n'est pas activée sur le compte, et le lien resterait valable
   * sans limite de temps.
   */
  url(publicId: string, resourceType: string, isPublic: boolean): string {
    if (isPublic) {
      return cloudinary.url(publicId, {
        secure: true,
        resource_type: resourceType,
        type: 'upload',
        // Format et compression décidés par Cloudinary selon le navigateur
        // (WebP ou AVIF quand il sait les lire) : une photo de terrain passe
        // de 600 à 500 Ko sans perte visible, et le site choisit ensuite la
        // largeur qu'il lui faut. Sans objet pour une vidéo ou un document.
        ...(resourceType === 'image'
          ? { fetch_format: 'auto', quality: 'auto' }
          : {}),
      });
    }
    const exp = Math.floor(Date.now() / 1000) + PRIVATE_LINK_TTL_SECONDS;
    const params = new URLSearchParams({
      key: publicId,
      rt: resourceType,
      exp: String(exp),
      sig: this.sign(publicId, resourceType, exp),
    });
    return `${this.apiPublicUrl()}/files/private?${params.toString()}`;
  }

  /**
   * Vérifie un lien produit par `url()` et renvoie l'URL Cloudinary de
   * téléchargement (signée par la clé API, valable dix minutes).
   */
  async resolvePrivateLink(
    publicId: string,
    resourceType: string,
    exp: number,
    signature: string,
  ): Promise<string> {
    const expected = this.sign(publicId, resourceType, exp);
    const valid =
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) throw new ForbiddenException('Lien de document invalide');
    if (exp * 1000 < Date.now()) {
      throw new ForbiddenException(
        'Ce lien a expiré : rouvrez le document depuis votre espace.',
      );
    }
    const format = await this.formatOf(publicId, resourceType);
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS,
    });
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('CLOUDINARY_CLOUD_NAME') &&
      this.config.get('CLOUDINARY_API_KEY') &&
      this.config.get('CLOUDINARY_API_SECRET'),
    );
  }

  private isTestEnvironment(): boolean {
    return (
      (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'test'
    );
  }

  /**
   * Repli des tests automatisés, sans appel réseau : l'intégration continue
   * n'a pas de compte Cloudinary, et sans ce repli tous les parcours qui
   * produisent un document — quittance de loyer, relevé de gestion, rapport de
   * vérification — échouaient en 503, ce qui masquait le reste du scénario.
   *
   * N'intervient que si le stockage n'est pas configuré **et** que
   * l'environnement est « test » : en production, Cloudinary est configuré et
   * un envoi continue de refuser plutôt que de laisser croire qu'un document
   * est archivé.
   */
  private storeForTests(
    file: Express.Multer.File,
    folder: string,
    isPublic: boolean,
  ): UploadedAsset {
    const resourceType = file.mimetype?.startsWith('image/')
      ? 'image'
      : file.mimetype?.startsWith('video/')
        ? 'video'
        : 'raw';
    const dossier = this.rootFolder ? `${this.rootFolder}/${folder}` : folder;
    const publicId = `${dossier}/test-${randomUUID()}`;
    this.logger.debug(
      `Stockage de test : ${publicId} (${file.size} octets, non envoyé)`,
    );
    return {
      publicId,
      resourceType,
      secureUrl: this.url(publicId, resourceType, isPublic),
    };
  }

  private apiPublicUrl(): string {
    const configured = this.config.get<string>('API_PUBLIC_URL');
    if (configured) return configured.replace(/\/+$/, '');
    const port =
      this.config.get<string>('API_PORT') ?? process.env.PORT ?? '3000';
    return `http://localhost:${port}/api`;
  }

  private sign(publicId: string, resourceType: string, exp: number): string {
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET') ?? '';
    return createHmac('sha256', secret)
      .update(`${publicId}|${resourceType}|${exp}`)
      .digest('base64url');
  }

  /** Format (pdf, jpg, …) d'un fichier privé ; vide pour un fichier « raw » (extension dans l'identifiant). */
  private async formatOf(
    publicId: string,
    resourceType: string,
  ): Promise<string> {
    if (resourceType === 'raw') return '';
    const key = this.cacheKey(publicId, resourceType);
    const cached = this.formatCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.format;
    try {
      const resource = (await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
      })) as { format?: string };
      const format = resource.format ?? '';
      this.formatCache.set(key, {
        format,
        expiresAt: Date.now() + FORMAT_CACHE_TTL_MS,
      });
      return format;
    } catch (error) {
      this.logger.warn(
        `Fichier introuvable sur Cloudinary : ${publicId} (${String(error)})`,
      );
      throw new NotFoundException('Document introuvable');
    }
  }

  private cacheKey(publicId: string, resourceType: string): string {
    return `${resourceType}:${publicId}`;
  }
}
