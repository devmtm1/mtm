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
    // Environnement local jetable (`npm run dev:local`) : les envois sont acceptés sans quitter le poste, pour pouvoir
    // essayer les parcours qui déposent un fichier. Jamais activé en production : la variable n'y existe pas.
    if (this.config.get<string>('STOCKAGE_FICTIF') === 'true') {
      return this.storeForTests(file, folder, isPublic);
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
      // Sans compte Cloudinary (poste local sans .env complet), le SDK lève
      // une exception qui faisait échouer toute liste portant une photo :
      // mieux vaut un lien vide, l'interface affiche alors son visuel de repli.
      if (!this.config.get('CLOUDINARY_CLOUD_NAME')) {
        this.warnNotConfigured();
        return '';
      }
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

  /**
   * Image fixe tirée de la première seconde d'une vidéo publique : affichée
   * avant la lecture et quand la vidéo est écartée (économie de données).
   * Vide si Cloudinary n'est pas configuré.
   */
  videoPosterUrl(publicId: string, decalageSecondes = 0): string {
    if (!this.config.get('CLOUDINARY_CLOUD_NAME')) return '';
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'video',
      type: 'upload',
      format: 'jpg',
      transformation: [
        { start_offset: decalageSecondes, width: 1280, crop: 'limit' },
      ],
    });
  }

  /**
   * Octets d'une photo en JPEG réduit (1 200 px, qualité 80), pour l'embarquer
   * dans un PDF. Cloudinary fait la conversion : une photo WebP, PNG ou HEIC
   * arrive en JPEG, seul format que le générateur PDF sait insérer. Renvoie
   * `null` — jamais d'erreur — quand le stockage n'est pas configuré ou que la
   * photo est introuvable : un rapport vaut mieux sans une photo que pas de rapport.
   */
  async downloadJpeg(
    publicId: string,
    isPublic: boolean,
  ): Promise<Buffer | null> {
    if (!this.isConfigured()) return null;
    try {
      const lien = cloudinary.url(publicId, {
        secure: true,
        resource_type: 'image',
        type: isPublic ? 'upload' : 'authenticated',
        sign_url: !isPublic,
        format: 'jpg',
        transformation: [{ width: 1200, crop: 'limit', quality: 80 }],
      });
      const reponse = await fetch(lien, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!reponse.ok) {
        this.logger.warn(
          `Photo non récupérée pour le PDF : ${publicId} (HTTP ${reponse.status})`,
        );
        return null;
      }
      return Buffer.from(await reponse.arrayBuffer());
    } catch (error) {
      this.logger.warn(
        `Photo non récupérée pour le PDF : ${publicId} (${String(error)})`,
      );
      return null;
    }
  }

  /** Dossier Cloudinary complet (racine de l'environnement comprise) d'un sous-dossier métier. */
  dossier(folder: string): string {
    return this.rootFolder ? `${this.rootFolder}/${folder}` : folder;
  }

  /**
   * Autorisation d'envoi direct : le navigateur envoie la vidéo à Cloudinary sans passer par l'API
   * (qui limite les fichiers à 10 Mo et les tient en mémoire). La signature fixe le dossier et
   * l'heure ; le secret de l'API ne quitte jamais le serveur.
   */
  signedUploadParams(folder: string): {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    signature: string;
    uploadUrl: string;
  } {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Le stockage Cloudinary n’est pas configuré : l’envoi de vidéos est indisponible',
      );
    }
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY') ?? '';
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET') ?? '';
    const timestamp = Math.floor(Date.now() / 1000);
    const dossier = this.dossier(folder);
    const signature = cloudinary.utils.api_sign_request(
      { folder: dossier, timestamp },
      apiSecret,
    );
    return {
      cloudName,
      apiKey,
      timestamp,
      folder: dossier,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    };
  }

  /**
   * Caractéristiques d'une vidéo réellement présente sur Cloudinary (durée, taille, format…).
   * Sert à vérifier ce que le navigateur annonce avoir envoyé : on ne croit pas le client.
   */
  async videoInfo(publicId: string): Promise<{
    bytes: number;
    duration: number | null;
    width: number | null;
    height: number | null;
    format: string | null;
  }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Le stockage Cloudinary n’est pas configuré',
      );
    }
    try {
      const ressource = (await cloudinary.api.resource(publicId, {
        resource_type: 'video',
        type: 'upload',
      })) as {
        bytes?: number;
        duration?: number;
        width?: number;
        height?: number;
        format?: string;
      };
      return {
        bytes: ressource.bytes ?? 0,
        duration:
          typeof ressource.duration === 'number' ? ressource.duration : null,
        width: ressource.width ?? null,
        height: ressource.height ?? null,
        format: ressource.format ?? null,
      };
    } catch {
      throw new NotFoundException(
        'Vidéo introuvable sur Cloudinary : l’envoi n’a pas abouti',
      );
    }
  }

  /**
   * Lien de lecture d'une vidéo publique. Jusqu'à 40 Mo, Cloudinary adapte codec et débit au
   * navigateur (lecture fluide, qualité conservée) ; au-delà il ne sait pas transformer à la
   * volée, on sert alors le fichier envoyé tel quel (MP4 H.264 recommandé).
   */
  videoUrl(publicId: string, tailleOctets?: number | null): string {
    if (!this.config.get('CLOUDINARY_CLOUD_NAME')) return '';
    const TRANSFORMABLE = 40 * 1024 * 1024;
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'video',
      type: 'upload',
      format: 'mp4',
      ...(tailleOctets && tailleOctets <= TRANSFORMABLE
        ? { transformation: [{ quality: 'auto:good', video_codec: 'auto' }] }
        : {}),
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

  private warnedNotConfigured = false;

  private warnNotConfigured(): void {
    if (this.warnedNotConfigured) return;
    this.warnedNotConfigured = true;
    this.logger.warn(
      'CLOUDINARY_CLOUD_NAME absent : les liens de photos sont vides. Renseignez CLOUDINARY_* dans .env.',
    );
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
