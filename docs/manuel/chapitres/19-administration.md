---
id: administration
titre: Administration du back-office
groupe: metier
resume: Comptes, rôles, paramètres, parcours des dossiers, identité de l’entreprise, notifications, journal d’audit.
roles: administrateur direction
---

Ce chapitre s’adresse aux **administrateurs** (et à la **direction** pour certains écrans). Le menu **Administration** contient : *Accès* (utilisateurs, rôles), *Parcours des dossiers*, *Identité de l’entreprise*, *Règles de notification*, *Paramètres*, *Journal d’audit*.

> **Important** — Un compte **administrateur** doit avoir la **double authentification** activée. Toutes vos actions sont **tracées** dans le journal d’audit : agissez avec soin.

## Les utilisateurs

**Administration › Accès › Utilisateurs** : les comptes qui accèdent au back-office. Chaque personne a un **rôle** qui définit ce qu’elle peut voir et faire.

![Utilisateurs](img/adm-01-utilisateurs.png)

- Les **tuiles** : comptes **actifs**, comptes **à surveiller** (2FA à activer ou mot de passe provisoire non changé), comptes **désactivés**.
- Les onglets **Tous / Actifs / À surveiller / Désactivés**, et la recherche.
- Par ligne : le **rôle**, l’**accès** (actif…), la **sécurité** (2FA activée ou non), la **dernière connexion**.

### Créer un compte

![Nouvel utilisateur](img/adm-09-nouvel-utilisateur.png)

1. **Nouvel utilisateur.**
2. **Prénom**, **nom**, **adresse e-mail** (elle sert d’identifiant) et **rôle**.
3. Le **mot de passe provisoire** est généré (**Générer** en propose un autre, **Copier** le copie). Il respecte les règles : 12 caractères minimum avec majuscule, minuscule, chiffre et caractère spécial.
4. **Créer le compte**, puis **transmettez le mot de passe** à la personne par un canal sûr. Elle devra **le changer à sa première connexion**.

> **Attention** — Pour les rôles sensibles (direction, administrateur, comptabilité, RH), demandez à la personne d’activer sa **2FA** dès la première connexion : sans elle, les fonctions sensibles lui sont fermées.

### Modifier, désactiver, supprimer

- Le **crayon** modifie le nom, le rôle ou l’état du compte.
- Le bouton **désactiver** coupe l’accès **sans perdre l’historique** : c’est le bon geste quand quelqu’un quitte l’entreprise.
- La **corbeille** supprime définitivement (à réserver aux comptes créés par erreur).
- Pour une personne qui a **perdu son téléphone**, utilisez l’action **« Réinitialiser le 2FA (téléphone perdu) »** sur la ligne de son compte ; elle en recréera une.
- Vous ne pouvez pas **désactiver ni supprimer votre propre compte**.

## Les rôles et permissions

**Administration › Accès › Rôles & permissions** : un rôle est un **ensemble de droits** « module : action » (consulter, créer, modifier, valider, publier, payer, exporter, administrer…). **Modifier un rôle change les droits de tous ses utilisateurs.**

![Rôles et permissions](img/adm-02-roles.png)

- Chaque carte résume les droits du rôle par module, le nombre d’utilisateurs et de permissions.
- Les rôles **Système** (administrateur…) ne se suppriment pas.
- Le badge **2FA obligatoire** signale les rôles qui doivent activer la double authentification.
- **Nouveau rôle** crée un rôle sur mesure ; **attribuez-lui ensuite ses permissions**.

Le tableau complet des droits par rôle est dans le chapitre *Qui peut faire quoi*.

## Les paramètres

**Administration › Paramètres** : les **listes de valeurs** (statuts, types, étapes) et les **règles** (durées, taux) utilisées par les écrans. Une modification s’applique **immédiatement à toute l’équipe** et est **tracée**.

![Paramètres](img/adm-03-parametres.png)

- Le menu de gauche range les paramètres par **thème** : Général, Terrains, Mandats, Prospects (CRM), Missions/factures/références, Gestion locative, Ventes/réservations/paiements ; le compteur « 7/7 » dit combien sont **personnalisés**. Les réglages plus récents (finances, pilotage, notifications) se trouvent dans **Avancé › Hors catalogue**, où la **recherche** les retrouve.
- **Modifier** change une valeur ; un paramètre **sur valeur par défaut** (non enregistré) utilise le réglage d’origine de l’application.
- **Paramètre libre** ajoute une clé hors catalogue (rarement utile).
- Les paramètres **sensibles** ne sont visibles que si vous avez le droit d’administrer.

Réglages utiles à connaître :

| Réglage | Rôle |
| --- | --- |
| `pilotage.seuilsBlocage` | Jours sans mouvement au-delà desquels un dossier est dit **bloqué** (`{"vente":15,"mission":10,"chantier":7,"prospect":14,"tache":3}`) |
| `pilotage.envoiAutomatique` | **Envoi automatique de rapports par e-mail** (voir ci-dessous) |
| `finances.tauxGestionDefaut` | Commission de gestion par défaut (en %) |
| `finances.categoriesDepenses` / `categoriesRecettes` | Catégories proposées aux saisies |
| `finances.doubleValidation` | Exige qu’une saisie soit validée par une autre personne |
| `notifications.documentManquantJours` | Jours avant l’alerte « document manquant » d’un dossier réservé |
| Numérotation des missions et factures | Formats `MTM-{code}-{seq:3}/{annee}` et `MTM-FAC-…` |
| Gestion locative | **Préavis** de résiliation (30 jours par défaut) |

