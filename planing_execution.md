

Mtm immobilier planning jalons backlog · MD
MTM Immobilier — Planning d'exécution en jalons & Backlog complet
Document à proposer à la direction MTM Immobilier — base de discussion et de validation, conformément à la section 30 du cahier des charges.

Hypothèse de calendrier : démarrage à S1 (semaine 1). Remplacer par les dates réelles une fois validé. Durées en semaines pleines de travail, pour un développeur unique.

Durée totale estimée : ~52-56 semaines (12-13 mois), répartie en 4 phases et 16 jalons. Chaque jalon = démonstration + livrable fonctionnel + liste d'anomalies + validation écrite avant passage au suivant (exigence section 30).

Vue d'ensemble
Phase	Jalons	Durée	Période indicative
Phase 0 — Fondations	J0.1	3 semaines	S1 → S3
Phase 1 — Cœur commercial	J1.1 à J1.6	~17 semaines	S4 → S20
Phase 2 — Élargissement	J2.1 à J2.5	~16 semaines	S21 → S36
Phase 3 — Pilotage	J3.1 à J3.3	~10 semaines	S37 → S46
Phase 4 — Durcissement & transfert	J4.1 à J4.2	~8 semaines	S47 → S54
PHASE 0 — Fondations techniques
Jalon J0.1 — Socle technique et sécurité de base (3 semaines)
Objectif : avoir une API sécurisée, un système de rôles fonctionnel, et un environnement de travail propre — rien de "métier" encore.

Backlog :

 Dépôt Git créé sous propriété du compte MTM (org/compte dédié, pas personnel)
 Environnements séparés : développement, test, production (section 27)
 Gestion des secrets et variables d'environnement : secrets stockés hors du dépôt, séparation des clés par environnement, rotation et accès limité
 Architecture backend (API centralisée) initialisée + structure modulaire
 Base de données PostgreSQL provisionnée, schéma initial, gestion des migrations
 Authentification (email/mot de passe), politique de mots de passe, gestion de session
 Double authentification (2FA) pour comptes admin/sensibles, avec politique de récupération de compte sécurisée (section 27)
 Modèle de rôles et permissions granulaires : consulter, créer, modifier, valider, supprimer, exporter, payer, publier, administrer (section 24)
 Rôles initiaux configurables : administrateur, direction, manager, responsable commercial, commercial, comptable, resp. gestion locative, resp. démarches, resp. construction, RH (section 24)
 Journal d'audit : utilisateur, date/heure, action, objet, ancienne/nouvelle valeur, ressource concernée, justification si action sensible (section 24)
 Contrôle des accès par rôle : règles de lecture/écriture/validation/export sur les modules clés, limitation des exports de données sensibles
 Module de paramétrage général (taux de commission, délais, statuts, régions — modifiable sans code) (section 25)
 Sauvegardes automatiques + test réel de restauration sur un jeu de données test
 Politique de conservation des logs et documents : durée d'archivage, règles de suppression sécurisée, traçabilité de la rétention
 CI de base (build + tests automatiques à chaque push)
 Vérification de santé des services : health checks API, DB, session/auth, services critiques
 Procédure de reprise après incident : documentation de l’hébergement, du dépôt, des accès admin, des variables, des comptes cloud, des clés API, des backups
 Documentation technique initiale (architecture, conventions de code)
Livrable : back-office vide mais navigable, avec connexion sécurisée, rôles opérationnels, paramètres modifiables par un admin, et une base de sécurité et de traçabilité exploitables.

Critère de validation :
- un administrateur MTM peut se connecter avec une session sécurisée ;
- créer un utilisateur, lui attribuer un rôle et des permissions ;
- activer ou tester la 2FA pour un compte sensible ;
- voir l'action tracée dans le journal d'audit avec ancien/nouveau contexte ;
- restaurer une sauvegarde de test sans perte de données critiques ;
- vérifier qu'un utilisateur sans permission ne peut ni exporter ni modifier les données sensibles ;
- confirmer que les secrets ne sont pas présents dans le dépôt ni dans les fichiers de configuration versionnés.

Audit de conformité Phase 0

Le socle technique est bien conforme à la logique du cahier des charges en termes d'architecture, sécurité de base, rôles, audit et paramétrage. Il reste néanmoins indispensable de renforcer la gouvernance de sécurité avant le démarrage de la Phase 1.

Points de conformité :
- architecture backend centralisée conforme à la logique API unique ;
- base PostgreSQL + migrations conformes à la section 12 ;
- rôles et permissions conformes à la section 24 ;
- journal d'audit conforme à la demande de traçabilité ;
- politique de sauvegarde, CI, environnement séparé, documentation technique conformes à la section 27 et 29.

