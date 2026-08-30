# Phase 0 — Fondations techniques (Jalon J0.1) — Rapport de clôture historique

Référence : section 30 du cahier des charges + planning d'exécution
(Jalon J0.1, 3 semaines). Ce document remplace la checklist initiale et
sert de base à la démonstration et à la validation écrite requises avant
le passage au Jalon J1.1 (exigence de gouvernance du planning
d'exécution).

## Objectif du jalon

Avoir une API sécurisée, un système de rôles fonctionnel et un
environnement de travail propre — aucune fonctionnalité métier.

## Périmètre — état final

- [ ] Dépôt Git sous compte/organisation MTM (**à faire par MTM, volontairement exclu de cette intervention**)
- [x] Environnements séparés : développement, test, production (`.env.example`, configuration Docker Compose, variables distinctes par environnement)
- [x] Architecture backend centralisée, structure modulaire (NestJS, 7 modules : Auth, Users, RBAC, Audit, Settings, Health, Database)
- [x] PostgreSQL provisionné, schéma initial (8 tables), migrations (voir anomalie #1 ci-dessous)
- [x] Authentification email/mot de passe, politique de mot de passe (12 caractères min.), gestion de session (JWT access + refresh token rotatif en cookie httpOnly)
- [x] Double authentification (2FA) pour comptes admin/sensibles — implémentation TOTP complète (otplib + QR code), pas un stub
- [x] Modèle de rôles et permissions granulaires : consulter, créer, modifier, valider, supprimer, exporter, payer, publier, administrer (convention `resource:action`)
- [x] Rôles initiaux configurables : administrateur, direction, manager, responsable commercial, commercial, comptable, resp. gestion locative, resp. démarches, resp. construction, RH (seedés)
- [x] Journal d'audit : utilisateur, date/heure, action, objet, ancienne/nouvelle valeur — service générique réutilisable par les futurs modules métier
- [x] Module de paramétrage général (clé/valeur JSON, modifiable sans code, permissions renforcées pour les paramètres sensibles)
- [x] Sauvegardes automatiques + premier test de restauration — scripts `apps/api/scripts/{backup,restore,test-backup-restore}.sh`, **testés réellement** contre PostgreSQL, avec service Docker `backup` planifié. Voir `docs/BACKUP.md`.
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

## Périmètre métier après clôture de Phase 0

La Phase 0 a été clôturée comme socle technique. Les travaux métier ont
ensuite commencé conformément au planning : J1.1 (terrains) et J1.2 (site
public) sont en cours et leurs migrations/modules ne doivent plus être
évalués comme des éléments de Phase 0.

## Périmètre métier de Phase 0 (au moment de sa clôture)

Mandats, CRM, réservations, ventes, paiements, commissions, gestion locative,
construction, comptabilité, RH métier et reporting métier étaient hors
périmètre de la Phase 0. Les terrains, propriétaires, contacts, contenus
marketing et site public relèvent désormais des jalons J1.1 et J1.2.

---

## Anomalies connues

### #1 — Test e2e PostgreSQL réel à compléter

**Sévérité : moyenne, à compléter avant la recette finale.**

La génération Prisma, les migrations, le seed et le build API passent
maintenant localement contre PostgreSQL. Le parcours e2e critique utilise
encore `FakePrismaService`; un scénario CI séparé sans override Prisma doit
être ajouté pour valider la persistance réelle.

### #2 — Réplication externe des sauvegardes

**Sévérité : faible, à faire au déploiement.**

Les scripts et la planification Docker sont présents et le cycle de
restauration est testé. La réplication vers un stockage externe reste à
configurer sur l'hébergement de production.

### #3 — Workflow CI non vérifié sur un vrai runner GitHub Actions

**Sévérité : faible, à confirmer au premier push.**

Le workflow est défini et les étapes passent localement. Son exécution sur
un runner GitHub Actions reste à confirmer après le transfert du dépôt MTM.

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

### #6 — Livraison du token de récupération à raccorder en production

Le backend génère désormais des tokens de récupération à usage unique,
expirant après 30 minutes, et révoque les sessions existantes après
réinitialisation. En développement et en test, le token est retourné pour
permettre la recette. En production, la réponse reste générique et le token
doit être transmis par un fournisseur email/SMS à intégrer avant ouverture
du parcours aux utilisateurs.

---

## Chiffres de vérification (dernière exécution)

| Vérification                                   | Résultat                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tests unitaires backend                        | 78/78 ✅                                                                                             |
| Tests e2e backend (parcours critique)          | avec double Prisma ✅                                                                                |
| Tests unitaires frontend                       | présents, recette complète à confirmer                                                               |
| Build backend                                  | ✅ propre                                                                                            |
| Build frontend (production)                    | ✅ propre, bundle initial dans le budget                                                             |
| Lint backend                                   | 0 erreur, avertissements de typage de tests à réduire                                                |
| Lint frontend                                  | ✅ 0 erreur                                                                                          |
| Migration SQL appliquée contre PostgreSQL réel | ✅ 8 tables, 7 clés étrangères conformes                                                             |
| **Cycle sauvegarde/restauration**              | ✅ **Testé réellement** — 9/9 tables identiques après restauration (script automatisé reproductible) |
| Workflow CI — schéma GitHub Actions            | ✅ validé (0 erreur)                                                                                 |
| Workflow CI — exécution réelle sur runner      | ⏳ non testée (voir anomalie #3)                                                                     |

## Actions restant à votre charge

1. Créer le dépôt Git sous un compte/organisation MTM (pas personnel) et
   y pousser ce code.
2. Confirmer que le workflow CI s'exécute correctement au premier push
   (voir anomalie #3).
3. Configurer la réplication externe des backups une fois l'hébergement choisi.
4. Changer le mot de passe administrateur par défaut (`ChangeMe!2026`,
   généré par le seed) dès la première connexion réelle.
5. Valider par écrit ce jalon (conformément à l'exigence de gouvernance
   du planning d'exécution) avant de démarrer le Jalon J1.1.

## Historique des commits de ce jalon

14 commits, du bootstrap du monorepo à la CI (`1cf94bc` → `d109f8b`),
détaillés dans `git log`. Chaque commit correspond à une étape du plan
d'implémentation validé en début de jalon, avec message décrivant
précisément ce qui a été fait et vérifié.
