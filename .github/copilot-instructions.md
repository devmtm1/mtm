# MTM Immobilier — Instructions GitHub Copilot

## 1. CONTEXTE DU PROJET

MTM Immobilier est un ERP professionnel destiné à la gestion des activités
immobilières et commerciales de l'entreprise.

Le système couvre progressivement :

- terrains ;
- propriétaires ;
- mandats ;
- prospects ;
- clients ;
- commercialisation ;
- réservations ;
- ventes ;
- paiements ;
- commissions ;
- documents ;
- cartographie ;
- espace client ;
- administration ;
- reporting.

Le projet est développé progressivement par phases et jalons.

Copilot doit toujours respecter le cahier des charges MTM Immobilier
et le plan d'exécution du projet.

---

# 2. MÉTHODE DE DÉVELOPPEMENT

Le projet doit être développé progressivement.

Ne jamais implémenter plusieurs gros modules métier simultanément sans
validation.

Pour chaque fonctionnalité importante :

1. analyser l'existant ;
2. comprendre les dépendances ;
3. proposer une solution ;
4. obtenir une validation lorsque demandé ;
5. implémenter ;
6. tester ;
7. vérifier le build ;
8. vérifier les impacts sur les autres modules.

Ne jamais modifier massivement l'architecture sans justification.

---

# 3. PHASE 0

La Phase 0 est considérée comme terminée.

Les fondations existantes doivent être réutilisées.

Avant de créer une nouvelle fonctionnalité, vérifier si elle existe déjà.

Ne jamais recréer inutilement :

- authentification ;
- autorisation ;
- rôles ;
- permissions ;
- audit ;
- configuration ;
- gestion des utilisateurs ;
- infrastructure ;
- services communs.

Réutiliser les mécanismes existants.

---

# 4. ARCHITECTURE GÉNÉRALE

Le projet utilise une architecture modulaire.

Principes obligatoires :

- séparation des responsabilités ;
- SOLID ;
- DRY ;
- KISS lorsque pertinent ;
- forte cohésion ;
- faible couplage ;
- composants réutilisables ;
- services clairement responsables ;
- code maintenable ;
- code évolutif.

Le projet n'utilise PAS une architecture DDD.

Ne pas introduire :

- aggregates ;
- value objects ;
- domain events ;
- repositories DDD ;
- bounded contexts ;

uniquement pour appliquer du DDD.

Utiliser une architecture modulaire classique adaptée à NestJS et Angular.

---

# 5. BACKEND

Technologie principale :

- NestJS
- TypeScript
- PostgreSQL
- Docker

Respecter les conventions NestJS.

Les controllers doivent rester minces.

La logique métier doit être placée dans les services appropriés.

Les DTO doivent être utilisés pour les entrées/sorties lorsque pertinent.

Valider systématiquement les données entrantes.

Ne jamais faire confiance aux données provenant du frontend.

Respecter les mécanismes existants :

- guards ;
- permissions ;
- validation ;
- exceptions ;
- audit ;
- configuration.

Ne pas dupliquer les services communs.

---

# 6. FRONTEND

Technologie principale :

- Angular
- TypeScript

Utiliser une architecture Angular modulaire et évolutive.

Séparer clairement :

- pages ;
- composants ;
- composants partagés ;
- services ;
- modèles ;
- guards ;
- routing ;
- logique de présentation.

Éviter les composants gigantesques.

Un composant ne doit pas contenir toute la logique métier.

Réutiliser les composants existants.

---

# 7. UI / DESIGN SYSTEM

Technologies UI :

- Angular Material
- Angular CDK
- Tailwind CSS
- SCSS
- Lucide Angular
- AG Grid
- Apache ECharts / ngx-echarts

## Angular Material

Utiliser Angular Material lorsque le composant correspondant est pertinent.

## Angular CDK

Utiliser Angular CDK pour les primitives UI nécessaires.

## Tailwind CSS

Privilégier Tailwind pour :

- layout ;
- flexbox ;
- grid ;
- spacing ;
- responsive ;
- sizing ;
- alignement ;
- utilitaires.

## SCSS

Utiliser SCSS lorsque nécessaire pour des styles complexes ou spécifiques.

Ne pas créer inutilement de longues feuilles SCSS.

## Lucide Angular

Privilégier Lucide pour les icônes modernes lorsque pertinent.

Éviter de mélanger plusieurs styles d'icônes sans raison.

## AG Grid

Utiliser AG Grid pour les tableaux métier complexes lorsque nécessaire.

