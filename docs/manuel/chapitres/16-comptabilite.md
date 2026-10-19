---
id: comptabilite
titre: Comptabilité et finances
groupe: metier
resume: Encaissements, revenu réel de MTM, dépenses et seuils d’autorisation, trésorerie et clôture de caisse, rapprochement bancaire, reversements aux propriétaires, désistements, chantiers, rapport du soir.
roles: comptabilite direction administrateur
---

Le module **Finances** pilote l’argent de MTM : **ce qui est encaissé, ce que MTM gagne réellement, ce qu’elle dépense, ce qu’il lui reste à encaisser**, et prépare les **exports pour la comptabilité externe**. Ce n’est **pas** un logiciel de comptabilité : pas de plan comptable, de bilan ni de TVA.

La rubrique **Pilotage et finances** contient : *Finances* (tableau de bord), *Journal financier*, *Saisies financières*, *Trésorerie et caisse*, *Rapprochement bancaire*, *Propriétaires et reversements*, *Désistements*, *Rentabilité des chantiers*, *États financiers*, *Rapport du soir* et *Clôtures mensuelles*.

## Deux notions à ne pas confondre

- **Encaissements** : l’argent reçu. Il comprend les loyers (qui reviennent aux propriétaires) et le prix des biens vendus.
- **Revenu de MTM** : ce qui reste réellement à MTM.

| Activité | Revenu de MTM | Dépenses reprises |
| --- | --- | --- |
| **Vente de biens** | La **marge** du bien (fiche du bien), reconnue **au prorata de chaque paiement validé** : 5 M payés sur 10 M de prix = la moitié de la marge. Pour un **terrain confié** par un propriétaire : la **commission de MTM**, le reste de l’argent encaissé revenant au propriétaire | Commissions de commerciaux payées, remboursements de désistement |
| **Gestion locative** | La **commission de gestion** (taux du bien, ou taux par défaut) sur les loyers et séjours encaissés | — |
| **Démarches** | Les règlements reçus pour la prestation | Frais de transfert (Wave, Orange Money, banque) |
| **Construction** | Les **paiements du client** validés (fiche financière du chantier) | Dépenses de chantier validées **payées par MTM** (les achats directs du client n’en font pas partie) |
| **Général** | Les autres recettes saisies | Dépenses de fonctionnement saisies |

**Résultat = revenu − dépenses.** Un bien vendu **sans marge renseignée** compte pour zéro (le tableau de bord le signale) : renseignez prix d’acquisition et prix public dans la fiche du bien.

## Le tableau de bord financier

![Tableau de bord financier](img/compta-01-tableau.png)

- Boutons de période : *Ce mois-ci*, *Mois précédent*, *Ce trimestre*, *Cette année*, *12 derniers mois*.
- Quatre tuiles : **Encaissements**, **Revenu de MTM**, **Dépenses**, **Résultat**, chacune comparée à la **période précédente de même durée** (« +12 % par rapport à la période précédente », ou « Rien sur la période précédente : pas de comparaison »).
- Le bandeau orange rappelle les **opérations à valider** : tant qu’elles ne le sont pas, elles ne comptent pas dans les totaux.
- Plus bas : graphique revenu/dépenses par mois, **d’où vient le revenu** (répartition par activité), tableau **par activité**, et **ce qu’il reste à encaisser**.

## Ce qui est repris automatiquement

Vous n’avez **rien à ressaisir** de ceci : paiements de vente **validés**, commissions **payées**, loyers **validés**, paiements de séjours, règlements de missions (avec leurs frais), dépenses de chantier **validées**, paiements du client de chantier **validés**, reversements aux propriétaires **payés**, remboursements de désistement **payés**. Les paiements en attente, refusés ou contre-passés n’y figurent pas.

> **À savoir** — Certains mouvements déplacent de l’argent **sans être une dépense ni un revenu** : un reversement à un propriétaire (c’est l’argent d’un tiers), une avance de fonds, une remise de fonds, un transfert entre comptes. Ils comptent dans la **trésorerie** mais pas dans le **résultat**.

> **Important** — Validez régulièrement les paiements (ventes, loyers, missions) et les dépenses de chantier : tant qu’ils ne sont pas validés, ils n’entrent pas dans vos chiffres.

## Le journal

**Finances › Journal** : chaque mouvement d’argent des ventes, de la gestion locative, des démarches et des chantiers, repris tel quel, avec les saisies validées.

