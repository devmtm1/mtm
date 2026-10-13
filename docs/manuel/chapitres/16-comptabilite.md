---
id: comptabilite
titre: Comptabilité et finances
groupe: metier
resume: Encaissements, revenu réel de MTM, dépenses, saisies à deux, clôture mensuelle et export pour la comptabilité.
roles: comptabilite direction administrateur
---

Le module **Finances** pilote l’argent de MTM : **ce qui est encaissé, ce que MTM gagne réellement, ce qu’elle dépense, ce qu’il lui reste à encaisser**, et prépare les **exports pour la comptabilité externe**. Ce n’est **pas** un logiciel de comptabilité : pas de plan comptable, de bilan ni de TVA.

Le menu **Finances** contient : *Tableau de bord*, *Journal*, *Saisies*, *Clôtures*.

## Deux notions à ne pas confondre

- **Encaissements** : l’argent reçu. Il comprend les loyers (qui reviennent aux propriétaires) et le prix des biens vendus.
- **Revenu de MTM** : ce qui reste réellement à MTM.

| Activité | Revenu de MTM | Dépenses reprises |
| --- | --- | --- |
| **Vente de biens** | La **marge** du bien (fiche du bien), reconnue **au prorata de chaque paiement validé** : 5 M payés sur 10 M de prix = la moitié de la marge | Commissions de commerciaux payées |
| **Gestion locative** | La **commission de gestion** (taux du bien, ou taux par défaut) sur les loyers et séjours encaissés | — |
| **Démarches** | Les règlements reçus pour la prestation | Frais de transfert (Wave, Orange Money, banque) |
| **Construction** | Les recettes saisies à la main (paiements du client) | Dépenses de chantier validées |
| **Général** | Les autres recettes saisies | Dépenses de fonctionnement saisies |

**Résultat = revenu − dépenses.** Un bien vendu **sans marge renseignée** compte pour zéro (le tableau de bord le signale) : renseignez prix d’acquisition et prix public dans la fiche du bien.

## Le tableau de bord financier

![Tableau de bord financier](img/compta-01-tableau.png)

- Boutons de période : *Ce mois-ci*, *Mois précédent*, *Ce trimestre*, *Cette année*, *12 derniers mois*.
- Quatre tuiles : **Encaissements**, **Revenu de MTM**, **Dépenses**, **Résultat**, chacune comparée à la **période précédente de même durée**.
- Le bandeau orange rappelle les **opérations à valider** : tant qu’elles ne le sont pas, elles ne comptent pas dans les totaux.
- Plus bas : graphique revenu/dépenses par mois, **d’où vient le revenu** (répartition par activité), tableau **par activité**, et **ce qu’il reste à encaisser**.

## Ce qui est repris automatiquement

Vous n’avez **rien à ressaisir** de ceci : paiements de vente **validés**, commissions **payées**, loyers **validés**, paiements de séjours, règlements de missions (avec leurs frais), dépenses de chantier **validées**. Les paiements en attente, refusés ou contre-passés n’y figurent pas.

> **Important** — Validez régulièrement les paiements (ventes, loyers, missions) et les dépenses de chantier : tant qu’ils ne sont pas validés, ils n’entrent pas dans vos chiffres.

## Le journal

**Finances › Journal** : chaque mouvement d’argent des ventes, de la gestion locative, des démarches et des chantiers, repris tel quel, avec les saisies validées.

![Journal financier](img/compta-02-journal.png)

- Filtres : **période** (du… au…), **raccourci**, **activité**, **sens** (entrées et sorties), recherche libre (libellé, tiers, référence).
- Les tuiles donnent **entrées**, **dont revenu MTM**, **sorties** et nombre de **mouvements**.
- Le journal s’ouvre par défaut sur le **mois précédent** (celui que l’on exporte pour la comptabilité) : choisissez **Raccourci › Ce mois-ci** pour voir le mois courant.

## Les saisies

Pour ce qui n’a **pas d’autre origine dans l’outil** : loyer des bureaux, salaires, électricité, recette d’un chantier, subvention… **Finances › Saisies.**

