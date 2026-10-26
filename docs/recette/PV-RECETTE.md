# Procès-verbaux de recette — MTM Immobilier

Exigence : sections 30, 31 et 32 du cahier des charges — « procès-verbal ou
fiche de recette par module », « recette métier par MTM sur des scénarios
réels ou représentatifs », « aucune fonctionnalité critique ne doit être
considérée comme terminée sans critère d'acceptation validé ».

## Comment lire et utiliser ce document

- Chaque jalon a sa fiche. Les **critères d'acceptation** viennent du planning
  d'exécution ; les **preuves automatisées** sont les tests du dépôt qui les
  couvrent (relancés à chaque envoi de code par la CI).
- Une preuve automatisée **ne remplace pas** la recette métier : seule MTM peut
  dire que le parcours correspond à son activité. Les cases « Recette MTM »
  sont donc **volontairement vides** : elles se cochent lors de la démonstration,
  sur des cas réels, et la fiche se signe.
- Un jalon ne passe en « Validé » qu'avec les deux signatures. Toute anomalie
  relevée pendant la recette est inscrite dans « Anomalies et réserves », avec
  sa décision (corrigée avant validation, ou acceptée comme réserve datée).
- Vérifier les preuves : `npm run test --workspace=apps/api`,
  `npm run test:e2e --workspace=apps/api`, puis `npm run check:csp`.

## État de validation

| Jalon | Périmètre | Preuves automatisées | Validation MTM |
| --- | --- | --- | --- |
| J0.1 | Socle, sécurité, rôles, audit | oui | à signer |
| J1.1 | Biens (terrains et villas) | oui | à signer |
| J1.2 | Site public | partielle | à signer |
| J1.3 | Cartographie de base | non (visuel) | à signer |
| J1.4 | Mandats et portefeuille | oui | à signer |
| J1.5 | CRM | oui | à signer |
| J1.6 | Ventes, paiements, commissions, GED de base, espace client | oui | à signer |
| J2.1 | Gestion locative | oui | à signer |
| J2.2 | Démarches et vérification foncière | oui | à signer |
| J2.3 | Construction et suivi de chantier | oui | à signer |
| J2.4 | Agenda, tâches, workflows, notifications, messagerie | oui (canaux SMS/WhatsApp : passerelle à brancher) | à signer |
| J2.5 | Applications mobiles | reporté (décision MTM) : le site s'installe comme application (PWA) | — |
| J3.1 | Comptabilité et finances | oui | à signer |
| J3.2 | Tableaux de bord et reporting | oui | à signer |

Réserve générale (tous jalons) : le **paiement en ligne** par un prestataire
(Wave, Orange Money, carte) n'est pas implémenté ; il est reporté à une décision
de MTM et ne figure pas dans les critères ci-dessous.

---

## J0.1 — Socle technique et sécurité de base

**Critères d'acceptation**

1. Un administrateur se connecte avec une session sécurisée.
2. Il crée un utilisateur, lui attribue un rôle et des permissions.
3. La double authentification s'active et se teste sur un compte sensible.
4. L'action apparaît dans le journal d'audit avec ancien et nouveau contexte.
5. Une sauvegarde de test se restaure sans perte de données critiques.
6. Un utilisateur sans permission ne peut ni exporter ni modifier les données sensibles.
7. Aucun secret n'est présent dans le dépôt.