![Journal financier](img/compta-02-journal.png)

- Filtres : **période** (du… au…), **raccourci**, **activité**, **sens** (entrées et sorties), recherche libre (libellé, tiers, référence).
- Les tuiles donnent **entrées**, **dont revenu MTM**, **sorties** et nombre de **mouvements**.
- Le journal s’ouvre sur le **mois en cours** ; **Raccourci › Mois précédent** affiche celui que l’on exporte pour la comptabilité.

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

Chaque saisie reçoit un **numéro unique** (OP-2026-000123). Choisissez le **type de dépense** : *définitive* (par défaut), *avance de fonds* ou *remboursement* — seule une dépense définitive pèse sur le résultat.

### La règle des deux regards

> **Important** — Une saisie compte dans les totaux **une fois validée par une autre personne que son auteur**. Vous ne pouvez pas valider votre propre saisie.

> **Important** — **Une dépense se valide toujours avec sa pièce justificative** (facture, reçu, bon de dépense). Sans pièce, le bouton *Valider* reste grisé.

Les onglets : **À autoriser**, **À valider**, **Validées**, **Rejetées**, **Sans pièce**, **Toutes**. Un valideur ouvre la saisie et la **valide** ou la **rejette** (avec un motif).

### Les seuils de validation des dépenses

Plus la dépense est grosse, plus le contrôle monte (seuils fixés par la Direction, modifiables dans les réglages) :

| Montant | Qui décide |
| --- | --- |
| 1 à 50 000 FCFA | La **comptable** paie seule, avec justificatif |
| 50 001 à 200 000 FCFA | **Autorisation préalable** de la Direction |
| 200 001 à 500 000 FCFA | Autorisation **expresse et motivée**, justificatifs renforcés |
| Au-delà de 500 000 FCFA | Autorisation expresse et **contrôle renforcé** : celui qui autorise n’est pas celui qui valide |

La Direction (ou un **délégué** auquel elle a donné un plafond) clique sur **Autoriser** ; la comptable peut alors valider. On n’autorise jamais sa propre saisie. Si le montant d’une saisie change, l’autorisation donnée est annulée. Quand la Direction est en déplacement, elle peut **autoriser à distance** : cochez la case, le **motif est obligatoire** et la trace est visible au tableau de bord.

### Corriger une erreur : jamais d’effacement

Une saisie **validée ne se modifie plus et ne se supprime jamais**. Pour la corriger, cliquez sur **Corriger** : vous créez une **écriture liée** — une *annulation* (l’écriture inverse) ou un *ajustement* (un montant précis) — avec un **motif obligatoire**. L’écriture d’origine reste consultable, la correction la référence, et la Direction doit l’autoriser. Toute **tentative de suppression** d’une écriture validée est refusée **et inscrite** au journal d’audit.

## La clôture mensuelle

**Finances › Clôtures** : un mois passé se **clôture** (réservé à ceux qui peuvent *administrer* les finances).

![Clôtures mensuelles](img/compta-04-clotures.png)

- Un mois clôturé **garde ses chiffres** : ses totaux sont **figés** et **plus aucun mouvement daté de ce mois** ne peut être ajouté, validé ou annulé — paiement de vente, loyer, règlement de mission ou de séjour, dépense de chantier, saisie.
- **Clôturer exige qu’aucune saisie du mois n’attende sa validation.**
- Une **correction** se fait alors **à la date du jour**.
- **Rouvrir** un mois demande un **motif**, consigné dans le journal d’audit.

La liste montre les **six derniers mois** et les mois déjà clôturés ; **« Afficher les mois plus anciens »** déroule le reste.

Ordre conseillé en fin de mois : **1.** valider toutes les saisies et paiements ; **2.** **exporter** le journal ; **3.** **clôturer**.

## Exporter pour la comptabilité

**Finances › Journal › Exporter pour la comptabilité** :

![Export comptable](img/compta-07-export-comptable.png)

- **CSV** : le journal, UTF-8, séparateur « ; », virgule décimale — s’ouvre directement dans Excel en français.
- **Excel** : journal, synthèse par activité, par mois et sommes dues. Les cellules qui commencent par `=`, `+`, `-` ou `@` sont **neutralisées** (aucune formule exécutée à l’ouverture).
- Un **motif est obligatoire** : il est consigné dans le journal d’audit avec la période et le nombre de mouvements.

