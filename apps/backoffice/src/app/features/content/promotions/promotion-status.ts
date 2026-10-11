import type { Promotion, StatutDiffusion } from '../../../core/services/api/promotions-api.service';

/** Libellé et teinte de chaque état de diffusion, tels que l'équipe les lit. */
export const STATUTS_DIFFUSION: Record<StatutDiffusion, { label: string; pill: string; help: string }> = {
  en_ligne: {
    label: 'En ligne',
    pill: 'status-pill status-pill--success',
    help: 'Visible par les visiteurs, dans le bandeau d’accueil.',
  },
  programmee: {
    label: 'Programmée',
    pill: 'status-pill status-pill--info',
    help: 'Publiée, mais sa date de début n’est pas encore arrivée.',
  },
  expiree: {
    label: 'Terminée',
    pill: 'status-pill',
    help: 'Sa date de fin est passée : elle n’apparaît plus sur le site.',
  },
  brouillon: {
    label: 'Non publiée',
    pill: 'status-pill status-pill--warning',
    help: 'Prête, mais pas encore publiée : invisible pour les visiteurs.',
  },
  sans_media: {
    label: 'Sans image ni vidéo',
    pill: 'status-pill status-pill--warning',
    help: 'Ajoutez l’affiche ou la vidéo pour pouvoir la publier.',
  },
};

/** « du 15/10/2026 au 31/10/2026 », « à partir du … », « jusqu’au … » ou « sans limite de date ». */
export function periodeDiffusion(promotion: Pick<Promotion, 'dateDebut' | 'dateFin'>): string {
  const jour = (iso: string) => {
    const [annee, mois, j] = iso.slice(0, 10).split('-');
    return `${j}/${mois}/${annee}`;
  };
  const { dateDebut, dateFin } = promotion;
  if (dateDebut && dateFin) return `Du ${jour(dateDebut)} au ${jour(dateFin)}`;
  if (dateDebut) return `À partir du ${jour(dateDebut)}`;
  if (dateFin) return `Jusqu’au ${jour(dateFin)}`;
  return 'Sans limite de date';
}

/** Poids maximal d'un fichier, aligné sur l'API (10 Mo). */
export const TAILLE_MAX_MEDIA = 10 * 1024 * 1024;

export const TYPES_MEDIA_ACCEPTES = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

/** `null` si le fichier convient, sinon la raison du refus, en clair. */
export function problemeMedia(fichier: Pick<File, 'type' | 'size'>): string | null {
  if (!TYPES_MEDIA_ACCEPTES.split(',').includes(fichier.type)) {
    return 'Format non pris en charge : image JPG, PNG ou WebP, ou vidéo MP4.';
  }
  if (fichier.size > TAILLE_MAX_MEDIA) {
    const mo = (fichier.size / (1024 * 1024)).toFixed(1).replace('.', ',');
    return `Fichier trop lourd (${mo} Mo) : 10 Mo au maximum. Compressez la vidéo avant de l’envoyer.`;
  }
  return null;
}
