---
id: droits
titre: Qui peut faire quoi
groupe: reference
resume: Les droits de chaque rôle, module par module, et les règles des deux regards.
roles: tous
---

Chaque personne a **un rôle**. Le rôle définit **ce qu’elle voit** (menus, fiches) et **ce qu’elle peut faire**. Si un bouton ou un menu manque chez vous, c’est que votre rôle ne le prévoit pas : demandez à un administrateur si vous en avez besoin.

## Comment lire les tableaux

Les droits sont des couples « module : action » :

| Lettre | Action | Sens |
| --- | --- | --- |
| **V** | Consulter | Voir |
| **C** | Créer | Ajouter une fiche |
| **M** | Modifier | Changer une fiche |
| **Val** | Valider | Valider un paiement, une saisie, un mandat… |
| **P** | Payer | Encaisser, payer une commission, restituer une caution |
| **Pub** | Publier | Mettre en ligne ou rendre visible au client |
| **E** | Exporter | Produire un fichier de données (avec un motif) |
| **Adm** | Administrer | Droit complet sur le module, y compris pour toute l’équipe |
| **S** | Supprimer | Supprimer définitivement |

« Tout » = tous les droits du module. « — » = le module n’apparaît pas pour ce rôle.

## Les rôles du back-office

| Rôle | Pour qui | Double authentification |
| --- | --- | --- |
| **Administrateur** | Gère comptes, rôles, paramètres, journal | **Obligatoire** |
| **Direction** | Pilote l’entreprise : chiffres, rapports, finances | **Obligatoire** |
| **Manager** | Encadre les activités | — |
| **Responsable commercial** | Chef d’équipe commerciale | — |
| **Commercial** | Prospects, ventes, biens | — |
| **Comptable** | Contrôle des encaissements, paiement des commissions | **Obligatoire** |
| **Responsable gestion locative** | Gestion des biens loués | — |
| **Responsable démarches** | Vérifications et démarches | — |
| **Responsable construction** | Chantiers | — |
| **RH** | Ressources humaines | **Obligatoire** |

Les **clients**, **propriétaires** et **locataires** ont un espace séparé (leur « espace client ») : ce ne sont pas des rôles du back-office.

## Droits par module

| Module | Administrateur | Direction | Manager | Resp. commercial | Commercial |
| --- | --- | --- | --- | --- | --- |
| **Prospects (CRM)** | Tout | V C M E S + identité | V C M E S + identité | V C M E S + identité | V C M (les siens) |
| **Biens** | Tout | V C M Val Pub E, Adm | V C M Val Pub E | V C M Val Pub E | V C M (les siens) |
| **Mandats** | Tout | V C M Val E, Adm | V C M Val E | V C M Val | V C M |
| **Propriétaires** | Tout | V C M | V C M S | V C M S | V C |
| **Ventes et paiements** | Tout | V C M Val P Pub E + financier, Adm | V C M Val Pub E + financier, Adm | V C M Val Pub E + financier, Adm | V C M (les siens) |
| **Demandes web** | Tout | V M S | V M S | V M | V M |
| **Vérifications** | Tout | V C M Val Pub E S, Adm | V C M Val Pub E, Adm | V C M Val Pub | V C M |
| **Gestion locative** | Tout | V C M Val P Pub E S, Adm | V C M Val P Pub E, Adm | V C M E (les siens) | V C M E (les siens) |
| **Chantiers** | Tout | V C M Val P Pub E S, Adm | V C M Val P Pub E, Adm | — | — |
| **Finances** | Tout | V C M Val E, Adm | V | — | — |
| **Rapports** | Tout | V E, Adm | V E | V | — |
| **Contenu du site** | Tout | V C M Pub S, Adm | V C M Pub S | V | — |
| **Tâches, agenda** | Tout | V C M S, Adm | V C M S, Adm | V C M S, Adm | V C M |
| **Utilisateurs, rôles, paramètres** | Tout | — | — | — | — |
| **Journal d’audit** | Tout | V E | — | — | — |
| **Règles de notification** | Tout | Adm | — | — | — |

| Module | Comptable | Resp. gestion locative | Resp. démarches | Resp. construction | RH |
| --- | --- | --- | --- | --- | --- |
| **Prospects (CRM)** | — | — | V + identité | — | — |
| **Biens** | V + financier | V | V | V | — |
| **Mandats** | V | — | — | — | — |
| **Propriétaires** | — | V | — | — | — |
| **Ventes et paiements** | V M Val P E + financier | — | — | — | — |
| **Vérifications** | V | — | V C M Val Pub E | — | — |
| **Gestion locative** | V Val P E | V C M Val P Pub E | — | — | — |
| **Chantiers** | V Val P E | — | — | V C M Val P Pub E | — |
| **Finances** | V C M Val E | — | — | — | — |
| **Rapports** | V E | — | — | — | — |
| **Tâches, agenda, messages** | V C M | V C M | V C M | V C M | V C M |

> Les droits des commerciaux s’appliquent **à leur périmètre** : un commercial ne voit que **ses** prospects, **ses** biens et **ses** dossiers de vente — avec, dans ses dossiers, **ses** paiements et **sa** commission. Pour proposer un bien ou ouvrir un dossier, il accède en revanche à **tous les biens disponibles**. L’encadrement (responsable commercial, manager, direction) voit **tout le monde**.

## Les règles des deux regards

Pour limiter les erreurs et la fraude, l’application impose que **deux personnes différentes** interviennent :

| Opération | Qui saisit | Qui valide |
| --- | --- | --- |
| **Paiement d’une vente** | Le commercial | Comptabilité, responsable, direction (jamais l’auteur) |
| **Commission** | Estimée par le responsable | **Validée par le manager** (jamais son auteur), **payée par la comptabilité** une fois le dossier soldé |
| **Saisie financière** | N’importe qui avec le droit de saisir | Une **autre** personne que l’auteur |
| **Dépense de chantier** | Le responsable des chantiers | La comptabilité |
| **Loyer encaissé** | La gestion locative | Une personne habilitée |

## Ce qui est tracé

Toute action sensible laisse une trace dans le **journal d’audit** : création, modification, validation, export, connexion, changement de droits. L’**export** d’un rapport ou d’une liste exige un **motif**, conservé avec l’export.
