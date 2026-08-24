# Phase 0 — Fondations techniques (Jalon J0.1) — Rapport de clôture

Référence : section 30 du cahier des charges + planning d'exécution
(Jalon J0.1, 3 semaines). Ce document remplace la checklist initiale et
sert de base à la démonstration et à la validation écrite requises avant
le passage au Jalon J1.1 (exigence de gouvernance du planning
d'exécution).

## Objectif du jalon

Avoir une API sécurisée, un système de rôles fonctionnel et un
environnement de travail propre — aucune fonctionnalité métier.

## Périmètre — état final

- [x] Dépôt Git créé (initialisé localement ; **transfert sous compte/organisation MTM à faire par vos soins**, voir section « Actions restant à votre charge »)
- [x] Environnements séparés : développement, test, production (`.env.example`, configuration Docker Compose, variables distinctes par environnement)
- [x] Architecture backend centralisée, structure modulaire (NestJS, 7 modules : Auth, Users, RBAC, Audit, Settings, Health, Database)
- [x] PostgreSQL provisionné, schéma initial (8 tables), migrations (voir anomalie #1 ci-dessous)
- [x] Authentification email/mot de passe, politique de mot de passe (12 caractères min.), gestion de session (JWT access + refresh token rotatif en cookie httpOnly)
- [x] Double authentification (2FA) pour comptes admin/sensibles — implémentation TOTP complète (otplib + QR code), pas un stub
- [x] Modèle de rôles et permissions granulaires : consulter, créer, modifier, valider, supprimer, exporter, payer, publier, administrer (convention `resource:action`)
- [x] Rôles initiaux configurables : administrateur, direction, manager, responsable commercial, commercial, comptable, resp. gestion locative, resp. démarches, resp. construction, RH (seedés)
- [x] Journal d'audit : utilisateur, date/heure, action, objet, ancienne/nouvelle valeur — service générique réutilisable par les futurs modules métier
- [x] Module de paramétrage général (clé/valeur JSON, modifiable sans code, permissions renforcées pour les paramètres sensibles)
- [x] Sauvegardes automatiques + premier test de restauration — scripts `apps/api/scripts/{backup,restore,test-backup-restore}.sh`, **testés réellement** contre PostgreSQL (cycle sauvegarde → restauration → comparaison → nettoyage automatisé, 9/9 tables confirmées identiques). Voir `docs/BACKUP.md`. Reste à planifier en tâche automatique (cron ou équivalent) sur votre infrastructure.
- [x] CI de base (build + tests automatiques à chaque push) — GitHub Actions, non encore vérifié sur un vrai runner (voir anomalie #3)
- [x] Documentation technique initiale (ce document + `docs/FRONTEND_STACK.md`, `docs/CI.md`, `docs/DOCKER.md`, `apps/api/prisma/PRISMA_NOTES.md`)

## Livrable

Back-office navigable avec connexion sécurisée (login + 2FA), rôles
opérationnels (CRUD rôles/permissions), paramètres modifiables par un
admin, écrans users/rôles/settings/audit fonctionnels avec AG Grid.

## Critère de validation officiel

> Un administrateur MTM peut se connecter, créer un utilisateur, lui
> attribuer un rôle, et voir l'action tracée dans le journal d'audit.

**Statut : prouvé par un test e2e HTTP réel** (`apps/api/test/critical-path.e2e-spec.ts`,
9/9 tests passent), qui reproduit exactement ce parcours via de vraies
requêtes contre l'application NestJS complète (routing, guards,
validation, contrôleurs, services). Voir anomalie #1 pour la réserve
concernant la couche de persistance réelle.

## Explicitement hors périmètre (confirmé respecté)

Terrains, propriétaires, mandats, CRM, réservations, ventes, paiements,
commissions, gestion locative, construction, comptabilité, RH métier,
reporting métier, site public. Aucun de ces éléments n'a été développé.

---

## Anomalies connues

### #1 — Client Prisma non généré dans l'environnement de développement utilisé

**Sévérité : à vérifier en priorité avant la Phase 1, bloquant sinon.**

L'environnement dans lequel ce code a été développé a un accès réseau
restreint qui ne permet pas de télécharger les moteurs Prisma
(`binaries.prisma.sh` non accessible). Conséquence :

- Le schéma Prisma et la migration SQL ont été écrits et **vérifiés
  manuellement contre une vraie instance PostgreSQL 16** (tables, clés
  étrangères, index tous confirmés conformes au schéma).
- Le client Prisma généré (`@prisma/client` avec types réels) n'a **pas
  pu être testé au runtime** dans cet environnement.
- Le test e2e du parcours critique utilise un double in-memory
  (`FakePrismaService`) pour contourner ce blocage — il prouve le
  câblage HTTP réel (guards, validation, contrôleurs) mais **pas** la
  traduction SQL réelle de Prisma contre PostgreSQL.

**Action à faire avant la Phase 1** : dans un environnement avec accès
réseau complet, exécuter :
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev   # confirme que la migration manuelle correspond
                          # exactement à ce que Prisma aurait généré
npm run test              # 66 tests unitaires
npm run test:e2e          # test e2e (nécessitera d'adapter le double
                          # in-memory vers une vraie base de test, ou
                          # d'ajouter un test e2e complémentaire sans
                          # override — les deux options sont documentées
                          # dans apps/api/prisma/PRISMA_NOTES.md)
npm run prisma:seed       # rôles, permissions, admin par défaut
```
Détail complet : `apps/api/prisma/PRISMA_NOTES.md`.

### #2 — Planification automatique des sauvegardes (cron/ordonnanceur)

**Sévérité : faible, à faire au déploiement.**

Les scripts de sauvegarde/restauration existent et sont **testés
réellement** (voir `docs/BACKUP.md` — cycle complet vérifié, 9/9 tables
identiques après restauration). Ce qui manque encore : leur
**planification automatique** (cron, ou équivalent en environnement
Docker/production), qui dépend de l'infrastructure d'hébergement finale
et n'a donc pas été figée dans cette Phase 0. Exemple de crontab fourni
dans `docs/BACKUP.md`, prêt à activer dès que l'hébergement est choisi.

### #3 — Workflow CI non vérifié sur un vrai runner GitHub Actions

**Sévérité : faible, à confirmer au premier push.**

Le réseau restreint de l'environnement de développement empêche de
tester réellement `npx prisma generate`/`migrate deploy` tels
qu'utilisés dans `.github/workflows/ci.yml`. Le workflow a été validé
syntaxiquement (schéma officiel GitHub Actions, `@action-validator/cli`,
0 erreur) et chaque étape du job `backoffice` a été testée intégralement
en local. Le job `api` devrait fonctionner normalement sur un runner
GitHub Actions (accès réseau complet), mais cela reste à confirmer au
premier push réel. Détail : `docs/CI.md`.

### #4 — Actions de grille AG Grid en DOM natif plutôt qu'en composants Angular

**Sévérité : cosmétique, dette technique mineure.**

Les boutons d'action dans les colonnes AG Grid (ex: « Désactiver »,
« Permissions ») sont générés en DOM natif (`document.createElement`)
plutôt qu'en composants Angular, pour contourner la complexité
d'intégration des `cellRenderer` Angular standalone dans AG Grid 36. Cela
fonctionne mais s'écarte légèrement des patterns Angular idiomatiques.
Un renderer Angular dédié pourrait être introduit en Phase 1 si le
volume d'actions par ligne augmente.

### #5 — Composants d'écrans socle (Users, Roles, Settings, Audit) sans tests dédiés

**Sévérité : faible.**

Contrairement à `Login` et `SessionService` (16 tests unitaires), les
composants ajoutés à l'étape « écrans socle » (Users, Roles, Settings,
Audit et leurs dialogs) n'ont pas de tests unitaires dédiés — seule la
compilation et le lint ont été vérifiés. La logique métier
correspondante côté backend, elle, est testée (66 tests unitaires + 9
e2e).

---

## Chiffres de vérification (dernière exécution)

| Vérification | Résultat |
|---|---|
| Tests unitaires backend | 66/66 ✅ |
| Tests e2e backend (parcours critique) | 9/9 ✅ |
| Tests unitaires frontend | 16/16 ✅ |
| Build backend | ✅ propre |
| Build frontend (production) | ✅ propre, bundle initial dans le budget |
| Lint backend | 277 erreurs, 100 % attribuables au client Prisma non généré (voir anomalie #1) |
| Lint frontend | ✅ 0 erreur |
| Migration SQL appliquée contre PostgreSQL réel | ✅ 8 tables, 7 clés étrangères conformes |
| **Cycle sauvegarde/restauration** | ✅ **Testé réellement** — 9/9 tables identiques après restauration (script automatisé reproductible) |
| Workflow CI — schéma GitHub Actions | ✅ validé (0 erreur) |
| Workflow CI — exécution réelle sur runner | ⏳ non testée (voir anomalie #3) |

## Actions restant à votre charge

1. **Exécuter `npx prisma generate` et `npx prisma migrate dev`** dans un
   environnement avec accès réseau complet (voir anomalie #1) — c'est le
   point le plus important avant de considérer la Phase 0 entièrement
   validée.
2. Créer le dépôt Git sous un compte/organisation MTM (pas personnel) et
   y pousser ce code.
3. Confirmer que le workflow CI s'exécute correctement au premier push
   (voir anomalie #3).
4. Planifier l'exécution automatique de `backup.sh` (cron ou équivalent) une fois l'hébergement final choisi — voir `docs/BACKUP.md`.
5. Changer le mot de passe administrateur par défaut (`ChangeMe!2026`,
   généré par le seed) dès la première connexion réelle.
6. Valider par écrit ce jalon (conformément à l'exigence de gouvernance
   du planning d'exécution) avant de démarrer le Jalon J1.1.

## Historique des commits de ce jalon

14 commits, du bootstrap du monorepo à la CI (`1cf94bc` → `d109f8b`),
détaillés dans `git log`. Chaque commit correspond à une étape du plan
d'implémentation validé en début de jalon, avec message décrivant
précisément ce qui a été fait et vérifié.
