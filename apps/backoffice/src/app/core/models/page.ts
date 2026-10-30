/** Une page d'une liste paginée par le serveur : ce que renvoient les écrans qui paginent (relances, répertoire…). */
export interface Page<T> {
  items: T[];
  /** Page renvoyée, à partir de 1 : le serveur ramène une page trop loin à la dernière. */
  page: number;
  pageSize: number;
  /** Nombre d'éléments de toute la liste, toutes pages confondues. */
  total: number;
  pages: number;
}
