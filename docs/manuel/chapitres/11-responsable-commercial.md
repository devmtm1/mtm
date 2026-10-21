---
id: responsable-commercial
titre: Piloter l’équipe commerciale
groupe: metier
resume: Suivre l’activité de chaque commercial, fixer les objectifs, débloquer les dossiers, valider les commissions.
roles: responsable_commercial direction
---

Ce chapitre s’adresse aux **responsables commerciaux, managers et à la direction**. Il complète le chapitre *Le travail du commercial* : vous voyez ce que voient vos commerciaux, **et toute l’équipe**.

## Le tableau de bord « Équipe »

Au lieu de « Mon activité », vous arrivez sur **Équipe** (un onglet **Mon activité** reste disponible si vous suivez vous-même des prospects).

![Vue Équipe](img/resp-01-tableau-equipe.png)

**Les quatre tuiles** (période : *Ce mois-ci* ou *Mois précédent*) :

| Tuile | Ce qu’elle dit |
| --- | --- |
| **Ventes soldées** | Les ventes conclues sur la période, avec leur montant. |
| **Objectif de ventes** | Le taux d’atteinte de l’équipe (« 1 sur 4 · 1 commercial avec objectif »). |
| **Relances en retard** | Le nombre de relances et de tâches en retard dans l’équipe. |
| **Dossiers bloqués** | Les dossiers qui n’ont plus bougé depuis trop longtemps (voir plus bas). |

**Le tableau « Équipe commerciale »** donne, pour chaque personne : prospects actifs, relances en retard, visites, ventes, chiffre d’affaires, commissions estimées, tâches en retard, atteinte de l’objectif. **Cliquez sur un nom** : vous ouvrez le tableau de cette personne, tel qu’elle le voit, pour l’aider.

> Les ventes comptées ici sont celles **soldées** sur la période. L’objectif, lui, compte les **dossiers engagés** (réservés, en paiement ou soldés) du mois. Les deux se lisent avec leur libellé.

### Les dossiers bloqués

Un dossier **encore ouvert** dont plus rien ne bouge depuis un délai. Un « mouvement » est une modification, mais aussi un paiement, une étape, une relance : ce qui avance par ses pièces n’est pas signalé comme bloqué.

| Dossier | Bloqué quand… | Délai par défaut |
| --- | --- | --- |
| Vente | ni modification, ni paiement, ni réservation, ni document | 15 jours |
| Mission | ni modification, ni étape, ni règlement | 10 jours |
| Chantier en cours | aucune journée saisie ni modification | 7 jours |
| Prospect actif | aucune activité ni visite, ni modification | 14 jours |
| Tâche | échéance dépassée de plus de… | 3 jours |

Les délais se règlent dans **Administration › Paramètres** (réglage `pilotage.seuilsBlocage`). Chaque dossier bloqué de la liste est **cliquable**.

## Les objectifs

**Commercial › Objectifs** : les cibles du mois par commercial et leur taux d’atteinte.

![Objectifs commerciaux](img/resp-02-objectifs.png)

- Naviguez de mois en mois avec les flèches, ou saisissez le mois.
- **Fixer un objectif** : choisissez le commercial, puis la cible de **ventes**, de **chiffre d’affaires** et de **commissions** pour le mois.
- Le bandeau bleu signale les commerciaux **sans objectif** ; **Reprendre les cibles du mois précédent** les recopie en un clic.
- Chaque carte montre l’avancement avec un **repère de rythme** : « en retard sur le rythme » compare à la part du mois déjà écoulée.

Définitions : **ventes** = dossiers réservés, en paiement ou soldés dans le mois ; **chiffre d’affaires** = paiements **validés** ; **commissions** = validées ou payées. Un commercial sans cible n’a ni taux d’atteinte ni suivi sur son tableau de bord.

## Les prospects de toute l’équipe

Là où un commercial ne voit que les siens, **vous voyez tous les prospects**.

![Prospects de l’équipe](img/resp-03-prospects-equipe.png)

- Le filtre **Commercial** isole les prospects d’une personne.
- Le bloc **Performance par commercial** (à déplier) donne ventes conclues, taux de conversion et chiffre d’affaires.
- **Exporter** produit un fichier de la liste (un motif est demandé et conservé dans l’historique des actions).

### Affecter un prospect à un commercial

Sur la fiche : la flèche **⌄** à droite de **Modifier** › **Affecter un commercial**. Utile quand un prospect arrive du site sans responsable, ou pour répartir la charge.

### Affecter un bien

Un commercial ne voit que **les biens dont il est responsable**. Pour qu’il puisse en présenter un, affectez-le dans la **fiche du bien** (champ *commercial responsable*).

## Les ventes de l’équipe

**Commercial › Ventes** montre tous les dossiers.

![Dossiers de vente](img/resp-04-ventes-equipe.png)

Dans un dossier, vous pouvez :

- **Valider ou refuser un paiement** enregistré par un commercial (boutons **Valider** / **Refuser** sur la ligne du paiement). Le refus demande un **motif**, conservé sur le paiement.
- Gérer la **commission** : elle est **estimée** par le responsable, **validée par le manager (jamais par son auteur)**, puis **payée par la comptabilité** une fois le dossier soldé.
- **Changer le statut** du dossier, jusqu’à **Soldé**.

> **Important** — On ne valide pas ses propres paiements ni ses propres commissions. C’est la règle des deux regards : l’application l’impose.

## Les tâches et l’agenda de l’équipe

Avec la permission d’**administrer** les tâches et l’agenda (responsables, manager, direction), vous voyez et **réassignez** les tâches de toute l’équipe, et consultez **l’agenda de l’équipe**. Utilisez-le pour répartir la charge après une absence.

## Une routine hebdomadaire

1. **Lundi** : ouvrez *Équipe*, regardez les **relances en retard** et les **dossiers bloqués** ; appelez les personnes concernées.
2. **Chaque jour** : validez les **paiements** et **commissions** en attente.
3. **Fin de mois** : vérifiez les objectifs, puis **fixez ceux du mois suivant** (« Reprendre les cibles du mois précédent » fait l’essentiel).
4. **Vendredi** : regardez le **pipeline** : combien de prospects en négociation ? en réservation ?
