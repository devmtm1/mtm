---
id: administrateur
titre: Guide de l’administrateur
soustitre: Créer les comptes, régler les droits, paramétrer l’application et garder la main sur la sécurité du back-office de MTM.
role: Administrateur
public: Administrateurs du back-office de MTM Immobilier
version: Octobre 2026
---

## Ce guide en deux minutes

Ce guide est **le vôtre** : il couvre ce que fait un **administrateur** du back-office. Vous êtes la personne qui **donne les accès**, **règle les listes et les règles** de l’application et **surveille ce qui s’y passe**. Vous avez aussi tous les droits des autres rôles.

**À la fin de la lecture, vous saurez :**

- créer, modifier, désactiver un compte, et aider quelqu’un qui a perdu son accès ;
- comprendre et modifier les **rôles** et leurs droits ;
- régler les **paramètres**, les **étapes des dossiers**, l’**identité de l’entreprise** ;
- décider **qui est prévenu de quoi**, par quel canal ;
- lire l’**historique des actions** pour savoir qui a fait quoi ;
- tenir une routine de sécurité simple.

> **Important** — Un compte administrateur doit avoir la **double authentification** activée. **Toutes vos actions sont tracées** dans l’historique des actions : agissez avec soin. Un réglage modifié s’applique **immédiatement à toute l’équipe**.

## Se connecter et activer la double authentification

1. Saisissez votre **e-mail** et votre **mot de passe**, puis **Se connecter**.
2. À la première connexion, choisissez un **nouveau mot de passe** : 12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.
3. Le back-office vous demande ensuite d’activer la **double authentification (2FA)** : après le mot de passe, un **code à 6 chiffres** généré par une application sur votre téléphone (Google Authenticator, Microsoft Authenticator…).

**Pour l’activer :** **votre nom (en haut à droite) › Sécurité et mot de passe**, scannez le QR code, saisissez le premier code.

![Sécurité du compte](img/14-securite.png)

> **Attention** — **Conservez les codes de secours** affichés à l’activation : ils servent si vous perdez votre téléphone. Sans 2FA, un compte administrateur ne peut pas utiliser les fonctions sensibles (paramètres, exports…).

## Découvrir l’écran

![Les zones de l’écran](img/02-accueil.png)

| Zone | À quoi elle sert |
| --- | --- |
| **Menu à gauche** | Un sujet = une ligne ; ses pages sont les **onglets** en haut de l’écran. |
| **Barre de recherche** | Un dossier, un contact, ou une **page** par son nom : <kbd>Ctrl</kbd> + <kbd>K</kbd>. |
| **Cloche** | Vos alertes. |
| **Point d’interrogation** | Ouvre ce guide. |
| **Votre nom** | Notifications, sécurité, paramètres, déconnexion. |

### La rubrique Administration

Elle est **repliée au départ** : cliquez sur son titre pour la déplier. Elle compte **trois lignes**, chacune avec ses **onglets** :

| Ligne | Onglets |
| --- | --- |
| **Utilisateurs et accès** | **Utilisateurs**, **Rôles et droits d’accès**, **Historique des actions** |
| **Réglages** | **Paramètres**, **Identité de l’entreprise**, **Étapes des dossiers**, **Règles de notification**, **Alertes et rapports automatiques** |
| **Site web** | **Contenus du site**, **Réalisations & projets**, **Publicités du bandeau**, **Équipe du site**, **Actualités et conseils** |

Les autres rubriques (Commercial, Biens, Location et services, Pilotage et finances) vous sont ouvertes comme à la direction.

## Les utilisateurs

**Administration › Utilisateurs et accès › Utilisateurs** : les comptes qui accèdent au back-office. Chaque personne a un **rôle**, qui définit ce qu’elle voit et ce qu’elle peut faire.

![Utilisateurs](img/adm-01-utilisateurs.png)

- Les **cartes de chiffres** : comptes **actifs**, comptes **à surveiller** (2FA à activer ou mot de passe provisoire non changé), comptes **désactivés**.
- Les onglets **Tous / Actifs / À surveiller / Désactivés**, et la recherche.
- Par ligne : le **rôle**, l’**accès**, la **sécurité** (2FA activée ou non), la **dernière connexion**.

