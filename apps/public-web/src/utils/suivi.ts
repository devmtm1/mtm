import { apiClient } from '../api/client';

/**
 * Mesure de fréquentation du site, anonyme : aucun cookie, aucun identifiant, aucune adresse
 * conservée. Le site signale seulement « une page a été vue » ; l'API tient des compteurs par jour.
 */

export type TypeVisite = 'site' | 'terrain' | 'location' | 'realisation' | 'projet';
export type SourceVisite = 'direct' | 'google' | 'facebook' | 'instagram' | 'whatsapp' | 'tiktok' | 'youtube' | 'autre';

const CLE_SOURCE = 'mtm:source';
/** Posée par l'équipe sur son propre navigateur pour ne pas fausser les chiffres (voir `appliquerExclusion`). */
const CLE_EXCLUSION = 'mtm:pas-de-suivi';

function lire(stockage: 'sessionStorage' | 'localStorage', cle: string): string | null {
  try {
    return window[stockage].getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(stockage: 'sessionStorage' | 'localStorage', cle: string, valeur: string | null): void {
  try {
    if (valeur === null) window[stockage].removeItem(cle);
    else window[stockage].setItem(cle, valeur);
  } catch {
    // Stockage indisponible (navigation privée…) : on continue sans.
  }
}

/** D'où vient le visiteur : le paramètre `utm_source` d'un lien partagé l'emporte sur l'en-tête de provenance. */
export function classerSource(referrer: string, utmSource: string | null, hoteSite: string): SourceVisite {
  const nom = (utmSource ?? '').toLowerCase();
  if (nom) {
    if (/google/.test(nom)) return 'google';
    if (/^(facebook|fb|meta)/.test(nom)) return 'facebook';
    if (/^(instagram|ig)/.test(nom)) return 'instagram';
    if (/^(whatsapp|wa)/.test(nom)) return 'whatsapp';
    if (/tiktok/.test(nom)) return 'tiktok';
    if (/youtube/.test(nom)) return 'youtube';
    return 'autre';
  }
  if (!referrer) return 'direct';
  let hote: string;
  try {
    hote = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  if (hote === hoteSite) return 'direct';
  if (/(^|\.)google\./.test(hote)) return 'google';
  if (/(^|\.)(facebook|fb)\.(com|me)$/.test(hote) || hote === 'fb.com') return 'facebook';
  if (/(^|\.)instagram\.com$/.test(hote)) return 'instagram';
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(hote)) return 'whatsapp';
  if (/(^|\.)tiktok\.com$/.test(hote)) return 'tiktok';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(hote)) return 'youtube';
  return 'autre';
}

/** Provenance de la session : fixée à la première page, puis conservée pendant toute la visite. */
export function sourceDeLaSession(): SourceVisite {
  const connue = lire('sessionStorage', CLE_SOURCE) as SourceVisite | null;
  if (connue) return connue;
  const source = classerSource(
    document.referrer,
    new URLSearchParams(window.location.search).get('utm_source'),
    window.location.hostname.toLowerCase(),
  );
  ecrire('sessionStorage', CLE_SOURCE, source);
  return source;
}

/**
 * `?pas-de-suivi=1` dans l'adresse d'une page exclut ce navigateur des chiffres (équipe, tests) ;
 * `?pas-de-suivi=0` le remet dans le décompte.
 */
export function appliquerExclusion(): void {
  const demande = new URLSearchParams(window.location.search).get('pas-de-suivi');
  if (demande === '1') ecrire('localStorage', CLE_EXCLUSION, '1');
  if (demande === '0') ecrire('localStorage', CLE_EXCLUSION, null);
}

/** Vrai quand la visite ne doit pas être comptée : développement, « Ne pas me suivre », navigateur automatisé, exclusion. */
export function suiviDesactive(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || navigator.webdriver)) return true;
  return lire('localStorage', CLE_EXCLUSION) === '1';
}

/** Signale une page vue. Ne bloque rien et ne remonte jamais d'erreur au visiteur. */
export function signalerVisite(type: TypeVisite, id?: string): void {
  appliquerExclusion();
  if (suiviDesactive()) return;
  apiClient.post('/visites', { type, ...(id ? { id } : {}), source: sourceDeLaSession() }).catch(() => undefined);
}
