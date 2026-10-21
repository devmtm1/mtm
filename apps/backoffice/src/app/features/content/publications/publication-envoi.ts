import type { AutorisationEnvoi } from '../../../core/services/api/publications-api.service';

/**
 * Une vidéo de bonne qualité pèse vite plus de 10 Mo : elle ne passe pas par l'API. Le navigateur
 * l'envoie directement à Cloudinary, par morceaux (reprise sur coupure, barre de progression),
 * avec une autorisation signée par l'API.
 */

/** Taille d'un morceau : Cloudinary en exige au moins 5 Mo, sauf pour le dernier. */
export const TAILLE_MORCEAU = 6 * 1024 * 1024;

/** Limite du formulaire : le plan gratuit de Cloudinary refuse les vidéos de plus de 100 Mo. */
export const TAILLE_MAX_VIDEO = 100 * 1024 * 1024;

export const TYPES_VIDEO_ACCEPTES = 'video/mp4,video/quicktime,video/webm';

/** `null` si le fichier convient, sinon la raison du refus, en clair. */
export function problemeVideo(fichier: Pick<File, 'type' | 'size' | 'name'>): string | null {
  const type = fichier.type || typeDepuisNom(fichier.name);
  if (!TYPES_VIDEO_ACCEPTES.split(',').includes(type)) {
    return 'Format non pris en charge : utilisez une vidéo MP4 (H.264), MOV ou WebM.';
  }
  if (fichier.size > TAILLE_MAX_VIDEO) {
    const mo = (fichier.size / (1024 * 1024)).toFixed(0);
    return `Vidéo trop lourde (${mo} Mo) : 100 Mo au maximum. Exportez-la en 1080p (MP4, H.264) ou découpez-la en plusieurs conseils.`;
  }
  if (fichier.size === 0) return 'Le fichier est vide.';
  return null;
}

function typeDepuisNom(nom: string): string {
  const extension = nom.split('.').pop()?.toLowerCase();
  return extension === 'mp4' ? 'video/mp4' : extension === 'mov' ? 'video/quicktime' : extension === 'webm' ? 'video/webm' : '';
}

export interface Morceau {
  debut: number;
  /** Dernier octet inclus, comme dans l'en-tête Content-Range. */
  fin: number;
}

/** Découpe `taille` octets en morceaux consécutifs de `tailleMorceau` octets (le dernier peut être plus court). */
export function decouper(taille: number, tailleMorceau = TAILLE_MORCEAU): Morceau[] {
  if (taille <= 0) return [];
  const morceaux: Morceau[] = [];
  for (let debut = 0; debut < taille; debut += tailleMorceau) {
    morceaux.push({ debut, fin: Math.min(debut + tailleMorceau, taille) - 1 });
  }
  return morceaux;
}

export function enteteContentRange(morceau: Morceau, taille: number): string {
  return `bytes ${morceau.debut}-${morceau.fin}/${taille}`;
}

export interface ResultatEnvoi {
  publicId: string;
  bytes: number;
}

export interface OptionsEnvoi {
  /** 0 à 100. */
  progression?: (pourcentage: number) => void;
  /** Nombre de reprises d'un morceau après une coupure réseau. */
  reprises?: number;
}

/** Message de Cloudinary, en clair (« File size too large… » → texte compris par l'équipe). */
export function messageErreurEnvoi(statut: number, corps: unknown): string {
  const brut = typeof corps === 'object' && corps !== null ? ((corps as { error?: { message?: string } }).error?.message ?? '') : '';
  if (/too large|file size/i.test(brut)) return 'Cloudinary refuse cette vidéo : elle dépasse la taille permise par le compte. Réduisez-la (1080p, MP4).';
  if (statut === 401 || statut === 403 || /signature|timestamp/i.test(brut)) return 'L’autorisation d’envoi a expiré : recommencez.';
  if (statut === 0) return 'Connexion interrompue pendant l’envoi : vérifiez votre réseau et recommencez.';
  return brut || `Envoi refusé par Cloudinary (code ${statut}).`;
}

function envoyerMorceau(
  autorisation: AutorisationEnvoi,
  fichier: File,
  morceau: Morceau,
  identifiantEnvoi: string,
  unSeulMorceau: boolean,
  surProgression: (octetsEnvoyes: number) => void,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const donnees = new FormData();
    donnees.append('file', fichier.slice(morceau.debut, morceau.fin + 1), fichier.name);
    donnees.append('api_key', autorisation.apiKey);
    donnees.append('timestamp', String(autorisation.timestamp));
    donnees.append('signature', autorisation.signature);
    donnees.append('folder', autorisation.folder);

    const requete = new XMLHttpRequest();
    requete.open('POST', autorisation.uploadUrl);
    if (!unSeulMorceau) {
      requete.setRequestHeader('X-Unique-Upload-Id', identifiantEnvoi);
      requete.setRequestHeader('Content-Range', enteteContentRange(morceau, fichier.size));
    }
    requete.upload.onprogress = (evenement) => {
      if (evenement.lengthComputable) surProgression(evenement.loaded);
    };
    requete.onload = () => {
      let corps: unknown = null;
      try {
        corps = JSON.parse(requete.responseText);
      } catch {
        /* réponse vide ou illisible */
      }
      if (requete.status >= 200 && requete.status < 300) resolve((corps ?? {}) as Record<string, unknown>);
      else reject(new ErreurEnvoi(messageErreurEnvoi(requete.status, corps), requete.status < 500 && requete.status !== 0));
    };
    requete.onerror = () => reject(new ErreurEnvoi(messageErreurEnvoi(0, null), false));
    requete.send(donnees);
  });
}

/** Une erreur d'envoi ; `definitive` = inutile de réessayer (refus de Cloudinary, pas une coupure). */
export class ErreurEnvoi extends Error {
  constructor(
    message: string,
    readonly definitive: boolean,
  ) {
    super(message);
  }
}

export async function envoyerVideo(fichier: File, autorisation: AutorisationEnvoi, options: OptionsEnvoi = {}): Promise<ResultatEnvoi> {
  const morceaux = decouper(fichier.size);
  const identifiant = `mtm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const reprises = options.reprises ?? 2;
  let dernier: Record<string, unknown> = {};
  let envoyesAvant = 0;

  for (const morceau of morceaux) {
    const taille = morceau.fin - morceau.debut + 1;
    for (let essai = 0; ; essai++) {
      try {
        dernier = await envoyerMorceau(autorisation, fichier, morceau, identifiant, morceaux.length === 1, (octets) =>
          options.progression?.(Math.min(99, Math.round(((envoyesAvant + octets) / fichier.size) * 100))),
        );
        break;
      } catch (erreur) {
        const definitive = erreur instanceof ErreurEnvoi && erreur.definitive;
        if (definitive || essai >= reprises) throw erreur;
      }
    }
    envoyesAvant += taille;
  }

  const publicId = dernier['public_id'];
  if (typeof publicId !== 'string') throw new ErreurEnvoi('Cloudinary n’a pas confirmé la réception de la vidéo. Recommencez.', false);
  options.progression?.(100);
  return { publicId, bytes: typeof dernier['bytes'] === 'number' ? dernier['bytes'] : fichier.size };
}
