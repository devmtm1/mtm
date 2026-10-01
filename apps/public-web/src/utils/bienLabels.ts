import type { Terrain } from '../types/terrain';

/**
 * Nature des biens vendus par MTM. Le catalogue mêle parcelles nues et biens
 * bâtis : un visiteur doit lire « Villa » ou « Terrain », pas le code brut.
 */
const TYPE_BIEN_LABELS: Record<string, string> = {
  terrain: 'Terrain',
  villa: 'Villa',
  appartement: 'Appartement',
  studio: 'Studio',
  commerce: 'Local commercial',
  bureau: 'Bureau',
  autre: 'Autre bien',
};

export function typeBienLabel(value: string | null | undefined): string {
  if (!value) return 'Bien';
  return TYPE_BIEN_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

/** État d'un bien bâti, tel qu'annoncé à l'acheteur. */
const ETAT_BIEN_LABELS: Record<string, string> = {
  neuf: 'Neuf',
  bon_etat: 'Bon état',
  a_rafraichir: 'À rafraîchir',
  a_renover: 'À rénover',
};

export function etatBienLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return ETAT_BIEN_LABELS[value] ?? value;
}

/**
 * Usage prévu du sol. Le visiteur lit « Résidentiel », pas « residentiel ».
 */
const VOCATION_LABELS: Record<string, string> = {
  habitation: 'Habitation',
  residentiel: 'Résidentiel',
  commercial: 'Commercial',
  agricole: 'Agricole',
  touristique: 'Touristique',
  industriel: 'Industriel',
  mixte: 'Mixte',
  autre: 'Autre',
};

export function vocationLabel(value: string | null | undefined): string {
  if (!value) return '';
  return VOCATION_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Le bien est-il construit ? On le déduit de la présence de caractéristiques
 * du bâti plutôt que d'une liste de types tenue en double ici : l'API refuse
 * déjà ces champs sur une parcelle nue, et un type ajouté en Paramètres
 * s'affichera correctement sans toucher au site.
 */
export function estBienBati(
  bien: Pick<
    Terrain,
    'typeBien' | 'surfaceHabitable' | 'nombrePieces' | 'nombreChambres'
  >,
): boolean {
  if (bien.typeBien && bien.typeBien !== 'terrain') return true;
  return (
    bien.surfaceHabitable !== null ||
    bien.nombrePieces !== null ||
    bien.nombreChambres !== null
  );
}