![Saisies à valider](img/compta-03-saisies.png)

### Saisir une dépense ou une recette

1. **Nouvelle saisie.**
2. **Nature** (dépense ou recette), **activité** (général, construction…), **catégorie** (liste paramétrable).
3. **Libellé**, **montant**, **date**, **mode de paiement**, **référence** (n° de facture, de virement), **fournisseur ou client**.
4. **Joindre un justificatif** (facture, reçu, relevé : PDF, JPG, PNG, 10 Mo au plus) : facultatif mais recommandé.
5. **Envoyer à la validation.**

![Nouvelle saisie](img/compta-06-nouvelle-saisie.png)

### La règle des deux regards

> **Important** — Une saisie compte dans les totaux **une fois validée par une autre personne que son auteur**. Vous ne pouvez pas valider votre propre saisie.

Les onglets : **À valider**, **Validées**, **Rejetées**, **Toutes**. Un valideur ouvre la saisie et la **valide** ou la **rejette** (avec un motif). Une saisie **validée ne se modifie plus** : on la **corrige par une saisie inverse**.

## La clôture mensuelle

**Finances › Clôtures** : un mois passé se **clôture** (réservé à ceux qui peuvent *administrer* les finances).

![Clôtures mensuelles](img/compta-04-clotures.png)

- Un mois clôturé **garde ses chiffres** : ses totaux sont **figés** et **plus aucun mouvement daté de ce mois** ne peut être ajouté, validé ou annulé — paiement de vente, loyer, règlement de mission ou de séjour, dépense de chantier, saisie.
- **Clôturer exige qu’aucune saisie du mois n’attende sa validation.**
- Une **correction** se fait alors **à la date du jour**.
- **Rouvrir** un mois demande un **motif**, consigné dans le journal d’audit.

Ordre conseillé en fin de mois : **1.** valider toutes les saisies et paiements ; **2.** **exporter** le journal ; **3.** **clôturer**.

## Exporter pour la comptabilité

**Finances › Journal › Exporter pour la comptabilité** :

![Export comptable](img/compta-07-export-comptable.png)

- **CSV** : le journal, UTF-8, séparateur « ; », virgule décimale — s’ouvre directement dans Excel en français.
- **Excel** : journal, synthèse par activité, par mois et sommes dues. Les cellules qui commencent par `=`, `+`, `-` ou `@` sont **neutralisées** (aucune formule exécutée à l’ouverture).
- Un **motif est obligatoire** : il est consigné dans le journal d’audit avec la période et le nombre de mouvements.

## Valider côté comptabilité

La comptabilité a aussi la main sur les encaissements des autres modules :

- **Ventes** : **valider ou refuser un paiement** enregistré par un commercial, **payer les commissions** (une fois le dossier soldé).
- **Gestion locative** : valider les loyers encaissés.
- **Chantiers** : **valider les dépenses** saisies sur le chantier.
- **Démarches** : consulter les règlements des missions.

![Ventes vues par la comptabilité](img/compta-05-ventes.png)

## Réglages (page Paramètres)

| Réglage | Rôle | Valeur d’origine |
| --- | --- | --- |
| `finances.tauxGestionDefaut` | Commission de gestion quand le bien n’a pas de taux, en % | 10 |
| `finances.categoriesDepenses` | Catégories de dépenses saisies | salaires, loyer des bureaux… |
| `finances.categoriesRecettes` | Catégories de recettes saisies | recette de chantier… |
| `finances.doubleValidation` | Validation par une autre personne | oui |

Le **taux de commission de gestion d’un bien** se règle dans sa fiche (« Commission de gestion (%) »).

## Limites à connaître

- La commission d’un commercial payée est une dépense **datée du jour de son paiement**.
- Les paiements d’un client sur un **chantier** ne sont pas suivis par le module Chantiers : saisissez-les comme **recettes de chantier** pour voir la marge.
- La **TVA n’est pas gérée**.