## ECharts

Utiliser ECharts pour les graphiques et visualisations métier.

---

# 8. DESIGN MTM

L'interface doit avoir une apparence :

- professionnelle ;
- corporate ;
- sobre ;
- moderne ;
- premium ;
- claire ;
- fonctionnelle.

Éviter :

- design flashy ;
- gradients excessifs ;
- grosses ombres ;
- animations inutiles ;
- cartes surdimensionnées ;
- surcharge visuelle ;
- aspect landing page ;
- aspect template SaaS générique.

Les couleurs sont exactement celles du logo MTM Immobilier (logomtm.jpeg) :
bleu marine du cube et du mot IMMOBILIER, rouge carmin du mot MTM et de
l'anneau, bleu clair des facettes du cube. Aucune autre teinte de marque.

Palette de référence (valeurs mesurées sur le logo) :

Primary (bleu marine): #1A4974
Primary Dark: #233D5B
Primary Medium (survol): #2C6499
Primary Light: #CFE0EE
Primary Subtle (fonds): #EAF1F7

Accent (rouge carmin): #B52C36
Accent Dark: #83191D
Accent Subtle: #F8E8E9

Info (bleu clair): #5EA8C7
Info Background: #E9F4F9

Background: #F7F8FA
Surface: #FFFFFF

Border: #E5E7EB

Text: #1F2937
Muted: #6B7280

Success: #047857
Warning: #B45309
Error: #B52C36 (le rouge de marque sert aussi d'alerte)

Règles d'usage :

- le bleu marine est la couleur principale : boutons primaires, liens,
  éléments actifs, eyebrows, icônes de section ;
- le rouge carmin est l'accent de marque et la couleur des actions
  sensibles (suppression, erreur, retard) ; il ne sert pas de couleur de
  décoration diffuse ;
- le bleu clair signale une information ou une mise en évidence secondaire ;
- aucune couleur codée en dur dans les composants : uniquement les tokens
  `--mtm-*` de `styles.scss` (back-office) et la palette Tailwind
  `mtm-*` (site public), dérivés de ces valeurs ;
- pas de dégradé de couleur : aplats uniquement ;
- icônes : Lucide exclusivement (jamais de glyphe texte, jamais de
  Material Icons) ;
- typographie : Plus Jakarta Sans (texte) et Outfit (titres), y compris
  pour les composants Angular Material (thème configuré, pas Roboto) ;
- libellés : toujours en français, y compris les grilles AG Grid et les
  codes techniques de l'API (statuts, types) qui passent par le pipe
  `mtmLabel`.

Structure commune des écrans du back-office (blocs de `styles.scss`) :

- liste : `.page-header` (eyebrow, titre, sous-titre qui explique à quoi
  sert l'écran, actions à droite) → `.kpi-row` (3 tuiles cliquables qui
  filtrent) → `.page-section` avec `.list-toolbar` (titre + compteur,
  `.list-filters`, `.view-switch`) → `.list-grid` AG Grid (lignes
  cliquables, actions épinglées à droite) ou cartes ; `.empty-state`
  expliqué avec l'action à faire ;