> Un paramètre qui a une **page dédiée** (Identité de l’entreprise, Parcours des dossiers) ne se modifie **plus** dans cette page : elle le refuse pour éviter les contradictions.

### Activer l’envoi automatique des rapports

Réglage **`pilotage.envoiAutomatique`**, désactivé par défaut. Exemple :

```
{"actif":true,"frequence":"hebdomadaire","rapports":["rentabilite_activite","ventes_periode"],"formats":["pdf"],"destinataires":["direction@mtm.sn"]}
```

- **frequence** : `hebdomadaire` (chaque lundi, semaine écoulée) ou `mensuelle` (le 1er du mois, mois précédent).
- **formats** : `pdf`, `xlsx`.
- **rapports** : `ventes_periode`, `ventes_zone`, `performance_commerciaux`, `terrains_etat`, `loyers_impayes`, `rentabilite_activite`, `activite_demarches`.
- **destinataires** : adresses e-mail (20 au plus). **Activer exige au moins un rapport et un destinataire** ; une valeur invalide est **refusée à l’enregistrement**.
- Il faut que l’**e-mail du serveur (SMTP)** soit configuré.

## Les parcours des dossiers

**Administration › Parcours des dossiers** : les **étapes** que suit chaque type de dossier — ventes, pipeline commercial, chantiers.

![Parcours des dossiers](img/adm-04-parcours.png)

- Vous pouvez **ajouter des étapes** propres à MTM, les **remettre dans l’ordre** (flèches), et **autoriser de nouveaux passages** d’une étape à une autre (liste « Peut passer à… »).
- Les étapes **d’origine** (cadenas) **ne se retirent pas** : le système s’en sert pour calculer les soldes, conclure une vente ou réceptionner un chantier.
- Une étape ajoutée **ne peut pas être retirée** tant que des dossiers s’y trouvent (le compteur « 1 dossier » le dit).

## L’identité de l’entreprise

**Administration › Identité de l’entreprise** : le **logo** et les **mentions légales** (dénomination, forme juridique, capital, **NINEA**, **RCCM**, banque, mention de pied de page) s’impriment en **en-tête et en pied de page de tous les documents générés** : factures, rapports, contrats, quittances.

![Identité de l’entreprise](img/adm-05-identite.png)

1. **Téléverser un logo** (JPG, PNG ou WebP, 2 Mo au maximum, carré de préférence).
2. Renseignez les mentions : **NINEA** et **RCCM** en priorité.
3. **Voir un aperçu PDF** pour contrôler le rendu avant de généraliser.

> Le téléversement du logo suppose que le stockage de fichiers du serveur (Cloudinary) soit configuré.

## Les règles de notification

**Administration › Règles de notification** : pour chaque **événement**, **qui est prévenu** et par **quels canaux** (e-mail, SMS, WhatsApp).

![Règles de notification](img/adm-06-regles-notification.png)

- Chaque événement a un interrupteur **Actif**, un **groupe de destinataires** (« Encadrement commercial », « Valideurs des ventes et paiements »…) et des cases **E-mail / SMS / WhatsApp**.
- **Enregistrer** applique le changement aux **prochaines alertes** ; **Revenir aux réglages d’origine** annule vos règles.
- **SMS et WhatsApp** ne partent que si une **passerelle d’envoi** est branchée sur le serveur (`SMS_WEBHOOK_URL`, `WHATSAPP_WEBHOOK_URL`). Sans elle, rien ne part même si la case est cochée.
- Chacun peut **couper l’e-mail pour lui-même** dans *Mes notifications*.

## Le journal d’audit

**Administration › Journal d’audit** : l’historique de **toutes les actions sensibles** — qui, quand, quoi, avant/après, avec le **motif** quand il est exigé.

![Journal d’audit](img/adm-07-audit.png)

- Filtrez par **recherche**, **période**, **module**, **élément**.
- Un clic sur une ligne ouvre le **détail** (valeurs avant et après).
- L’**export** du journal exige un motif, lui-même consigné.

## L’import de biens

**Immobilier › Biens › Importer depuis Excel** (voir le chapitre *Mandats, propriétaires et biens*) : reprend en masse le tableur des biens, avec un aperçu avant écriture.

## Les bonnes pratiques d’administration

- **Un compte par personne, un rôle par fonction.** Ne créez pas de compte partagé.
- **Désactivez** (ne supprimez pas) le compte d’une personne qui part, **le jour même**.
- N’attribuez le rôle **administrateur** qu’à quelques personnes de confiance.
- Avant de modifier un **paramètre**, notez sa valeur d’origine : le journal d’audit la conserve, mais un retour en arrière reste manuel.
- Vérifiez régulièrement **« À surveiller »** dans la liste des utilisateurs et le **journal d’audit**.
