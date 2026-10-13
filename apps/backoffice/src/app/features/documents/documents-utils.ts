export type GedFichier = 'pdf' | 'image' | 'tableur' | 'texte' | 'autre';

/** Nature du fichier d'après l'extension de son adresse (sans la requête). */
export function natureFichier(url: string | null | undefined): GedFichier {
  const chemin = (url ?? '').split(/[?#]/)[0].toLowerCase();
  const extension = chemin.includes('.') ? chemin.slice(chemin.lastIndexOf('.') + 1) : '';
  if (extension === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic'].includes(extension)) return 'image';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return 'tableur';
  if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(extension)) return 'texte';
  return 'autre';
}

/**
 * Numéros de page à afficher : toujours la première et la dernière, la page
 * courante et ses voisines ; `null` marque un « … » entre deux plages.
 */
export function pagesAffichees(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const voulues = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => voulues.add(n));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => voulues.add(n));
  const numeros = [...voulues].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const resultat: (number | null)[] = [];
  numeros.forEach((n, i) => {
    if (i > 0) {
      const ecart = n - numeros[i - 1];
      // Un « … » qui ne cache qu'une page ne sert à rien : on l'affiche.
      if (ecart === 2) resultat.push(n - 1);
      else if (ecart > 2) resultat.push(null);
    }
    resultat.push(n);
  });
  return resultat;
}