- fiche : `.detail-header` (statuts en `.status-pill` avec aide au survol),
  `.todo-banner` (ce qu'il reste à faire), `.content-grid` de
  `.page-card.detail-section` (`__head` avec `__hint` qui explique la
  section) ;
- dialogues : toujours un texte d'introduction qui dit ce que le choix
  produit, une aide (`mat-hint`) par champ, un bouton dont le libellé
  nomme l'action (« Créer le compte », pas « OK ») ; statuts via
  `StatusChoiceDialog`, historique via `HistoryDialog` ;
- jamais de clé technique à l'écran : chaque module déclare un catalogue
  (`terrain-status.ts`, `crm-status.ts`, `ventes-status.ts`,
  `site-content-catalog.ts`, `settings-catalog.ts`, `admin/admin-labels.ts`)
  qui associe libellé, aide et couleur à chaque code ; un code inconnu passe
  par `businessLabel()` ;
- tout ce qui est référentiel (options, listes de commerciaux) est mis en
  cache côté service (`shareReplay`) pour des transitions rapides.

---

# 9. SIDEBAR ET NAVIGATION

Le Sidebar doit être conçu pour être évolutif.

Le nombre de modules augmentera progressivement.

Ne considérer pas la navigation actuelle comme définitive.

La navigation doit pouvoir supporter :

- groupes ;
- sous-menus ;
- états actifs ;
- permissions ;
- sidebar collapsible ;
- nouveaux modules.

Ne créer aucune route fictive.

Ne créer aucun module fictif.

Réutiliser les routes existantes.

La navigation doit être cohérente avec les permissions de l'application.

---

# 10. PERMISSIONS

Les permissions sont gérées par le système existant de MTM.

Ne jamais créer un deuxième système de permissions.

Toujours vérifier :

- authentification ;
- autorisation ;
- rôle ;
- permission.

La sécurité ne doit jamais dépendre uniquement du frontend.

Le backend reste l'autorité.

---

# 11. DONNÉES PUBLIQUES ET INTERNES

Toujours distinguer :

DONNÉES INTERNES :

- prix d'acquisition ;
- marges ;
- commissions internes ;
- notes internes ;
- informations confidentielles ;
- données propriétaires non publiques.

DONNÉES PUBLIQUES :

- informations destinées au catalogue ;
- description publique ;
- prix public ;
- médias publics ;
- informations publiques sur les terrains.

Ne jamais exposer accidentellement une donnée interne dans une API publique.

---

# 12. BASE DE DONNÉES

Utiliser PostgreSQL.

Avant de créer une nouvelle table :

1. rechercher les tables existantes ;
2. vérifier les relations ;
3. vérifier si une entité existante peut être réutilisée ;
4. éviter la duplication.

Les migrations doivent être explicites et versionnées.

Ne jamais modifier directement la base de production.

---

# 13. API

Respecter les conventions API existantes.

Les endpoints doivent être :

- cohérents ;
- prévisibles ;
- sécurisés ;
- validés ;
- documentables.

Utiliser pagination, filtres et recherche lorsque nécessaire.

Ne pas créer des endpoints redondants.

---

# 14. TESTS

Chaque fonctionnalité importante doit être testée.

Backend :

- unitaires ;
- intégration ;
- validation ;
- permissions ;
- cas d'erreur.

Frontend :

- composants critiques ;
- formulaires ;
- services critiques ;
- permissions ;
- états UI.

Avant de considérer une fonctionnalité terminée :

- vérifier les tests ;
- vérifier le build ;
- vérifier les erreurs TypeScript ;
- vérifier les régressions.

---

# 15. GESTION DES ERREURS

Les erreurs doivent être gérées proprement.

Ne jamais :

- ignorer silencieusement une exception ;
- utiliser des `any` inutilement ;
- masquer une erreur ;
- afficher des erreurs techniques internes à l'utilisateur.

Prévoir des messages utilisateur compréhensibles.

---

# 16. TYPESCRIPT

Éviter :

- `any` ;
- duplication ;
- casts inutiles ;
- fonctions trop longues ;
- classes trop complexes ;
- composants gigantesques.

Privilégier :

- types explicites ;
- interfaces lorsque pertinentes ;
- enums ou constantes cohérentes ;
- fonctions courtes ;
- responsabilité unique.

---

# 17. CODE QUALITY

Avant de terminer une tâche :

- analyser le code existant ;
- réutiliser ce qui existe ;
- supprimer la duplication introduite ;
- vérifier les imports ;
- vérifier les types ;
- vérifier lint ;
- vérifier tests ;
- vérifier build.

Ne jamais considérer une fonctionnalité terminée uniquement parce que
le code compile.

---

# 18. MODIFICATIONS

Avant une modification importante :

identifier :

- fichiers concernés ;
- dépendances ;
- impacts ;
- risques.

Éviter les modifications massives.

Privilégier les changements petits et vérifiables.

---

# 19. NOUVEAUX PACKAGES

Ne jamais installer une nouvelle dépendance sans vérifier :

1. si une solution existe déjà ;
2. si Angular Material/CDK peut répondre au besoin ;
3. si Tailwind peut répondre au besoin ;
4. si une bibliothèque déjà installée peut répondre au besoin.

Toute nouvelle dépendance doit être justifiée.

---

# 20. DOCUMENTATION

Lorsqu'une décision architecturale importante est prise,
la documenter lorsque nécessaire.

Les décisions doivent rester compréhensibles par un autre développeur
qui rejoint le projet.

---

# 21. RÈGLE FINALE

Toujours privilégier :

maintenabilité
>
simplicité
>
cohérence
>
réutilisabilité
>
performance
>
nouveauté

Ne jamais introduire une solution complexe simplement parce qu'elle
semble plus moderne.

MTM Immobilier doit rester un logiciel professionnel, stable,
maintenable et évolutif.