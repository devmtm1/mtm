# Suivi des protocoles et des signatures

Module « Protocoles » du back-office (menu **Protocoles**), qui répond au cahier des charges *Suivi des dossiers clients, des protocoles et des signatures*.

## Ce que fait le module

- **Classement numérique** : chaque protocole est rattaché à un dossier (vente, bail ou chantier) ; le document préparé et la copie signée sont des documents du dossier (types `protocole` et `protocole_signe`).
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

1. `prisma migrate deploy` (migrations `20261118170000_protocoles_signatures`, `20261119120000_protocoles_suivi_depuis` et `20261123100000_protocoles_autres_dossiers_signature_en_ligne`) puis le seed (ressource, rôle, permissions). La seconde fixe le début du suivi à la date du déploiement : ajustez-le dans Paramètres si MTM veut suivre aussi des dossiers plus anciens.
2. Attribuer le rôle `secretaire` aux comptes concernés dans le back-office.

## Ventes, baux et chantiers

Un protocole se rattache à **un seul** dossier : une vente, un bail locatif ou un chantier (contrainte en base `protocoles_un_seul_dossier`). La fenêtre « Nouveau protocole » demande d'abord le type de dossier, puis propose les dossiers correspondants (`GET /protocoles/dossiers-possibles`).

- Les pièces d'un protocole de vente restent des documents du dossier de vente ; celles d'un bail ou d'un chantier sont stockées dans `protocoles_fichiers` (versionnées, privées sur Cloudinary).
- Le suivi, les statuts, les rappels, la recherche, les filtres et l'export valent pour les trois types. La liste a un filtre « Dossier » (ventes, baux, chantiers).
- L'alerte « paiement reçu – signature manquante » et ses compteurs ne concernent que les **ventes** (c'est là que les paiements du cahier des charges sont suivis). Les montants ne sont affichés que pour une vente.
- Espace client : le protocole d'une vente s'affiche dans la carte du dossier ; ceux d'un **bail** (compte locataire) et d'un **chantier** (compte client) s'affichent en tête de « Mes dossiers » (`GET /protocoles/client/mes-protocoles`), avec la même étape simple.

## Canaux : e-mail, SMS, WhatsApp

- Quand un protocole passe à « envoyé », le client est prévenu dans son espace et par e-mail ; par SMS ou WhatsApp s'il les a choisis **et** qu'un fournisseur est configuré (`SMS_PROVIDER`, `WHATSAPP_PROVIDER`), comme pour ses paiements.
- Dans la fiche du protocole, la secrétaire dispose de boutons « WhatsApp », « E-mail » et « Appeler » pré-remplis pour relancer le client sans fournisseur.
- Les alertes internes (rappels, paiement sans signature) restent des notifications du back-office et des e-mails.

## Formats de fichier

PDF, JPEG, PNG, WebP et Word (.docx), 10 Mo au plus. Le contenu est contrôlé (signature binaire), pas seulement l'extension. Tous ces formats sont couverts par les tests ; une copie signée prise en photo (JPEG) est acceptée.

## Acceptation en ligne par le client (signature électronique simple)

**Désactivée par défaut** (réglage `protocoles.signatureEnLigne`, booléen, dans Paramètres). Une fois activée, le client voit « Lire et accepter en ligne » sur un protocole envoyé (vente, bail ou chantier) : il lit le document, saisit son nom complet et coche « j'ai lu et j'accepte ».

- MTM conserve : la date, le nom saisi, l'adresse de connexion, l'appareil et l'**empreinte SHA-256 du document** déposé (calculée au dépôt). La preuve s'affiche dans la fiche du protocole.
- Le protocole passe à « signé par le client » (date de réception = date d'acceptation), l'historique et le journal d'audit le notent, l'équipe est prévenue. Une seule acceptation est possible ; le document doit avoir été déposé avec le dépôt d'après cette version (sinon pas d'empreinte, pas d'acceptation en ligne).
- **À valider par le conseil juridique de MTM avant activation** : il s'agit d'une signature électronique *simple*, pas d'une signature qualifiée ou avancée (Yousign, DocuSign…). Pour les actes qui exigent la forme authentique ou une signature qualifiée, la copie signée reste nécessaire.

## Limites connues

- Les copies signées sont stockées sur Cloudinary ; voir `docs/BACKUP.md`.
- Envoi automatique par SMS/WhatsApp : dépend de la configuration d'un fournisseur (non vérifiable hors production).
- L'alerte « paiement reçu – signature manquante » ne concerne que les ventes : pour un bail ou un chantier, la règle (quel paiement, quel seuil) reste à définir avec le DG.
- L'empreinte est celle du fichier déposé ; le lien de lecture du client pointe vers ce même fichier.