**Preuves automatisées** : `test/critical-path.e2e-spec.ts` (1 à 4),
`test/postgres.e2e-spec.ts`, `src/modules/auth/*.spec.ts` (verrouillage,
double authentification, codes de secours), `src/modules/users/users.service.spec.ts`
(pas d'élévation de privilèges, dernier administrateur protégé),
`src/modules/auth/route-access.spec.ts` (aucune route sans déclaration d'accès),
`apps/api/scripts/test-backup-restore.sh` et le workflow
`.github/workflows/backup-production.yml` (5).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Création d'un vrai compte et attribution d'un rôle | ☐ | |
| Activation de la double authentification sur un téléphone réel | ☐ | |
| Restauration d'une sauvegarde de production dans une base de test | ☐ | |

**Anomalies et réserves** : sauvegarde de production externe à configurer
(secrets du workflow) ; dépôt à transférer à une organisation MTM.

---

## J1.1 — Biens (terrains et villas)

**Critères** : un commercial crée une fiche complète et la fait évoluer avec
traçabilité ; les modifications de prix d'acquisition, de marge, de commission
ou de propriétaire exigent une justification ; ces montants restent invisibles
à qui n'y a pas droit.

**Preuves** : `test/terrains.e2e-spec.ts` (justification obligatoire, montants
masqués, audit avec vraies valeurs), `terrains.service.spec.ts`,
`src/modules/rbac/access-scopes.spec.ts` (périmètre par commercial).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Saisie de 3 biens réels (un terrain, une villa, un bien en régularisation) | ☐ | |
| Modification d'un prix avec justification, puis lecture du journal | ☐ | |
| Connexion d'un commercial : il ne voit que ses biens | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J1.2 — Site public

**Critères** : site consultable, connecté aux vraies données, **sans fuite
d'information interne** ; contenus administrables ; responsive.

**Preuves** : `test/public-cache.e2e-spec.ts`, `terrains-public.service.spec.ts`
(projection publique), tests du site (`apps/public-web`, 62 tests), contrôle de
la politique de sécurité du contenu (`npm run check:csp`), pages légales.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Parcours sur téléphone : accueil, catalogue, fiche, demande de visite | ☐ | |
| Vérification qu'aucun prix d'acquisition ni marge n'apparaît (fiche, code source, réponse de l'API) | ☐ | |
| Modification d'un contenu du site depuis le back-office | ☐ | |
| Relecture des mentions légales et de la politique de confidentialité par un juriste ; renseignement du NINEA, du RCCM et du directeur de publication | ☐ | |

**Anomalies et réserves** : NINEA, RCCM, directeur de publication et durées de
conservation à renseigner (« à compléter par MTM » sur les pages légales).

---

## J1.3 — Cartographie de base

**Critères** : les biens sont localisables sur la fiche publique et en
back-office ; plan et vue satellite.

**Preuves** : aucune automatisée (rendu cartographique). Les bulles de carte
sont construites en texte, pas en HTML (`map-popup.spec.ts`).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un bien avec coordonnées GPS apparaît au bon endroit (plan et satellite) | ☐ | |
| Points d'intérêt et itinéraire sur une fiche | ☐ | |

**Anomalies et réserves** : plans géoréférencés et délimitation de parcelles
prévus au jalon J3.3.

---

## J1.4 — Mandats et portefeuille propriétaire

**Critères** : un mandat complet est créé, suivi, rattaché à ses lots ;
alertes avant échéance ; restrictions contractuelles enregistrées.

**Preuves** : `test/mandats.e2e-spec.ts`, `mandats-*.spec.ts`, `cron.service.spec.ts`
(alerte d'échéance, une par jour, notification et e-mail au commercial).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Saisie d'un mandat réel de deux ans avec ses lots | ☐ | |
| Réception de l'alerte d'échéance (cloche et e-mail) sur un mandat proche de sa fin | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J1.5 — CRM prospects et clients

**Critères** : un commercial gère son pipeline de bout en bout ; vue personnelle
et vue manager ; vue 360° du client.

**Preuves** : `test/crm.e2e-spec.ts`, `crm*.spec.ts`, `access-scopes.spec.ts`
(un commercial ne voit pas les prospects d'un autre).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Parcours d'un prospect réel du premier contact à la vente | ☐ | |
| Vue manager : tous les prospects de l'équipe | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J1.6 — Ventes, réservations, paiements, commissions, GED de base, espace client

**Critères** : de la fiche prospect à la commission payée, avec traçabilité
complète et sans exposition de données internes ; documents générables ;
espace client sécurisé.

**Preuves** : `test/ventes.e2e-spec.ts` (réservation, paiement, validation,
**refus**, **contre-passation**, annulation avec paiements, documents privés
restant privés, notifications), `ventes-*.spec.ts`, `client-portal.service.spec.ts`,
`test/ged.e2e-spec.ts` (recherche documentaire cloisonnée).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Vente complète d'un terrain réel, jusqu'au paiement de la commission | ☐ | |
| Refus d'un paiement dont le virement est introuvable | ☐ | |
| Contre-passation d'un paiement avec remboursement | ☐ | |
| Document déposé « non public » : absent de l'espace client | ☐ | |
| Décision sur la validation des paiements par une autre personne (paramètre `paiements.validationParUnAutre`) | ☐ | |
| Règles de remboursement de l'acompte à l'annulation, à transcrire dans les conditions de réservation | ☐ | |

**Anomalies et réserves** : **paiement en ligne non implémenté** (décision MTM
en attente) ; les règles de remboursement relèvent de la politique commerciale
de MTM.

---

## J2.1 — Gestion locative

**Critères** : un bail est suivi de la mise en location à la sortie du
locataire ; loyers, caution, relances ; espaces propriétaire et locataire.

**Preuves** : `test/locatif.e2e-spec.ts`, `src/modules/locatif/*.spec.ts`,
notification quotidienne des relances à envoyer.

**Annonces de location sur le site public** (ajout) : un bien se prépare au back-office
(photos, loyer, description), se publie avec la permission `locatif:publier`, apparaît sur la page
« Locations » avec ses filtres et sa fiche, disparaît dès qu’il est loué, et peut être demandé par un
visiteur. Preuves : `test/locations.e2e-spec.ts` (19 scénarios : conditions de publication, aucune donnée
interne exposée, filtres, bien loué masqué, demande), `annonce.helper.spec.ts`, tests du site
(`LocationCard`, filtres, formats).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un bail réel de la signature à la sortie, avec restitution de caution | ☐ | |
| Relance de loyer en retard : calendrier et modèles validés | ☐ | |
| Espace locataire et espace propriétaire : lecture des quittances et des loyers | ☐ | |
| Publication d’un bien réel : photos, loyer, mise en ligne, vérification sur le site (téléphone compris) | ☐ | |
| Demande de visite faite depuis l’annonce : réception par les gestionnaires (cloche et e-mail) | ☐ | |
| Création d’un bail : l’annonce disparaît du site | ☐ | |

**Location à la nuit** (ajout) : séjours de courte durée avec prix par nuit, caution, date de
réservation, durée, règlements, états des lieux d’arrivée et de départ avec photos, et demandes de
résiliation depuis l’espace locataire. Preuves : `test/sejours-resiliation.e2e-spec.ts` (conflits de dates,
demandes simultanées, droits), `src/modules/locatif/sejour*.spec.ts`, `etats-des-lieux*.spec.ts`,
`resiliations*.spec.ts`. Mode d’emploi : `docs/LOCATION_COURTE_DUREE.md`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un séjour réel : réservation, caution, règlement, état des lieux d’arrivée et de départ | ☐ | |
| Deux demandes pour les mêmes dates : la seconde est refusée avec un message clair | ☐ | |
| Demande de résiliation d’un locataire : réception et traitement par le gestionnaire | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J2.2 — Démarches et vérification foncière

**Critères** : une mission est suivie de la demande au rapport final envoyé au
client ; tarifs configurables ; traçabilité des vérifications.

**Preuves** : `test/demarches.e2e-spec.ts`, `src/modules/demarches/*.spec.ts`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Une mission réelle de vérification, rapport PDF consulté par le client | ☐ | |
| Tarifs de vérification validés par la direction | ☐ | |

**Saisie d’un dossier réel** (ajout) : règlements multiples avec frais d’opérateur, facture de mission
en PDF (numérotation configurable, ex. MTM-FAC-VF-001/2026), rapport avec annexe photo facultative,
identité du client réservée à la permission `crm:identite`. Preuves : `test/demarches.e2e-spec.ts`,
`mission-paiements.spec.ts`, `demarches-facture-paiements.spec.ts`, `mission-reference.spec.ts`,
`demarches-documents.service.spec.ts`. Mode d’emploi : `docs/SAISIE_DOSSIER_MISSION.md`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Le dossier réel de test saisi de bout en bout au back-office, comparé aux documents d’origine | ☐ | |
| Facture et rapport PDF : logo, NINEA et mentions légales corrects | ☐ | |
| Format de numérotation validé par la direction | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J2.3 — Construction et suivi de chantier

**Critères** : un chantier est suivi avec journal, planning et alertes de retard
ou de dépassement budgétaire ; espace client.

**Preuves** : `test/construction.e2e-spec.ts`, `src/modules/construction/*.spec.ts`,
notification d'alerte de chantier (cloche et e-mail).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un chantier réel : budget, jalons, journal avec photos | ☐ | |
| Alerte de retard reçue par le responsable | ☐ | |

**Photos, vidéos et pièces** : depuis la saisie d’une journée (photos JPG, PNG, WebP ou vidéo MP4,
10 Mo chacune) et depuis le bloc « Pièces » (plan, permis, devis, contrat, facture, procès-verbal…). Une
pièce reste interne tant qu’elle n’est pas publiée ; publiée avec une journée partagée, elle apparaît dans
l’espace client. Preuves : `test/construction.e2e-spec.ts` (photo rattachée à une journée, cachée puis
publiée, plan PDF, journée d’un autre chantier refusée, types et fichiers dangereux refusés, droits, trace
d’audit), `chantier-fichiers.spec.ts`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Photos ajoutées à une journée réelle, vues sur le téléphone du client après publication | ☐ | |
| Ajout d’un plan et d’un permis, non visibles du client tant qu’ils ne sont pas publiés | ☐ | |

**Anomalies et réserves** : aucune connue. La vue de type Gantt (« si possible » au cahier des charges)
est réalisée dans la fiche du chantier.

---

## J2.4 — Agenda, tâches, workflows, notifications, messagerie

**Critères** : les équipes reçoivent des alertes automatiques et gèrent leurs tâches dans l’outil ;
agenda partagé et individuel ; workflows configurables ; notifications in-app et e-mail (SMS et WhatsApp
selon l’intégration) ; fil de discussion par dossier.

**Preuves** : `test/agenda-taches-messages.e2e-spec.ts` (35 scénarios : tâches confiées, vue d’équipe,
périmètre des dossiers, retard et rappel dédoublonnés, événements privés et partagés, échéances des autres
modules, fils interne et client, limite d’envoi, règles de notification, préférences, parcours),
`notifications-regles.spec.ts` (règles, canaux externes, passerelle), `workflows.service.spec.ts`,
`agenda-utils.spec.ts`, `taches-status.spec.ts`, `regles-notification.spec.ts`, `ClientEchanges.spec.tsx`.
Mode d’emploi : `docs/AGENDA_TACHES_MESSAGES.md`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un manager confie une tâche à un commercial : celui-ci est prévenu, la termine, l’historique le garde | ☐ | |
| Une tâche en retard prévient le responsable et celui qui l’a confiée, une seule fois par jour | ☐ | |
| Un rendez-vous d’équipe avec participants et rappel ; un événement privé reste invisible des autres | ☐ | |
| L’agenda montre les échéances réelles (mandat, loyer, jalon de chantier, visite) de son périmètre | ☐ | |
| Un message au client sur un dossier : visible dans son espace, il répond, l’équipe est prévenue | ☐ | |
| Une note interne n’apparaît jamais dans l’espace client | ☐ | |
| La direction désactive une alerte et change ses destinataires sans développeur | ☐ | |
| Ajout d’une étape « Attente du notaire » au parcours des ventes ; les étapes d’origine restent protégées | ☐ | |
| SMS / WhatsApp : passerelle du prestataire retenu branchée, envoi réel à un numéro de test | ☐ | |

**Anomalies et réserves** : SMS et WhatsApp inactifs tant que MTM n’a pas choisi de prestataire (la
couche d’envoi et son journal sont prêts). Les workflows configurables couvrent les ventes, le pipeline
commercial et les chantiers ; les parcours des missions et des séjours restent définis par leur référentiel.

---

## J3.1 — Comptabilité et finances

**Critères** : recettes, dépenses, commissions, loyers et frais de démarches suivis ; recettes ventilées par
activité ; tableaux de bord financiers (chiffre d’affaires, encaissements, dépenses, marge, impayés,
échéances) ; exports pour l’exploitation comptable externe.

**Preuves** : `test/finances.e2e-spec.ts` (27 scénarios : droits, journal repris des quatre modules sans
les mouvements en attente ou annulés, revenu par activité chiffré à l’unité — marge au prorata, commission de
gestion par bien et par défaut, frais de transfert —, saisies validées par une autre personne, rejets, justificatif,
export CSV et Excel tracé, clôture mensuelle qui fige les totaux et bloque les modules, réouverture motivée),
`finances.calculs.spec.ts` (calculs, périodes, CSV), `finances-utils.spec.ts`. Mode d’emploi et définitions :
`docs/FINANCES.md`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| La direction valide les définitions : encaissements, revenu (marge des ventes, commission de gestion, prestations) | ☐ | |
| Marge renseignée sur les biens vendus ; le revenu de ventes réelles est conforme au calcul de la direction | ☐ | |
| Commission de gestion fixée pour les biens en gérance (taux par bien ou défaut) ; revenu locatif conforme | ☐ | |
| Saisie d’un loyer de bureaux par la comptabilité, validation par la direction, présence dans les totaux | ☐ | |
| Export Excel du mois remis au cabinet comptable : il le reconnaît et l’exploite | ☐ | |
| Clôture d’un mois réel ; une correction à la date d’un mois clôturé est refusée | ☐ | |

**Anomalies et réserves** : la TVA n’est pas gérée ; les paiements d’un client sur un chantier se saisissent
comme recettes ; le format d’export est celui du journal (colonnes décrites dans `docs/FINANCES.md`), à adapter
si le cabinet comptable impose un format d’import précis.

---

## J3.2 — Tableaux de bord et reporting

**Critères** : direction et managers pilotent l’activité par des tableaux de bord fiables, alimentés par des
données réelles ; tableau direction (chiffre d’affaires, ventes, locations, performances, alertes,
tendances), manager (équipe, objectifs, activité, dossiers bloqués), commercial (prospects, pipeline, visites,
ventes, commissions, tâches) ; rapports exportables en PDF et Excel (ventes par période et par zone,
performance commerciale, terrains, loyers et impayés, rentabilité, démarches).

**Preuves** : `test/pilotage.e2e-spec.ts` (27 scénarios : droits de chaque tableau, chiffres exacts de la
direction avec comparaison à la période précédente, classement des commerciaux, occupation et recouvrement,
objectifs et totaux d’équipe, dossiers bloqués et délais réglables, tableau du commercial et cloisonnement,
les sept rapports chiffrés, export PDF et Excel tracé, rapport de plusieurs pages), `pilotage.calculs.spec.ts`,
`rapports-utils.spec.ts`, `test/pilotage-envoi.e2e-spec.ts` (envoi automatique : jour prévu, période écoulée, pièces PDF/Excel, pas de doublon, nouvel essai si le courrier échoue), `envoi-automatique.spec.ts`. Mode d’emploi et définitions : `docs/PILOTAGE.md`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| La direction ouvre son tableau de bord : les chiffres du mois correspondent à ce qu’elle sait de l’activité | ☐ | |
| Les délais de « dossier bloqué » (15, 10, 7, 14, 3 jours) sont validés ou ajustés ; la liste des dossiers bloqués est juste | ☐ | |
| Le manager lit l’activité de son équipe et ouvre le tableau d’un commercial | ☐ | |
| Un commercial retrouve ses relances, visites, objectif et commissions du jour | ☐ | |
| Rapport « Ventes par période » exporté en PDF : mise en page, logo et mentions de MTM conformes | ☐ | |
| Rapport « Loyers et impayés » exporté en Excel : exploitable par la gérance | ☐ | |
| Envoi automatique activé (`pilotage.envoiAutomatique`, SMTP configuré) : la direction reçoit les rapports du lundi / du 1er du mois en pièces jointes | ☐ | |
| Les sept rapports ont été regardés par la direction ; ceux qui ne servent pas sont signalés | ☐ | |

**Anomalies et réserves** : pas de prévisions (hors périmètre) ; l’envoi automatique est désactivé tant que des destinataires ne sont pas renseignés.
Un rapport est limité à 500 lignes de détail. Les chiffres d’équipe portent sur les rôles « commercial » et
« responsable commercial ».

---

## Fonctions ajoutées hors planning (à valider par écrit — §33)

Ces fonctions ne figurent pas au planning d’exécution ; elles sont livrées à la demande de MTM et
doivent être validées avant d’être considérées comme acceptées.

| Fonction | Preuves | Recette MTM | Fait |
| --- | --- | --- | --- |
| Publicités et promotions du bandeau d’accueil (affiche ou vidéo, période de diffusion) | `test/promotions.e2e-spec.ts`, `promotion-status.spec.ts` | Publier une promotion réelle et la voir sur téléphone | ☐ |
| Page « Notre équipe » et contenus du site administrables | `content-block.service.spec.ts` | Saisie des vrais membres | ☐ |
| Import des biens depuis un tableur | `lecture-tableur.spec.ts`, `docs/IMPORT_TABLEUR.md` | Import d’un vrai fichier | ☐ |
| Identité de l’entreprise sur tous les PDF (logo, NINEA, RCCM, capital, banque) | `test/entreprise.e2e-spec.ts`, `societe.spec.ts` | Saisie des vraies mentions, aperçu PDF contrôlé, logo téléversé | ☐ |
| Boîtes de confirmation communes du back-office | `confirm-dialog.spec.ts` | Suppression d’une pièce : message clair, bouton nommé | ☐ |
| Propriétés (villa divisée, immeuble, résidence) : plusieurs logements, synthèse d’occupation et de loyers, rattachement d’un bien, taux de gestion transmis aux logements, lien sur le site public | `immeubles.service.spec.ts`, `immeubles.helper.spec.ts`, `biens.service.spec.ts`, `AutresLogements.spec.tsx` | Créer une vraie villa avec ses appartements, vérifier la fiche, l’annonce publique et un relevé de gestion | ☐ |
| Coordonnées des propriétaires réservées à l’administrateur, matricule PRO-AAAA-NNNN | `coordonnees.spec.ts`, `proprietaires.service.spec.ts` | Vérifier ce que voit chaque rôle sur une fiche propriétaire | ☐ |
| Suivi anonyme des visites du site et fréquentation par bien (sans cookie, équipe exclue) | `visites.service.spec.ts` | Comparer les chiffres à Cloudflare Analytics sur une semaine | ☐ |
| Session du back-office : fin des déconnexions intempestives (renouvellement unique, tolérance de rotation) | `auth.service.spec.ts`, `renouvellement-session.service.spec.ts` | Travailler une journée entière sans retour à la page de connexion | ☐ |
| Refonte des pages Démarches, Locations, Réalisations et Projets à venir, FAQ, référencement (plan du site, aperçus, données structurées) | `BandeauDemarches.spec.tsx`, `CarteDemarche.spec.tsx`, `FaqDemarches.spec.tsx`, `LocationCard.spec.tsx` | Relire les textes et les photos sur téléphone ; contrôler dans Search Console | ☐ |

---

## Modèle de fiche de signature (à reproduire pour chaque jalon)

```
Jalon :                         Date de la démonstration :
Participants MTM :              Participants développement :

Critères d'acceptation vérifiés :     ☐ tous   ☐ avec réserves (voir ci-dessous)
Anomalies relevées :
  1. …  → décision : ☐ corrigée avant validation  ☐ réserve acceptée, à corriger avant le …

Décision :   ☐ Jalon validé     ☐ Jalon refusé (nouvelle recette le …)

Pour MTM Immobilier                         Pour le développeur
Nom / fonction :                            Nom :
Date / signature :                          Date / signature :
```
