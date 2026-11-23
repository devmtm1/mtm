# Suivi des protocoles et des signatures

Module « Protocoles » du back-office (menu **Protocoles**), qui répond au cahier des charges *Suivi des dossiers clients, des protocoles et des signatures*.

## Ce que fait le module

- **Classement numérique** : chaque protocole est rattaché à un dossier de vente ; le document préparé et la copie signée sont des documents du dossier (types `protocole` et `protocole_signe`).
- **Dépôt par la secrétaire** : création d'un protocole, dépôt du document préparé, puis de la copie signée.
- **Suivi des signatures** : statuts `a_preparer`, `prepare_a_verifier`, `envoye`, `en_attente_signature`, `signe_client`, `signe_mtm`, `a_valider_direction`, `valide`, `a_corriger`, `annule`. Les transitions autorisées sont définies dans `apps/api/src/modules/protocoles/protocoles.regles.ts`.
- **« Envoyé » n'est pas « signé »** : passer à `signe_client` exige la copie signée déposée et la date de réception. Un motif est obligatoire pour `a_corriger` et `annule`.
- **Validation Direction** : seule la permission `protocoles:valider` peut passer un protocole à `valide` ou le corriger depuis `a_valider_direction`.
- **Alerte « PAIEMENT REÇU – SIGNATURE MANQUANTE »** : un dossier non annulé qui a un paiement (validé ou en attente) mais aucun protocole signé déclenche une notification à la création du paiement et un bandeau sur la page.
- **Rappels** : tous les jours à 08:00 (Africa/Dakar), un protocole envoyé sans retour signé au-delà du délai est rappelé, puis de nouveau à chaque période. Délai réglable dans Paramètres (`protocoles.delaiRappelJours`, 7 jours par défaut).
- **Tableau de bord Direction** : indicateurs cliquables (sans signature, en retard, incomplets, à valider, en attente), filtres collaborateur, période, statut et recherche, export Excel/PDF (permission `protocoles:exporter`).
- **Traçabilité** : dépôts, changements de statut et consultations (`protocole.viewed`) sont inscrits au journal d'audit ; chaque protocole a son historique.

- **Fiche du dossier de vente** : le protocole et l'alerte sont rappelés en haut de la fiche (pour qui a le droit de consulter les protocoles), avec un lien vers la page Protocoles filtrée sur le dossier.
- **Tableau de bord principal** : deux indicateurs, « Paiements sans signature » et « Signatures à valider », cliquables.
- **Espace client** : le client voit, dans « Mes dossiers », l'étape de son protocole (en préparation, à signer, signé, validé). Il ne voit jamais les statuts internes, les motifs de correction, ni un protocole annulé.
- **Début du suivi** : le réglage `protocoles.suiviDepuis` (Paramètres, format AAAA-MM-JJ) exclut les dossiers plus anciens de l'alerte et des compteurs « sans signature » et « incomplets ». La migration le fixe au jour de la mise en service, pour que l'historique ne remonte pas d'un coup. Videz-le pour suivre tous les dossiers. Les protocoles saisis restent toujours visibles dans la liste.

## Droits

Ressource `protocoles` : `consulter`, `creer`, `modifier`, `valider`, `exporter`. Nouveau rôle **secrétaire**. La Direction reçoit la validation et l'export.

`protocoles:consulter` ouvre **tous les dossiers de vente** (le suivi porte sur l'ensemble), et rien de plus : ni les commissions des autres commerciaux, ni les totaux financiers globaux, ni les demandes de réservation du site, ni les performances d'un commercial. Ces vues restent réservées au périmètre de supervision (`VentesAccessService.hasGlobalScope`) ; la règle est verrouillée par des tests.

## Mise en production

1. `prisma migrate deploy` (migrations `20261118170000_protocoles_signatures` et `20261119120000_protocoles_suivi_depuis`) puis le seed (ressource, rôle, permissions). La seconde fixe le début du suivi à la date du déploiement : ajustez-le dans Paramètres si MTM veut suivre aussi des dossiers plus anciens.
2. Attribuer le rôle `secretaire` aux comptes concernés dans le back-office.

## Limites connues (à revoir avec le DG)

- Périmètre : dossiers de **vente** uniquement.
- Pas de canal WhatsApp pour les alertes (notifications du back-office et e-mail selon les préférences).
- Pas de signature électronique : la copie signée est numérisée puis déposée.
- Le dépôt n'a été testé qu'avec des PDF.
- Les copies signées sont stockées sur Cloudinary ; voir `docs/BACKUP.md`.
