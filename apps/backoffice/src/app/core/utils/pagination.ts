/** Un numéro de page, ou « … » pour les pages qu'on saute. */
export type ElementPagination = number | '…';

/**
 * Les numéros à afficher dans une barre de pagination : toujours la première, la dernière et la page courante avec
 * ses voisines, des points de suspension pour le reste. Jusqu'à sept pages, tous les numéros sont montrés.
 */
export function fenetrePages(courante: number, pages: number, voisines = 1): ElementPagination[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const garder = new Set<number>([1, pages]);
  for (let page = courante - voisines; page <= courante + voisines; page++) {
    if (page >= 1 && page <= pages) garder.add(page);
  }
  const triees = [...garder].sort((a, b) => a - b);
  const resultat: ElementPagination[] = [];
  triees.forEach((page, index) => {
    const precedente = triees[index - 1];
    if (precedente !== undefined) {
      // Un seul numéro manquant s'écrit tel quel : « … » pour une page serait plus long que la page.
      if (page - precedente === 2) resultat.push(precedente + 1);
      else if (page - precedente > 2) resultat.push('…');
    }
    resultat.push(page);
  });
  return resultat;
}

/** « 26–50 » : les rangs affichés sur la page, pour le texte « 26–50 sur 132 ». */
export function plageAffichee(
  page: number,
  taille: number,
  total: number,
): { debut: number; fin: number } {
  if (total === 0) return { debut: 0, fin: 0 };
  return { debut: (page - 1) * taille + 1, fin: Math.min(page * taille, total) };
}

/**
 * La page d'une liste déjà chargée en entier (listes courtes, filtrées côté navigateur). Une page demandée au-delà de
 * la dernière ramène à la dernière : une liste qui rétrécit ne laisse pas une page vide.
 */
export function pageDe<T>(liste: readonly T[], page: number, taille: number): T[] {
  const parPage = Math.max(1, taille);
  const pages = Math.max(1, Math.ceil(liste.length / parPage));
  const courante = Math.min(Math.max(1, page), pages);
  return liste.slice((courante - 1) * parPage, courante * parPage);
}
