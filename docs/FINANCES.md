# Finances (J3.1)

Section 18 du cahier des charges. Pilotage financier de MTM : encaissements, revenu réel, dépenses, résultat par activité, ce qu'il reste à encaisser, et exports pour la comptabilité externe. Ce n'est **pas** un logiciel de comptabilité (pas de plan comptable, de bilan ni de TVA) : le cahier prévoit des exports « pour exploitation comptable externe ».

## Deux notions à ne pas confondre

- **Encaissements** : l'argent reçu. Il comprend les loyers (qui reviennent aux propriétaires) et le prix d'un bien vendu.
- **Revenu de MTM** : ce qui reste réellement à MTM.

| Activité | Revenu de MTM | Dépenses reprises |
| --- | --- | --- |
| Vente de biens | la **marge** du bien (fiche du bien), reconnue **au prorata de chaque paiement validé** : 5 M payés sur 10 M de prix = la moitié de la marge | commissions de commerciaux payées |
| Gestion locative | la **commission de gestion** (taux du bien, ou taux par défaut) sur les loyers et séjours encaissés | — |
| Démarches | les règlements reçus pour la prestation | frais de transfert (Wave, Orange Money, banque) |
| Construction | les recettes saisies à la main (paiements du client) | dépenses de chantier validées |
| Général | les autres recettes saisies | dépenses de fonctionnement saisies |

**Résultat = revenu − dépenses.** Un bien vendu sans marge renseignée compte pour zéro (le tableau de bord le signale) : renseignez prix d'acquisition et prix public dans la fiche du bien.

## Ce qui est repris automatiquement (rien à ressaisir)

Paiements de vente **validés**, commissions **payées**, loyers **validés**, paiements de séjours, règlements de missions (avec leurs frais), dépenses de chantier **validées**. Les paiements en attente, refusés ou contre-passés n'y figurent pas.

## Saisies manuelles (Finances › Saisies)

Pour ce qui n'a pas d'autre origine : loyer des bureaux, salaires, électricité, recette d'un chantier… Catégories paramétrables. Une saisie est **validée par une autre personne que son auteur** avant de compter (réglable : `finances.doubleValidation`). Une saisie validée ne se modifie plus : on la corrige par une saisie inverse. Justificatif facultatif (PDF ou image).

## Clôture mensuelle (Finances › Clôtures)

Un mois passé se clôture (permission `finances:administrer`) : ses totaux sont figés et plus aucun mouvement daté de ce mois ne peut être ajouté, validé ou annulé — paiement de vente (validation, contre-passation), loyer (validation), règlement de mission ou de séjour, dépense de chantier (validation, suppression), saisie. Une correction se fait alors à la date du jour. Clôturer exige qu'aucune saisie du mois n'attende sa validation. Rouvrir un mois demande un motif, consigné dans le journal d'audit.

## Exports

Finances › Journal › « Exporter pour la comptabilité » (permission `finances:exporter`). Motif obligatoire, consigné dans le journal d'audit avec la période et le nombre de mouvements.

- **CSV** : le journal, UTF-8, séparateur « ; », virgule décimale — s'ouvre dans Excel en français.
- **Excel** : journal, synthèse par activité, par mois et sommes dues. Les cellules qui commencent par `=`, `+`, `-` ou `@` sont neutralisées (pas de formule exécutée à l'ouverture).

## Réglages (page Paramètres)

| Clé | Rôle | Défaut |
| --- | --- | --- |
| `finances.tauxGestionDefaut` | commission de gestion quand le bien n'a pas de taux, en % | 10 |
| `finances.categoriesDepenses` | catégories de dépenses saisies | salaires, loyer_bureaux, … |
| `finances.categoriesRecettes` | catégories de recettes saisies | recette_chantier, … |
| `finances.doubleValidation` | validation par une autre personne | oui |

Le taux d'un bien se règle dans sa fiche (« Commission de gestion (%) »).

## Permissions

`finances:consulter` (tableau, journal, saisies, clôtures), `creer` et `modifier` (saisies), `valider` (valider ou rejeter une saisie), `exporter`, `administrer` (clôturer, rouvrir). Seed : la comptabilité saisit, valide et exporte ; la direction a tout ; le manager consulte.

## Limites connues

- La commission d'un commercial payée est une dépense datée du jour de son paiement (la date exacte n'est pas conservée par le module des ventes).
- Les paiements du client sur un chantier ne sont pas suivis par le module Construction : saisissez-les comme recettes de chantier pour voir la marge.
- La TVA n'est pas gérée.