Points à durcir avant la Phase 1 :
- gouvernance des secrets et clés d'environnement ;
- procédure de 2FA et récupération de compte validée ;
- règles d'export de données sensibles ;
- politique de rétention des logs et documents ;
- procédure de reprise après incident documentée et testée ;
- validation de restauration de backup réelle, pas seulement théorique.

Critère d'acceptation de sortie de Phase 0 :
- le back-office est navigable ;
- un admin peut créer et gérer des comptes ;
- un admin peut affecter des rôles et permissions ;
- l'audit fait apparaître les actions critiques ;
- la restauration de backup est validée ;
- les données internes sont protégées par le mécanisme de permissions ;
- les données sensibles ne sont pas stockées dans le dépôt.

Corrections appliquées / éléments manquants ajoutés dans la Phase 0

1. Sécurité des secrets et des environnements
- variables d'environnement séparées par environnement ;
- stockage hors dépôt ;
- accès restreint aux comptes admin/métier ;
- rotation des clés et revue d'accès régulière.

2. Sécurité des comptes
- politique de mots de passe renforcée ;
- blocage après échecs répétés ;
- récupération de compte sécurisée ;
- 2FA obligatoire pour les comptes sensibles ;
- sessions sécurisées et expirables.

3. Protection des données et des accès
- permissions granulaires sur lecture, écriture, validation, export, suppression ;
- restriction des exports de données internes ;
- contrôle explicite des accès au back-office et aux fichiers documentaires ;
- séparation claire entre données publiques, internes et sensibles.

4. Audit et traçabilité
- historique complet des actions critiques : création, modification, validation, suppression, export, paiement, rôle, document ;
- identifiant utilisateur, horodatage, ancienne/nouvelle valeur, objet, justification ;
- journal exploitable pour la revue de conformité et la recette.

5. Sauvegarde, restauration et continuité
- sauvegardes automatiques ;
- test de restauration réel sur jeu de données de test ;
- politique de conservation et de suppression sécurisée ;
- procédure de reprise après incident documentée et partagée avec MTM.

6. Qualité de service et stabilité
- health checks API, DB et services critiques ;
- CI de base avec build et tests automatiques ;
- vérification de l'état des services avant ouverture du module métier suivant.

7. Gouvernance de livraison
- documentation technique initiale ;
- responsabilité claire du compte MTM pour hébergement, comptes, clés API et dépôt ;
- définition explicite des critères d'acceptation avant passage à la Phase 1.

PHASE 1 — Cœur commercial (priorité 1 du cahier des charges)
Jalon J1.1 — Module terrains (3 semaines)
Backlog (section 8) :

 Fiche terrain interne complète : référence, parcelle/matricule, propriétaire, statut juridique, localisation, GPS, superficie, dimensions, prix d'acquisition, prix public, marge, commission, statut commercial
 Statuts juridiques configurables (titre foncier, bail, délibération, morcellement, régularisation en cours, etc.)
 Niveau de vérification + documents justificatifs associés
 Caractéristiques de commercialisation (accès routier, eau, électricité, voisinage, vocation)
 Historisation des modifications sensibles (utilisateur, date, ancienne/nouvelle valeur, justification)
 Upload photos, vidéos, plans, documents
 Liste et recherche/filtres des terrains en back-office
Livrable : un commercial peut créer une fiche terrain complète et la faire évoluer avec traçabilité.

