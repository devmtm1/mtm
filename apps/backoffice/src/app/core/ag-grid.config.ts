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
  accentColor: '#2D1552',
  backgroundColor: '#FFFFFF',
  borderColor: '#E7E1F0',
  borderRadius: 12,
  chromeBackgroundColor: '#FBF9FE',
  foregroundColor: '#191528',
  headerBackgroundColor: '#F7F3FC',
  headerFontWeight: 800,
  headerTextColor: '#2D1552',
  oddRowBackgroundColor: '#FCFBFE',
  rowBorder: true,
  rowVerticalPaddingScale: 1.15,
  wrapperBorder: true,
  wrapperBorderRadius: 12,
});
