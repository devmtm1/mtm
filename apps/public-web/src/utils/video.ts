import { extraireIdYoutube } from './youtube';

/** Une vidéo que le site sait lire : YouTube, Vimeo, ou un fichier vidéo à une adresse directe. */
export type SourceVideo =
  | { type: 'youtube'; id: string }
  | { type: 'vimeo'; id: string }
  | { type: 'fichier'; url: string };

const EXTENSION_VIDEO = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i;

/**
 * Reconnaît la vidéo collée dans le back-office. Les vidéos ne sont pas toutes sur YouTube : on accepte aussi Vimeo
 * (vimeo.com/123456789) et tout fichier vidéo (.mp4, .webm…) à une adresse https, y compris une vidéo hébergée sur Cloudinary.
 * Renvoie `null` pour le reste : rien ne s'affiche plutôt qu'un lecteur cassé.
 */
export function analyserVideo(valeur: string | null | undefined): SourceVideo | null {
  const texte = (valeur ?? '').trim();
  if (!texte) return null;

  const idYoutube = extraireIdYoutube(texte);
  if (idYoutube) return { type: 'youtube', id: idYoutube };

  let adresse: URL;
  try {
    adresse = new URL(/^https?:\/\//i.test(texte) ? texte : `https://${texte}`);
  } catch {
    return null;
  }
  const hote = adresse.hostname.replace(/^(www|m)\./, '');

  if (hote === 'vimeo.com' || hote === 'player.vimeo.com') {
    // vimeo.com/123456789, vimeo.com/channels/x/123456789, player.vimeo.com/video/123456789
    const id = adresse.pathname.split('/').reverse().find((morceau) => /^\d{6,}$/.test(morceau));
    return id ? { type: 'vimeo', id } : null;
  }

  if (adresse.protocol === 'https:' && (EXTENSION_VIDEO.test(adresse.pathname) || (hote === 'res.cloudinary.com' && adresse.pathname.includes('/video/')))) {
    return { type: 'fichier', url: adresse.toString() };
  }
  return null;
}
