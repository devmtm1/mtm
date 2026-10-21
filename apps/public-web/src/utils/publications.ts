import type { Publication, RubriquePublication } from '../types/publication';

export const RUBRIQUES: { code: RubriquePublication; label: string }[] = [
  { code: 'conseil', label: 'Conseils' },
  { code: 'actualite', label: 'Actualités' },
  { code: 'foncier', label: 'Foncier' },
  { code: 'construction', label: 'Construction' },
  { code: 'autre', label: 'Autres' },
];

/** Libellé au singulier, pour l'étiquette d'une carte : « Conseil », « Actualité »… */
const ETIQUETTES: Record<RubriquePublication, string> = {
  conseil: 'Conseil',
  actualite: 'Actualité',
  foncier: 'Foncier',
  construction: 'Construction',
  autre: 'À la une',
};

export function etiquetteRubrique(code: RubriquePublication): string {
  return ETIQUETTES[code] ?? code;
}

/** 95 → « 1:35 », 45 → « 0:45 », 3725 → « 1:02:05 » : la durée telle qu'un lecteur vidéo l'affiche. */
export function formaterDureeLecteur(secondes: number | null | undefined): string {
  if (secondes === null || secondes === undefined || secondes < 0) return '';
  const total = Math.round(secondes);
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const reste = String(total % 60).padStart(2, '0');
  return heures > 0 ? `${heures}:${String(minutes).padStart(2, '0')}:${reste}` : `${minutes}:${reste}`;
}

/** La vidéo à la une : celle que la rédaction a choisie, à défaut la plus récente (la liste arrive triée). */
export function separerALaUne(publications: Publication[]): { aLaUne: Publication | null; autres: Publication[] } {
  if (publications.length === 0) return { aLaUne: null, autres: [] };
  const choisie = publications.find((publication) => publication.misEnAvant) ?? publications[0];
  return { aLaUne: choisie, autres: publications.filter((publication) => publication.id !== choisie.id) };
}

/** Rubriques qui ont au moins une vidéo, dans l'ordre habituel : pas de filtre vide. */
export function rubriquesPresentes(publications: Publication[]): { code: RubriquePublication; label: string }[] {
  const presentes = new Set(publications.map((publication) => publication.categorie));
  return RUBRIQUES.filter((rubrique) => presentes.has(rubrique.code));
}
