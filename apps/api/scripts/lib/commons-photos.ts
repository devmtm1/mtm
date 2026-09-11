import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * Outils partagés par les scripts de photos de démonstration : récupération
 * d'un fichier Wikimedia Commons en taille raisonnable et envoi sur
 * Cloudinary avec les mêmes options qu'un média public du back-office.
 */

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'MTM-Immobilier-demo-seed/1.0 (https://github.com/devmtm1)';
const DOWNLOAD_WIDTH = 1600;

export interface CommonsPhoto {
  /** Nom du fichier sur Commons, sans le préfixe « File: ». */
  file: string;
  license: string;
  artist: string;
}

interface CommonsImageInfo {
  query?: {
    pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }>;
  };
}

/** Résout l'URL d'une version redimensionnée du fichier (évite les originaux de 20 Mo). */
async function resolveDownloadUrl(file: string): Promise<string> {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: 'query',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: String(DOWNLOAD_WIDTH),
    format: 'json',
  }).toString();

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Commons API ${response.status} pour ${file}`);
  const json = (await response.json()) as CommonsImageInfo;
  const page = Object.values(json.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  const downloadUrl = info?.thumburl ?? info?.url;
  if (!downloadUrl) throw new Error(`Fichier introuvable sur Commons : ${file}`);
  return downloadUrl;
}

export async function fetchCommonsPhoto(file: string): Promise<Buffer> {
  const url = await resolveDownloadUrl(file);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Téléchargement ${response.status} : ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Configure le SDK depuis l'environnement ; `false` si les identifiants manquent. */
export function configureCloudinaryFromEnv(): boolean {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return true;
}

/** Même dossier et mêmes options que CloudinaryService.upload pour un média public. */
export function uploadPublicImage(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', type: 'upload', unique_filename: true, overwrite: false },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Upload Cloudinary échoué'));
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export function attributionLabel(photo: CommonsPhoto): string {
  return `Photo : ${photo.artist} — ${photo.license}, Wikimedia Commons`;
}
