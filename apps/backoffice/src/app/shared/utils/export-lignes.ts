import { type Observable, EMPTY, expand, map, reduce, takeWhile } from 'rxjs';
import type {
  ColonneExport,
  LigneExport,
  ModuleExportable,
  SourceExport,
  TypeColonneExport,
} from '../../core/services/api/exports-api.service';

/** Une colonne d'une liste exportée : son titre, son type (les nombres restent des nombres dans Excel) et sa valeur. */
export interface ColonneListe<T> {
  libelle: string;
  type?: TypeColonneExport;
  valeur: (ligne: T) => string | number | null | undefined;
}

export interface BaseExport {
  module: ModuleExportable;
  titre: string;
  sousTitre?: string;
}

/** Les colonnes et lignes d'une liste construite à la main, quand la page n'est pas une grille. */
export function sourceDepuisLignes<T>(base: BaseExport, colonnes: ColonneListe<T>[], lignes: readonly T[]): SourceExport {
  const definitions: ColonneExport[] = colonnes.map((colonne, index) => ({
    cle: `c${index}`,
    libelle: colonne.libelle,
    type: colonne.type ?? 'texte',
  }));
  const rendu: LigneExport[] = lignes.map((ligne) => {
    const sortie: LigneExport = {};
    colonnes.forEach((colonne, index) => {
      const valeur = colonne.valeur(ligne);
      sortie[definitions[index].cle] = valeur === undefined || valeur === '' ? null : valeur;
    });
    return sortie;
  });
  return { ...base, colonnes: definitions, lignes: rendu };
}

/**
 * Toutes les lignes d'une liste paginée côté serveur, avec les filtres en cours : l'export ne doit pas s'arrêter à la
 * page affichée. S'arrête au plafond d'une exportation.
 */
export function chargerToutesLesPages<T>(
  chargerPage: (page: number, taille: number) => Observable<{ items: T[]; total: number }>,
  taille: number,
  plafond = 5000,
): Observable<T[]> {
  return chargerPage(1, taille).pipe(
    expand((resultat, index) => {
      const page = index + 1;
      return page * taille < Math.min(resultat.total, plafond + 1) ? chargerPage(page + 1, taille) : EMPTY;
    }),
    takeWhile((resultat) => resultat.items.length > 0, true),
    map((resultat) => resultat.items),
    reduce((tout, items) => tout.concat(items), [] as T[]),
    map((lignes) => lignes.slice(0, plafond + 1)),
  );
}

/** « 2026-10-15T00:00:00.000Z » → « 2026-10-15 » : le jour, que le serveur met en forme (jj/mm/aaaa) et qu'Excel lit comme une date. */
export function isoJour(valeur: string | null | undefined): string | null {
  return valeur ? valeur.slice(0, 10) : null;
}
