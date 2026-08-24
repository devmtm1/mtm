# Stack frontend — Back-office (ERP) MTM Immobilier

Ces outils sont **imposés** pour l'ensemble du développement du
back-office Angular (Phase 0 et toutes les phases suivantes). Ils ne
doivent pas être substitués par des équivalents sans validation explicite
de MTM.

| Outil | Usage |
|---|---|
| **Angular** | Framework de l'application ERP / back-office |
| **Angular Material** | Composants UI principaux (boutons, formulaires, dialogs, tables simples, navigation...) |
| **Angular CDK** | Primitives avancées : drag & drop, overlay, accessibility, layout |
| **AG Grid** | Tableaux de données complexes (listes filtrables/triables/exportables — terrains, utilisateurs, mandats, etc. selon les phases) |
| **Lucide Angular** | Icônes de toute l'interface |
| **Apache ECharts** | Graphiques, statistiques, dashboards |
| **ngx-echarts** | Wrapper Angular pour intégrer ECharts |

## Répartition indicative des usages en Phase 0

- **Angular Material** : formulaire de login, dialogs de confirmation,
  champs de formulaire (utilisateurs, rôles, paramètres), snackbars de
  notification, boutons, menu de navigation.
- **Angular CDK** : overlay pour les menus contextuels, éventuel drag & drop
  pour l'ordonnancement des permissions dans un rôle.
- **AG Grid** : liste des utilisateurs, liste des rôles/permissions,
  journal d'audit (avec filtres et tri).
- **Lucide Angular** : toutes les icônes du layout (menu, actions, statuts).
- **Apache ECharts / ngx-echarts** : non utilisé en Phase 0 (le dashboard
  reste un placeholder sans données métier), mais l'intégration de la
  librairie sera mise en place dès le bootstrap Angular pour être prête
  dès qu'un premier graphique réel sera nécessaire (Phase 3 principalement,
  reporting).

## Packages npm correspondants (installés à l'étape "Angular bootstrap")

```bash
npx @angular/cli@21 new backoffice --directory=apps/backoffice --style=scss --routing --standalone --ssr=false
ng add @angular/material          # inclut Angular CDK automatiquement
npm install ag-grid-community ag-grid-angular
npm install @lucide/angular       # remplace lucide-angular, déprécié
npm install echarts ngx-echarts@21
npm install @angular/animations@21.2.21   # requis par provideAnimationsAsync (Material)
```

**Notes de version (Angular 21)** :
- `ngx-echarts@22` exige Angular ≥22 ; ce projet utilise `ngx-echarts@21` (compatible ≥21.0.0).
- `lucide-angular` (le package historique) est déprécié depuis sa version 1.0.0 ; utiliser `@lucide/angular`.
- `@angular/animations` est marqué déprécié par Angular au profit de `animate.enter`/`animate.leave` natifs, mais reste nécessaire en l'état pour `provideAnimationsAsync()` (interactions Material : ripple, etc.). À migrer si Angular Material lui-même bascule vers l'API native.
- ECharts (~1 Mo) est chargé en **lazy loading** via `provideEchartsCore({ echarts: () => import('echarts') })` dans `app.config.ts`, pour ne pas alourdir le bundle initial alors qu'aucun graphique n'est encore affiché en Phase 0. Le poids réel n'est payé qu'à la Phase 3 (reporting), au premier rendu d'un graphique.
- AG Grid 36 utilise la nouvelle **Theming API** (JS, via `themeQuartz` etc. importé depuis `ag-grid-community`), plus l'ancien import de CSS globaux. Le thème sera configuré directement dans le premier composant grille (étape "écrans socle").
- Thème Material : palette **violet** (primaire) / **orange** (accent), choisie délibérément plutôt que le duo azure/blue par défaut du starter Angular Material, pour donner une identité visuelle propre à MTM Immobilier tout en restant strictement dans les palettes M3 prédéfinies fournies par `@angular/material`.
