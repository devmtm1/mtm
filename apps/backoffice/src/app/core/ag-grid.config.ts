import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';

// Enregistrement des modules Community en effet de bord au chargement de
// ce fichier. Comme ce fichier n'est importé que par les écrans utilisant
// AG Grid (tous en lazy loading), l'enregistrement — et le poids d'AG
// Grid (~1 Mo) — n'est payé qu'au moment où l'utilisateur navigue vers un
// de ces écrans, jamais dans le bundle initial.
ModuleRegistry.registerModules([AllCommunityModule]);

// Thème partagé, aligné sur la palette MTM Immobilier pour conserver
// une lecture sobre et cohérente sur tous les tableaux.
export const mtmGridTheme = themeQuartz.withParams({
  accentColor: 'var(--mtm-purple-primary)',
  backgroundColor: 'var(--mtm-card-bg)',
  borderColor: 'var(--mtm-border)',
  borderRadius: 12,
  chromeBackgroundColor: 'var(--mtm-bg-surface)',
  foregroundColor: 'var(--mtm-text-dark)',
  headerBackgroundColor: 'var(--mtm-bg-surface)',
  headerFontWeight: 800,
  headerTextColor: 'var(--mtm-purple-primary)',
  oddRowBackgroundColor: 'var(--mtm-card-bg)',
  rowBorder: true,
  rowVerticalPaddingScale: 1.15,
  wrapperBorder: true,
  wrapperBorderRadius: 12,
});
