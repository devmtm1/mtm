import { AllCommunityModule, ModuleRegistry, provideGlobalGridOptions, themeQuartz } from 'ag-grid-community';

// Enregistrement des modules Community en effet de bord au chargement de
// ce fichier. Comme ce fichier n'est importé que par les écrans utilisant
// AG Grid (tous en lazy loading), l'enregistrement — et le poids d'AG
// Grid (~1 Mo) — n'est payé qu'au moment où l'utilisateur navigue vers un
// de ces écrans, jamais dans le bundle initial.
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Libellés français des grilles (le paquet @ag-grid-community/locale n'est pas
 * installé ; seules les clés visibles en édition Community sont traduites).
 */
export const AG_GRID_LOCALE_FR: Record<string, string> = {
  // Filtres
  selectAll: '(Tout sélectionner)',
  selectAllSearchResults: '(Sélectionner les résultats)',
  searchOoo: 'Rechercher…',
  blanks: '(Vides)',
  noMatches: 'Aucun résultat',
  filterOoo: 'Filtrer…',
  equals: 'Égal à',
  notEqual: 'Différent de',
  blank: 'Vide',
  notBlank: 'Non vide',
  empty: 'Choisir',
  lessThan: 'Inférieur à',
  greaterThan: 'Supérieur à',
  lessThanOrEqual: 'Inférieur ou égal à',
  greaterThanOrEqual: 'Supérieur ou égal à',
  inRange: 'Entre',
  inRangeStart: 'De',
  inRangeEnd: 'À',
  contains: 'Contient',
  notContains: 'Ne contient pas',
  startsWith: 'Commence par',
  endsWith: 'Finit par',
  dateFormatOoo: 'aaaa-mm-jj',
  before: 'Avant',
  after: 'Après',
  andCondition: 'ET',
  orCondition: 'OU',
  applyFilter: 'Appliquer',
  resetFilter: 'Réinitialiser',
  clearFilter: 'Effacer',
  cancelFilter: 'Annuler',
  textFilter: 'Filtre texte',
  numberFilter: 'Filtre numérique',
  dateFilter: 'Filtre date',
  setFilter: 'Filtre valeurs',
  // Colonnes / menu
  columns: 'Colonnes',
  filters: 'Filtres',
  pinColumn: 'Épingler la colonne',
  pinLeft: 'À gauche',
  pinRight: 'À droite',
  noPin: 'Ne pas épingler',
  autosizeThisColumn: 'Ajuster cette colonne',
  autosizeAllColumns: 'Ajuster toutes les colonnes',
  resetColumns: 'Réinitialiser les colonnes',
  sortAscending: 'Tri croissant',
  sortDescending: 'Tri décroissant',
  sortUnSort: 'Annuler le tri',
  // Grille
  loadingOoo: 'Chargement…',
  loadingError: 'Erreur de chargement',
  noRowsToShow: 'Aucune donnée à afficher',
  enabled: 'Activé',
  // Pagination
  page: 'Page',
  more: 'Plus',
  to: 'à',
  of: 'sur',
  next: 'Suivant',
  last: 'Dernière',
  first: 'Première',
  previous: 'Précédent',
  pageSizeSelectorLabel: 'Lignes par page :',
  footerTotal: 'Total',
  // Accessibilité
  ariaPageSizeSelectorLabel: 'Lignes par page',
  ariaRowSelectAll: 'Sélectionner toutes les lignes',
  ariaRowToggleSelection: 'Sélectionner la ligne',
  ariaSortableColumn: 'Appuyez sur Entrée pour trier',
  ariaMenuColumn: 'Appuyez sur Alt+flèche bas pour ouvrir le menu',
  ariaFilterColumn: 'Appuyez sur Ctrl+Entrée pour filtrer',
};

provideGlobalGridOptions({ paginationPageSizeSelector: false, localeText: AG_GRID_LOCALE_FR });

// Thème partagé, aligné sur la palette MTM Immobilier pour conserver
// une lecture sobre et cohérente sur tous les tableaux.
export const mtmGridTheme = themeQuartz.withParams({
  accentColor: 'var(--mtm-primary)',
  backgroundColor: 'var(--mtm-card-bg)',
  borderColor: 'var(--mtm-border)',
  borderRadius: 12,
  chromeBackgroundColor: 'var(--mtm-bg-surface)',
  foregroundColor: 'var(--mtm-text-dark)',
  headerBackgroundColor: 'var(--mtm-bg-surface)',
  headerFontWeight: 800,
  headerTextColor: 'var(--mtm-primary)',
  oddRowBackgroundColor: 'var(--mtm-card-bg)',
  rowBorder: true,
  rowVerticalPaddingScale: 1.15,
  wrapperBorder: true,
  wrapperBorderRadius: 12,
});