### Créer un compte

1. **Nouvel utilisateur.**
2. **Prénom**, **nom**, **adresse e-mail** (elle sert d’identifiant) et **rôle**.
3. Le **mot de passe provisoire** est généré (**Générer** en propose un autre, **Copier** le copie).
4. **Créer le compte**, puis **transmettez le mot de passe** à la personne par un canal sûr (en main propre ou par message privé, **jamais dans un groupe**). Elle devra le changer à sa première connexion.

![Nouvel utilisateur](img/adm-09-nouvel-utilisateur.png)

> **Attention** — Pour les rôles sensibles (**direction, administrateur, comptabilité, RH**), demandez à la personne d’activer sa **2FA dès la première connexion**.

### Modifier, désactiver, supprimer

- Le **crayon** modifie le nom, le rôle ou l’état du compte.
- **Désactiver** coupe l’accès **sans perdre l’historique** : c’est le bon geste quand quelqu’un quitte l’entreprise.
- La **corbeille** supprime définitivement : à réserver aux comptes créés **par erreur**.
- **Téléphone perdu ?** Utilisez **Réinitialiser le 2FA (téléphone perdu)** sur la ligne du compte : la personne en recréera une.
- Vous ne pouvez pas **désactiver ni supprimer votre propre compte**.

### Check-list d’arrivée et de départ

**Arrivée d’un collaborateur**

1. Créer le compte avec le **bon rôle**.
2. Transmettre le mot de passe provisoire par un canal sûr.
3. Pour un rôle sensible, vérifier au bout de quelques jours que la **2FA est activée** (carte **À surveiller**).
4. Lui donner le guide de son métier.

**Départ d’un collaborateur**

1. **Désactiver le compte le jour même** (ne pas supprimer).
2. Faire **réaffecter** ses prospects, biens et tâches par un responsable.
3. Vérifier dans l’**historique des actions** qu’aucune action inhabituelle n’a eu lieu les derniers jours.

## Les rôles et droits d’accès

**Administration › Utilisateurs et accès › Rôles et droits d’accès** : un rôle est un **ensemble de droits** du type « module : action » (consulter, créer, modifier, valider, publier, payer, exporter, administrer…).

![Rôles et droits d’accès](img/adm-02-roles.png)

> **Important** — **Modifier un rôle change les droits de tous ses utilisateurs.** Vérifiez le nombre d’utilisateurs concernés (affiché sur la carte du rôle) avant d’enregistrer.

- Chaque carte résume les droits du rôle par module, le nombre d’utilisateurs et de droits.
- Les rôles **Système** (administrateur…) ne se suppriment pas.
- Le badge **2FA obligatoire** signale les rôles qui doivent activer la double authentification.
- **Nouveau rôle** crée un rôle sur mesure ; **attribuez-lui ensuite ses droits**.

### Les rôles prévus

| Rôle | Pour qui | 2FA |
| --- | --- | --- |
| **Administrateur** | Comptes, rôles, paramètres, historique | **Obligatoire** |
| **Direction** | Chiffres, rapports, finances | **Obligatoire** |
| **Manager** | Encadre les activités | — |
| **Responsable commercial** | Chef d’équipe commerciale | — |
| **Commercial** | Prospects, ventes, biens | — |
| **Comptable** | Contrôle des encaissements, paiement des commissions | **Obligatoire** |
| **Responsable gestion locative** | Biens loués | — |
| **Responsable démarches** | Vérifications et démarches | — |
| **Responsable construction** | Chantiers | — |
| **RH** | Ressources humaines | **Obligatoire** |

Les **clients, propriétaires et locataires** ont un **espace client** séparé : ce ne sont pas des rôles du back-office.

### Les règles des deux regards

Pour limiter les erreurs et la fraude, l’application impose que **deux personnes différentes** interviennent :

| Opération | Qui saisit | Qui valide |
| --- | --- | --- |
| **Paiement d’une vente** | Le commercial | Comptabilité, responsable, direction (jamais l’auteur) |
| **Commission** | Estimée par le responsable | **Validée par le manager**, **payée par la comptabilité** une fois le dossier soldé |
| **Saisie financière** | Toute personne habilitée | Une **autre** personne |
| **Dépense de chantier** | Le responsable des chantiers | La comptabilité |
| **Loyer encaissé** | La gestion locative | Une personne habilitée |