## La trésorerie : caisse, banques, Wave et Orange Money

**Finances › Trésorerie.** Chaque compte — la **caisse**, le **compte bancaire**, **Wave**, **Orange Money** — est suivi **séparément**, avec une vue **consolidée**. Un mouvement se range dans le compte qui sert son **mode de paiement** (espèces, virement, Wave, Orange Money…).

> **Important** — **Les soldes ne se saisissent jamais** : ils se calculent à partir du solde initial du compte (à régler à la mise en service) et des mouvements. Si des mouvements n’ont aucun compte, la page le signale : ajoutez leur mode de paiement à un compte.

### Remises de fonds, avances, transferts

Onglet **Remises de fonds et transferts** : *remise de fonds* entre la Direction et la comptable, *avance*, *remboursement*, *transfert* entre comptes. Chaque remise a un **bordereau** (montant, date, origine, motif, qui remet, qui reçoit). Ce n’est **pas une dépense**. Elle ne compte qu’une fois **confirmée par une autre personne** que celle qui l’a saisie. Un mouvement confirmé ne se supprime pas : on saisit le mouvement inverse.

### Clôture quotidienne de la caisse

Onglet **Clôture de caisse**. La clôture est **obligatoire chaque jour d’activité, même sans opération**. Comptez l’argent, saisissez le **montant réellement compté** : le logiciel calcule le solde initial, les entrées, les sorties, le **solde théorique** et l’**écart**.

> **Important** — En cas d’écart, **expliquez-le** (obligatoire) et joignez une pièce si vous en avez une. La **Direction décide** : accepter l’écart, ou le renvoyer pour correction. **Aucun écart n’est régularisé en silence.** Les jours oubliés sont signalés.

## Le rapprochement bancaire

**Finances › Rapprochement bancaire.** Un virement ou un paiement mobile n’est **confirmé que s’il apparaît sur le relevé** : une capture d’écran ne suffit pas.

1. Choisissez le compte (banque, Wave ou Orange Money) et la période.
2. **Importez le relevé** en CSV : une ligne d’en-tête avec *date*, *libellé*, *référence* (facultative) et *montant* (négatif pour une sortie) — ou *débit* et *crédit*. Réimporter le même relevé ne crée aucun doublon ; les lignes illisibles sont signalées.
3. **Rapprochez automatiquement** : seules les lignes **sans ambiguïté** sont rapprochées (même montant, date proche, un seul candidat ou la même référence).
4. Traitez le reste à la main : **rapprocher** avec un mouvement de même montant, **ignorer** une ligne sans mouvement (frais, intérêts) **avec un motif**, ou **annuler** un rapprochement.

À droite, les **mouvements du logiciel que le relevé ne confirme pas** : à vérifier (paiement non reçu, erreur de saisie, mauvais compte). Les lignes non rapprochées remontent au tableau de bord.

## Les terrains confiés et les reversements aux propriétaires

**Finances › Propriétaires et reversements.** Pour un terrain confié (fiche du bien : un **propriétaire** et la **commission de MTM**), MTM **encaisse d’abord, déduit sa commission, puis reverse le reste**. Exemple du cahier des charges : vendu 3 500 000 FCFA, commission de MTM 500 000, **dû au propriétaire 3 000 000**.

L’écran montre, pour chaque vente : l’**encaissé**, la **commission acquise** par MTM (au prorata de ce que le client a payé), le **dû**, le **déjà reversé** et le **solde restant**. Le **mode de reversement** est une clause du mandat : *au fur et à mesure* des paiements du client, *à la fin du paiement*, ou selon un échéancier.

Le circuit d’un reversement :

1. **Demande** par la comptable (bouton *Reverser*), dans la limite de ce qui est exigible.
2. **Autorisation** de la Direction (ou d’un délégué) — jamais par l’auteur de la demande.
3. **Preuve de paiement** jointe (reçu de virement, bordereau).
4. **Paiement** enregistré (moyen, référence, date).

> **Important** — **Une avance au propriétaire** (avant que le client ait fini de payer) est **interdite par défaut**. Elle exige un **motif précis** et l’**autorisation expresse de la Direction elle-même** — une délégation ne suffit pas. Elle ne dépasse jamais le dû restant. Un reversement n’est **jamais** une dépense de MTM : il sort de la trésorerie sans toucher le résultat.

