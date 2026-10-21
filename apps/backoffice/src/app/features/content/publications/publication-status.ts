import type { CategoriePublication, Publication, StatutPublication } from '../../../core/services/api/publications-api.service';

/** Libellé et teinte de chaque état de diffusion, tels que l'équipe les lit. */
export const STATUTS_PUBLICATION: Record<StatutPublication, { label: string; pill: string; help: string }> = {
  en_ligne: {
    label: 'En ligne',
    pill: 'status-pill status-pill--success',
    help: 'Visible par les visiteurs, sur la page Actualités et conseils.',
  },
  programmee: {
    label: 'Programmée',
    pill: 'status-pill status-pill--info',
    help: 'Publiée, mais sa date de publication n’est pas encore arrivée.',
  },
  brouillon: {
    label: 'Non publiée',
    pill: 'status-pill status-pill--warning',
    help: 'Prête, mais pas encore publiée : invisible pour les visiteurs.',
  },
  sans_video: {
    label: 'Sans vidéo',
    pill: 'status-pill status-pill--warning',
    help: 'Ajoutez la vidéo pour pouvoir la publier.',
  },
};

export const CATEGORIES_PUBLICATION: { code: CategoriePublication; label: string }[] = [
  { code: 'conseil', label: 'Conseil' },
  { code: 'actualite', label: 'Actualité' },
  { code: 'foncier', label: 'Foncier' },
  { code: 'construction', label: 'Construction' },
  { code: 'autre', label: 'Autre' },
];

export function libelleCategorie(code: CategoriePublication): string {
  return CATEGORIES_PUBLICATION.find((categorie) => categorie.code === code)?.label ?? code;
}

/** 95 → « 1 min 35 s », 45 → « 45 s », 3600 → « 1 h 00 min ». */
export function formaterDuree(secondes: number | null | undefined): string {
  if (secondes === null || secondes === undefined || secondes < 0) return '';
  const total = Math.round(secondes);
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const reste = total % 60;
  if (heures > 0) return `${heures} h ${String(minutes).padStart(2, '0')} min`;
  if (minutes > 0) return `${minutes} min ${String(reste).padStart(2, '0')} s`;
  return `${reste} s`;
}

/** « 25,3 Mo ». */
export function formaterTaille(octets: number | null | undefined): string {
  if (!octets) return '';
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** « Publiée le 21/10/2026 », « Sera publiée le … » ou « Sans date ». */
export function datePublicationDite(publication: Pick<Publication, 'datePublication' | 'statut'>): string {
  if (!publication.datePublication) return 'Sans date de publication';
  const [annee, mois, jour] = publication.datePublication.slice(0, 10).split('-');
  const date = `${jour}/${mois}/${annee}`;
  return publication.statut === 'programmee' ? `Sera publiée le ${date}` : `Publication du ${date}`;
}