> **À retenir** — **Un compte par personne, un rôle par fonction.** Ne créez jamais de compte partagé : l’historique ne pourrait plus dire qui a fait quoi. N’attribuez le rôle **administrateur** qu’à quelques personnes de confiance.

## Les paramètres

**Administration › Réglages › Paramètres** : les **listes de valeurs** (statuts, types, étapes) et les **règles** (durées, taux) utilisées par les écrans. Une modification s’applique **immédiatement à toute l’équipe** et est **tracée**.

![Paramètres](img/adm-03-parametres.png)

- Le menu de gauche range les paramètres par **thème** : Général, Terrains, Mandats, Prospects (CRM), Missions/factures/références, Gestion locative, Ventes/réservations/paiements. Le compteur « 7/7 » dit combien sont **personnalisés**. Les réglages plus récents (finances, pilotage, notifications) se trouvent dans **Avancé › Hors catalogue**, où la **recherche** les retrouve.
- **Modifier** change une valeur ; un paramètre sur **valeur par défaut** utilise le réglage d’origine de l’application.
- **Paramètre libre** ajoute une clé hors catalogue (rarement utile).

Quelques réglages utiles :

| Réglage | Rôle |
| --- | --- |
| `finances.tauxGestionDefaut` | Commission de gestion par défaut (en %) |
| `finances.categoriesDepenses` / `categoriesRecettes` | Catégories proposées aux saisies |
| `finances.doubleValidation` | Exige qu’une saisie soit validée par une autre personne |
| `notifications.documentManquantJours` | Jours avant l’alerte « document manquant » d’un dossier réservé |
| Numérotation des missions et factures | Formats `MTM-{code}-{seq:3}/{annee}` et `MTM-FAC-…` |
| Gestion locative | **Préavis** de résiliation (30 jours par défaut) |

> **Attention** — **Avant de modifier un paramètre, notez sa valeur d’origine** : l’historique la conserve, mais un retour en arrière reste manuel. Un paramètre qui a une **page dédiée** (Identité de l’entreprise, Étapes des dossiers, Alertes et rapports automatiques) ne se modifie plus dans cette page.

## Les étapes des dossiers

**Administration › Réglages › Étapes des dossiers** : les **étapes** que suit chaque type de dossier (ventes, pipeline commercial, chantiers).

![Étapes des dossiers](img/adm-04-parcours.png)

- **Ajouter** des étapes propres à MTM, les **remettre dans l’ordre** (flèches), **autoriser de nouveaux passages** d’une étape à une autre (liste « Peut passer à… »).
- Les étapes **d’origine** (cadenas) **ne se retirent pas** : le système s’en sert pour calculer les soldes, conclure une vente ou réceptionner un chantier.
- Une étape ajoutée **ne peut pas être retirée** tant que des dossiers s’y trouvent (le compteur « 1 dossier » le dit).

## L’identité de l’entreprise

**Administration › Réglages › Identité de l’entreprise** : le **logo** et les **mentions légales** (dénomination, forme juridique, capital, **NINEA**, **RCCM**, banque, pied de page) s’impriment en **en-tête et pied de page de tous les documents générés** : factures, rapports, contrats, quittances.

![Identité de l’entreprise](img/adm-05-identite.png)

1. **Téléverser un logo** (JPG, PNG ou WebP, 2 Mo au maximum, carré de préférence).
2. Renseignez les mentions : **NINEA** et **RCCM** en priorité.
3. **Voir un aperçu PDF** pour contrôler le rendu avant de généraliser.

## Les règles de notification

**Administration › Réglages › Règles de notification** : pour chaque **événement**, **qui est prévenu** et par **quels canaux** (e-mail, SMS, WhatsApp).

![Règles de notification](img/adm-06-regles-notification.png)

