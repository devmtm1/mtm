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

Le violet constitue la couleur principale de l'identité MTM.

Palette de référence :

Primary: #4B1D73
Primary Dark: #32124F

Background: #F7F8FA
Surface: #FFFFFF

Border: #E5E7EB

Text: #1F2937
Muted: #6B7280

Success: #059669
Warning: #D97706
Error: #DC2626

Le violet doit être utilisé comme couleur d'identité et d'accent,
pas comme couleur dominante de chaque composant.

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