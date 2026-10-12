import type { Cellule, TypeColonne } from '../../core/services/api/pilotage-api.service';

/** Texte affiché d'une cellule d'après le type de sa colonne ; vide pour une valeur absente. */
export function formaterCellule(valeur: Cellule | undefined, type: TypeColonne): string {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  switch (type) {
    case 'montant':
    case 'nombre':
      return Math.round(Number(valeur)).toLocaleString('fr-FR');
    case 'pourcentage':
      return `${Number(valeur).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
    case 'date': {
      const date = new Date(String(valeur));
      return Number.isNaN(date.getTime()) ? String(valeur) : date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
    }
    default:
      return String(valeur);
  }
}

/** Les colonnes de chiffres s'alignent à droite, le texte et les dates à gauche. */
export function alignement(type: TypeColonne): 'gauche' | 'droite' {
  return type === 'texte' || type === 'date' ? 'gauche' : 'droite';
}

/** Extension du fichier exporté, pour le nom proposé au téléchargement. */
export function nomFichierRapport(titre: string, du: string | null, au: string | null, format: string): string {
  const base = titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${du && au ? `${base}_${du}_${au}` : base}.${format}`;
}