- Chaque événement a un interrupteur **Actif**, un **groupe de destinataires** (« Encadrement commercial », « Valideurs des ventes et paiements »…) et des cases **E-mail / SMS / WhatsApp**.
- **Enregistrer** applique le changement aux **prochaines alertes**. **Revenir aux réglages d’origine** annule vos règles.
- Le **bandeau bleu** en haut de l’écran dit **quel canal est inactif** : sans fournisseur configuré sur le serveur, rien ne part même si la case est cochée.
- Chacun peut **couper l’e-mail pour lui-même** et choisir ses canaux dans **son nom › Mes notifications**.

### Si les e-mails ou les SMS ne partent pas

Passez dans cet ordre :

1. **La règle** : l’événement est-il **Actif**, avec le **bon groupe** et le **canal coché** ?
2. **La personne** : dans **Mes notifications**, a-t-elle activé le canal ? Pour un SMS ou WhatsApp, son **numéro est-il saisi avec l’indicatif du pays** (`+221…`) ?
3. **Le bandeau bleu** de l’écran des règles signale-t-il un canal inactif ? Si oui, c’est un réglage du **serveur** : prévenez l’équipe technique.
4. **Les SMS** sont payés **à l’unité** chez le fournisseur : si le solde est épuisé, les envois échouent. Rechargez le compte.
5. **L’e-mail est parti mais n’arrive pas ?** Demandez au destinataire de regarder ses **spams** et signalez le message comme **non-spam**. Si cela se répète, prévenez l’équipe technique : l’authentification du domaine d’envoi doit être vérifiée.

## Alertes et rapports automatiques

**Administration › Réglages › Alertes et rapports automatiques** (direction et administrateurs) regroupe deux réglages.

![Alertes et rapports automatiques](img/adm-11-pilotage-reglages.png)

### Dossiers bloqués

Cinq champs, un par type de dossier (vente, mission, chantier, prospect, tâche) : le **nombre de jours** sans mouvement au-delà duquel le dossier est signalé « bloqué » (vue Équipe et tableau de bord de la direction). Valeurs : des **jours entiers de 1 à 365**. **Enregistrer les délais** applique le changement tout de suite et le consigne dans l’historique.

### Envoi automatique des rapports

- **Interrupteur** : actif ou non (désactivé par défaut).
- **Fréquence** : chaque lundi (semaine écoulée) ou le 1er du mois (mois précédent).
- **Rapports à envoyer** : cochez ceux voulus. **Format** : PDF, Excel, ou les deux.
- **Destinataires** : une adresse e-mail par ligne, vingt au plus.
- **M’envoyer un essai** : envoie un exemplaire à **votre seule adresse** pour vérifier le contenu et la messagerie.
- **Derniers envois** : date, période, rapports et nombre de destinataires des envois réellement partis.

Activer l’envoi exige **au moins un rapport et un destinataire**.

## L’historique des actions

**Administration › Utilisateurs et accès › Historique des actions** : toutes les **actions sensibles** — **qui, quand, quoi**, valeurs **avant et après**, avec le **motif** quand il est exigé.

![Historique des actions](img/adm-07-audit.png)

- Filtrez par **recherche**, **période**, **module**, **élément**.
- Un clic sur une ligne ouvre le **détail** (valeurs avant et après).
- L’**export** exige un motif, lui-même consigné.

> **À retenir** — C’est votre outil de **contrôle** : consultez-le régulièrement, en particulier après le départ d’un collaborateur ou en cas de doute sur une modification.

## Le site web

**Administration › Site web** regroupe ce que les visiteurs lisent sur le **site public** : **Contenus du site** (textes page par page), **Réalisations & projets**, **Publicités du bandeau**, **Équipe du site**, **Actualités et conseils** (vidéos : titre, rubrique, fichier MP4 de 100 Mo maximum ou lien YouTube, puis publication).

![Contenus du site](img/web-02-contenus.png)

- Un contenu n’apparaît sur le site **qu’une fois publié**.
- Relisez avant de publier : le texte est visible de tous.

Les messages envoyés par les visiteurs arrivent dans **Commercial › Demandes du site**.

## L’import de biens depuis un tableur

**Biens › Biens à vendre › Importer depuis Excel** reprend en masse un tableur de biens, **avec un aperçu avant écriture**.