## Les désistements et les remboursements

**Finances › Désistements.** Quand un client renonce : enregistrez sa **demande** (avec la **date de réception**). Le logiciel reprend le **montant réellement encaissé**, applique la **retenue sur l’avance** (par défaut **50 %**) et calcule le **remboursable** avec une **date limite** (par défaut **6 mois**). La règle appliquée est **figée dans la demande**, avec la version du protocole signé. La **Direction décide**, puis le remboursement est payé avec sa **preuve**. Un délai dépassé est signalé.

> **Important** — Cette clause (retenue de 50 %, six mois) doit être **validée juridiquement** avant d’être appliquée. Tant qu’elle ne l’est pas, une demande peut être instruite mais **la Direction ne peut pas l’accepter**. Quand la clause est validée, passez *validee* à vrai dans le réglage *finances.desistement* (page Paramètres).

## La rentabilité des chantiers

**Finances › Rentabilité des chantiers.** Chaque chantier a sa **fiche financière** : prix, budget prévisionnel, **échéancier du client** (acompte d’environ 50 % puis paiements selon l’avancement — le calendrier est libre), **paiements du client**, recettes confirmées, **coût réel**, **marge prévisionnelle** et **marge réelle**, coût final estimé et reste à encaisser. Un paiement du client se saisit sur la fiche et **compte une fois validé par une autre personne**.

> **À savoir** — Quand **le client achète lui-même les matériaux**, cochez *payé par le client* sur la dépense (module Chantiers) : elle est suivie **à part** et n’est **jamais une sortie de trésorerie de MTM**, pour ne fausser ni la trésorerie ni la rentabilité.

## Les états financiers

**Finances › États financiers.** À la demande, à l’écran et en **CSV** : *journal de caisse*, *journal des banques et portefeuilles mobiles*, *dépenses par catégorie*, *recettes par activité*, *ventes au comptant et à moratoire*, *créances clients et impayés*, *commissions et revenus de MTM*, *sommes dues et reversées aux propriétaires*, *rentabilité des chantiers*, *opérations sans justificatif*, *journal des corrections, validations et annulations*.

## Le rapport du soir

**Finances › Rapport du soir.** Chaque soir, la comptable **prépare** le rapport du jour (caisse, encaissements par moyen de paiement, dépenses et autorisations, ventes, reversements, chantiers, créances, justificatifs manquants, opérations en attente, anomalies), une autre personne le **vérifie**, puis il est **transmis** à la Direction, en **PDF**. Même **sans opération**, le rapport est produit : il le dit et indique l’état de la clôture de caisse. Une fois **transmis**, il est figé.

## Le tableau de bord de la Direction

Le tableau de bord financier affiche, en plus des chiffres de la période (filtrables par **activité** et **moyen de paiement**) : les **soldes** de chaque compte, les **créances clients**, les **sommes à reverser aux propriétaires**, les **reversements en attente d’autorisation**, les **résultats des chantiers**, et les **points d’attention** — dépenses à autoriser ou sans justificatif, écarts de caisse sans décision, jours de caisse non clôturés, lignes de relevé non rapprochées, remboursements hors délai, **anomalies du journal d’audit**.

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
| `finances.seuilsValidation` | Seuils de validation des dépenses (FCFA) | 50 000 / 200 000 / 500 000 |
| `finances.justificatifObligatoire` | Une dépense ne se valide qu’avec sa pièce | oui |
| `finances.delegations` | Plafond d’autorisation donné à un délégué | aucune |
| `finances.desistement` | Retenue (%), délai (mois) et validation juridique de la clause | 50 % / 6 mois / non validée |

Le **taux de commission de gestion d’un bien** se règle dans sa fiche (« Commission de gestion (%) »).

## Limites à connaître

- La commission d’un commercial payée est une dépense **datée du jour de son paiement**.
- La **TVA n’est pas gérée**, ni le plan comptable SYSCOHADA : les exports servent à la comptabilité externe.
- **Pas de connexion automatique** à Wave, Orange Money ou aux banques : le **relevé se charge en CSV** et se rapproche à la main ou automatiquement.
- Le tableau de bord ne filtre pas par chantier, lotissement ou propriétaire (période, activité et moyen de paiement seulement).
- La clôture de caisse est attendue **du lundi au samedi**.
- Les **commerciaux n’ont aucun accès** à la comptabilité.