Jalon J1.2 — Site public : accueil, catalogue, fiche terrain (3 semaines)
Backlog (sections 5, 6, 7) :

 Arborescence du site : Accueil, À propos, Nos terrains, Gestion locative, Construction, Démarches, Projets à venir, Réalisations, Actualités, Contact, Espace client
 Page d'accueil : en-tête, hero avec CTA, recherche rapide (zone, type, superficie, budget, statut), terrains mis en avant, sections projets/réalisations/témoignages/contact
 Catalogue de terrains : cartes cliquables (image, référence, localisation, superficie, statut, prix public)
 Fiche terrain publique : galerie, description, caractéristiques, carte interactive, points d'intérêt, boutons "Demander une visite / Demander des informations / Réserver"
 Contrôle strict : aucune donnée interne (prix d'acquisition, marge, commission, notes) exposée côté public
 Contenus marketing administrables depuis le back-office (terrains mis en avant, actualités, témoignages, textes)
 Responsive (mobile, tablette, desktop)
 Formulaire de contact / demande en ligne
Livrable : site public consultable, connecté aux vraies données terrains, sans fuite d'information interne.

Jalon J1.3 — Cartographie de base (1,5 semaine)
Backlog (section 9) :

 Intégration cartographique interactive (Leaflet/OSM ou Mapbox)
 Affichage des terrains sur carte avec coordonnées GPS
 Points d'intérêt et itinéraires basiques
Livrable : les terrains sont localisables visuellement sur la fiche publique et en back-office.

Jalon J1.4 — Mandats et portefeuille propriétaire (2,5 semaines)
Backlog (section 10) :

 Fiche mandat : propriétaire, lots concernés, dates début/fin, type, exclusivité, prix/conditions, commissions, clauses, statut
 Alertes configurables avant échéance de mandat
 Suivi : lots confiés/disponibles/réservés/vendus, chiffre d'affaires, commissions, reste à commercialiser
 Enregistrement des restrictions contractuelles (ex. interdiction de vente directe par le propriétaire pendant la période)
 Documents liés au mandat (contrat, avenants, preuves de signature, correspondances)
Livrable : un mandat complet peut être créé, suivi, et rattaché à ses lots.

Jalon J1.5 — CRM prospects/clients (2,5 semaines)
Backlog (section 13) :

 Fiche contact : identité, coordonnées, pays de résidence, source d'acquisition, besoins, budget, commercial responsable
 Pipeline commercial configurable (nouveau contact → qualification → proposition → visite → négociation → réservation → vente / perdu)
 Relances, rappels, rendez-vous, tâches liés au contact
 Vue personnelle (commercial) + vue manager
 Vue 360° : regroupement de tous les dossiers d'un même client
Livrable : un commercial gère son pipeline de prospects de bout en bout dans l'outil.

Jalon J1.6 — Vente, réservation, paiement, commissions, GED de base, espace client (5 semaines)
Backlog (sections 11, 12, 17 partiel, 4 partiel) :

 Dossier de vente : client, terrain, mandat, commercial, prix, commission, statut
 Statuts configurables (disponible, pré-réservé, réservé, en cours, paiement partiel, soldé, annulé…)
 Réservation : acompte configurable, durée de blocage, conditions d'annulation
 Paiements : espèces (si autorisé), virement, en ligne — historique (date, montant, mode, référence, justificatif)
 Calcul automatique : montant payé, solde restant, échéances
 Documents générables : bon de réservation, reçu, facture, contrat, état de paiement
 Règles de commission paramétrables (pourcentage, montant fixe, paliers, bonus)
 Workflow de validation des commissions
 Tableau de bord commercial : ventes, objectifs, commissions estimées/validées/payées
 GED de base : upload/consultation de documents liés à un dossier, classement par client/terrain/vente
 Espace client (portail) : dossiers, documents, paiements, réservations — accès sécurisé
Livrable de la Phase 1 : MTM peut vendre un terrain de bout en bout — de la fiche prospect à la commission payée — avec traçabilité complète et sans exposition de données internes au public.

→ Recette métier complète de la phase 1 avant de démarrer la Phase 2.

PHASE 2 — Élargissement des activités
Jalon J2.1 — Gestion locative (4 semaines)
Backlog (section 15) :

 Fiche bien locatif : propriétaire, adresse, type, loyer, charges, caution, contrat, locataire
 Gestion des baux et échéances
 Paiements : avance, normal, partiel, retard, impayé, régularisation — solde recalculé automatiquement
 Caution : montant, statut, retenues, remboursement, historique
 Sortie : préavis, état des lieux, calcul de régularisation, clôture
 Cas particuliers gérés par statuts/workflows (départ sans préavis, impayé prolongé, changement de locataire)
 Relances automatiques configurables
 Espace propriétaire (loyers, dépenses, solde, rapports) et espace locataire (bail, quittances, paiements, incidents)
Livrable : un bail complet peut être suivi de la mise en location à la sortie du locataire.

Jalon J2.2 — Démarches administratives et vérification foncière (3 semaines)
Backlog (section 14) :

 Étape 1 — Demande : client, terrain, type de vérification, objectif, pièces, urgence
 Étape 2 — Étude de faisabilité (facturation paramétrable)
 Étape 3 — Vérification physique (visite, constat, photos/vidéos, GPS)
 Étape 4 — Vérification administrative (administrations consultées par localisation)
 Étape 5 — Rapport (conclusion, pièces, réserves, décision favorable/défavorable/à compléter)
 Génération et archivage du rapport, accessible depuis l'espace client
 Traçabilité complète (qui, quand, quels documents, quelles observations)
 Tarifs de vérification configurables
Livrable : une mission de vérification foncière peut être suivie de la demande au rapport final envoyé au client.

Jalon J2.3 — Construction et suivi de chantier (3 semaines)
Backlog (section 16) :

 Projet de construction : client, terrain, programme, devis, budget, planning
 Journal de chantier : date, intervenants, avancement, photos/vidéos, décisions
 Planning avec jalons (vue Gantt si possible), alertes retards/dépassements budgétaires
 Espace client : consultation d'avancement et rapports
Livrable : un chantier peut être suivi avec journal, planning et alertes.

Jalon J2.4 — Agenda, tâches, workflow, notifications (2,5 semaines)
Backlog (sections 21, 22) :

 Agenda partagé et individuel (visites, rendez-vous, échéances, réunions)
 Tâches assignables (responsable, priorité, date limite, statut)
 Workflow standard configurable par module (création → qualification → validation → clôture)
 Notifications internes (nouveau prospect, paiement reçu, impayé, échéance de mandat…)
 Canal in-app + email (SMS/WhatsApp en option selon disponibilité d'intégration)
 Messagerie interne / fil de discussion par dossier
Livrable : les équipes reçoivent des alertes automatiques et gèrent leurs tâches dans l'outil.

Jalon J2.5 — Application mobile Android/iOS (3,5 semaines)
Backlog (section 26) :

 Fonctions client mobile : consultation biens, espace personnel, documents, paiements, réservations, notifications
 Fonctions agent terrain : missions, carte, navigation GPS, capture photo/vidéo, formulaires de visite, rapport
 Rattachement automatique GPS + médias au dossier concerné
 Mode hors-ligne avec file d'attente de synchronisation sécurisée
 Publication Android (Play Store) et iOS (App Store)
Livrable de la Phase 2 : MTM gère location, vérifications foncières et chantiers dans le système, avec les agents terrain équipés en mobile.

PHASE 3 — Pilotage et intelligence
Jalon J3.1 — Comptabilité et finances (3 semaines)
Backlog (section 18) :

 Suivi recettes, dépenses, factures, virements, commissions, loyers, frais
 Ventilation des recettes par activité (vente, locatif, démarches, construction)
 Tableaux de bord financiers : CA, encaissements, dépenses, marge, impayés, échéances
 Exports pour comptabilité externe
Jalon J3.2 — Tableaux de bord et reporting (3 semaines)
Backlog (section 23) :

 Dashboard direction (CA, ventes, locations, performances, alertes, tendances)
 Dashboard manager (équipe, objectifs, dossiers bloqués)
 Dashboard commercial (pipeline, visites, ventes, commissions)
 Rapports exportables PDF/Excel (ventes par période/zone, performance commerciale, terrains disponibles/vendus, loyers, impayés, rentabilité)
Jalon J3.3 — Automatisations, cartographie avancée, RH/partenaires (4 semaines)
Backlog (sections 19, 20, 9 avancé, 22 avancé) :

 Automatisation des relances et alertes d'échéance
 Plans géoréférencés / délimitations de parcelles, vue satellite
 Fiche collaborateur RH complète, suivi objectifs/performances
 Base partenaires (notaires, géomètres, architectes, banques…) avec historique et évaluations
Livrable de la Phase 3 : direction et managers pilotent l'activité via des tableaux de bord fiables, alimentés par des données réelles.

PHASE 4 — Durcissement et transfert (continu, avec un focus dédié en fin de projet)
Jalon J4.1 — Sécurité et fiabilité (4 semaines)
Backlog (section 27, 29, 32) :

 Audit de sécurité complet (permissions, exposition de données, injections, sessions)
 Chiffrement en transit et au repos vérifié
 Tests de charge sur les fonctions critiques
 Tests de non-régression complets
 Tests de restauration de sauvegarde réels (pas seulement documentés)
 Vérification qu'aucun document/lien client n'est exposé publiquement par erreur
Jalon J4.2 — Documentation, propriété et transfert de compétences (4 semaines)
Backlog (sections 28, 31) :

 Documentation technique complète (architecture, API, base de données)
 Documentation utilisateur par module
 Vérification/transfert : hébergement, dépôt de code, comptes cloud, bases de données, clés API, comptes admin — tous sous propriété MTM
 Livraison du code source complet + scripts de migration
 Formation des équipes MTM (utilisateurs clés par module)
 Procédure de retour arrière et de reprise après incident documentée et testée
Livrable final : MTM peut faire fonctionner, sauvegarder et faire évoluer le système sans dépendre d'une seule personne — conformément au critère d'acceptation de la section 36.

Comment utiliser ce document avec MTM
Présenter la vue d'ensemble (tableau des phases) en premier — donne le cadre global sans noyer sous le détail
Faire valider Phase 0 + Phase 1 dans le détail (c'est là que se joue le retour sur investissement le plus rapide)
Garder les Phases 2, 3, 4 volontairement indicatives à ce stade — elles seront réajustées une fois les retours utilisateurs de la Phase 1 connus
À la fin de chaque jalon, produire : une démo courte, la liste des anomalies connues, et faire signer une validation écrite avant de démarrer le jalon suivant — c'est ce qui te protège en cas de désaccord sur le périmètre plus tard
Toutes les durées sont indicatives pour un développeur seul à temps plein ; à ajuster après les 2-3 premières semaines réelles.



