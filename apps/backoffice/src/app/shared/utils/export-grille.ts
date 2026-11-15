import type { Column, GridApi } from 'ag-grid-community';
import type { ColonneExport, LigneExport, ModuleExportable, SourceExport } from '../../core/services/api/exports-api.service';

export interface OptionsExportGrille {
  module: ModuleExportable;
  titre: string;
  sousTitre?: string;
  /** Colonnes à ne pas exporter, par identifiant (en plus de celles sans intitulé : actions, cases à cocher…). */
  exclure?: string[];
}

/** Une colonne d'action, de sélection ou d'icône n'a pas d'intitulé : elle n'a rien à faire dans un document. */
function estExportable(colonne: Column, exclure: string[]): boolean {
  const def = colonne.getColDef();
  const id = colonne.getColId();
  if (exclure.includes(id) || !def.headerName?.trim()) return false;
  return Boolean(def.field || def.valueGetter);
}

function versTexte(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  if (typeof valeur === 'object') return null;
  return String(valeur).replace(/\s+/g, ' ').trim() || null;
}

/**
 * Les lignes et colonnes d'une grille telles que l'utilisateur les voit : colonnes affichées dans leur ordre, lignes
 * filtrées et triées, valeurs mises en forme comme à l'écran. Une colonne qui ne contient que des nombres reste
 * numérique pour qu'Excel puisse la sommer ; le reste part en texte.
 */
export function sourceDepuisGrille(api: GridApi, options: OptionsExportGrille): SourceExport {
  const exclure = options.exclure ?? [];
  const colonnes = api.getAllDisplayedColumns().filter((colonne) => estExportable(colonne, exclure));
  const noeuds: NonNullable<ReturnType<GridApi['getDisplayedRowAtIndex']>>[] = [];
  api.forEachNodeAfterFilterAndSort((noeud) => {
    if (!noeud.group) noeuds.push(noeud);
  });

  const definitions: ColonneExport[] = [];
  const brutes: unknown[][] = colonnes.map((colonne) => noeuds.map((noeud) => api.getCellValue({ rowNode: noeud, colKey: colonne, useFormatter: false })));
  const formatees: (string | null)[][] = colonnes.map((colonne) =>
    noeuds.map((noeud) => versTexte(api.getCellValue({ rowNode: noeud, colKey: colonne, useFormatter: true }))),
  );

  colonnes.forEach((colonne, index) => {
    const valeurs = brutes[index].filter((valeur) => valeur !== null && valeur !== undefined && valeur !== '');
    const numerique = valeurs.length > 0 && valeurs.every((valeur) => typeof valeur === 'number' && Number.isFinite(valeur));
    definitions.push({
      cle: `c${index}`,
      libelle: (colonne.getColDef().headerName ?? '').trim(),
      type: numerique ? 'nombre' : 'texte',
    });
  });

  const lignes: LigneExport[] = noeuds.map((_noeud, ligne) => {
    const sortie: LigneExport = {};
    definitions.forEach((definition, index) => {
      sortie[definition.cle] =
        definition.type === 'nombre' ? (brutes[index][ligne] as number | null | undefined) ?? null : formatees[index][ligne];
    });
    return sortie;
  });

  return { module: options.module, titre: options.titre, sousTitre: options.sousTitre, colonnes: definitions, lignes };
}