![Import de biens](img/adm-08-import-biens.png)

1. Déposez le fichier **.xlsx** ou **.csv** (5 Mo et 5 000 lignes au maximum).
2. **Aperçu** : biens à créer, déjà présents, lignes refusées avec la raison. **Rien n’est écrit à ce stade.**
3. **Importer N biens** pour confirmer. Les biens arrivent en **Brouillon** : relisez-les avant de les publier.

Seules les colonnes **LOCALITE** et **TITRE JURIDIQUE** sont indispensables. L’import ne touche jamais à un bien déjà présent, et chaque import est consigné dans l’historique.

## Une routine de sécurité simple

**Chaque semaine (10 minutes)**

1. **Utilisateurs**, onglet **À surveiller** : 2FA à activer, mots de passe provisoires jamais changés. Relancez les personnes concernées.
2. **Historique des actions** : parcourez les actions de la semaine, en particulier suppressions, exports et changements de droits.

**Chaque mois**

1. Passez en revue la liste des **comptes actifs** : y a-t-il des personnes parties dont le compte est encore ouvert ?
2. Vérifiez que seuls les bons rôles ont les droits **administrer** et **exporter**.

**À chaque départ**

- **Désactiver le compte le jour même.**

## Questions fréquentes

**Quelqu’un a oublié son mot de passe.**
Le lien **Mot de passe oublié ?** de la page de connexion lui envoie un e-mail. Sans e-mail reçu, donnez-lui un mot de passe provisoire : **Utilisateurs**, le **crayon** de sa ligne, champ **Nouveau mot de passe provisoire (facultatif)** (le bouton **Générer** en propose un). Elle devra le changer à sa prochaine connexion.

**Quelqu’un est bloqué après plusieurs erreurs.**
Le compte se débloque **tout seul au bout de quelques minutes**. Sinon, vérifiez son état dans **Utilisateurs**.

**Une personne a perdu son téléphone (2FA).**
Elle peut utiliser un **code de secours**. Sinon, **Réinitialiser le 2FA (téléphone perdu)** sur la ligne de son compte, puis elle en recrée une.

**Quelqu’un n’a pas accès à un menu.**
C’est une question de **rôle**. Vérifiez son rôle dans **Utilisateurs**, puis les droits du rôle dans **Rôles et droits d’accès**. Ne donnez pas un rôle plus large « pour dépanner » : créez plutôt un rôle sur mesure.

**Un export demande un motif.**
Tout export est **tracé** : le motif est conservé dans l’historique des actions.

**Un mois comptable clôturé doit être corrigé.**
Passez la correction **à la date du jour** par une saisie inverse, ou demandez à la direction de **rouvrir** le mois (un motif est exigé).

**Je ne vois pas un réglage dans Paramètres.**
Les réglages récents sont dans **Avancé › Hors catalogue** : utilisez la **recherche**.

## Aide-mémoire

**Les cinq règles de l’administrateur**

1. **Un compte par personne**, un rôle par fonction.
2. **Désactiver** (jamais supprimer) le compte d’une personne qui part, **le jour même**.
3. **Activer la 2FA** pour les rôles sensibles.
4. **Noter la valeur d’origine** avant de modifier un paramètre.
5. **Consulter l’historique des actions** régulièrement.

**Où cliquer**

| Je veux… | J’ouvre… |
| --- | --- |
| Créer un compte | **Administration › Utilisateurs et accès › Utilisateurs › Nouvel utilisateur** |
| Aider quelqu’un qui a perdu son 2FA | **Utilisateurs** › la ligne › **Réinitialiser le 2FA** |
| Changer les droits d’un rôle | **Utilisateurs et accès › Rôles et droits d’accès** |
| Modifier une liste ou une règle | **Réglages › Paramètres** |
| Décider qui est prévenu | **Réglages › Règles de notification** |
| Régler les rapports automatiques | **Réglages › Alertes et rapports automatiques** |
| Mettre le logo et le NINEA | **Réglages › Identité de l’entreprise** |
| Voir qui a fait quoi | **Utilisateurs et accès › Historique des actions** |
| Trouver n’importe quoi | <kbd>Ctrl</kbd> + <kbd>K</kbd> |
