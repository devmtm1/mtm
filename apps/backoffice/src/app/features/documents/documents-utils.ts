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
