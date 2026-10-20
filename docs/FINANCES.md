# Finances (J3.1) et contrôle financier (cahier des charges du DG)

Section 18 du cahier des charges, complétée par le **cahier des charges fonctionnel de la Direction générale** (comptabilité, trésorerie, contrôle financier). Pilotage financier de MTM : encaissements, revenu réel, dépenses, résultat par activité, ce qu'il reste à encaisser, trésorerie (caisse, banques, portefeuilles mobiles), reversements aux propriétaires, désistements, chantiers, et exports pour la comptabilité externe. Ce n'est **pas** un logiciel de comptabilité générale : pas de plan comptable SYSCOHADA, de bilan ni de TVA (voir « Hors périmètre »).

## Deux notions à ne pas confondre

- **Encaissements** : l'argent reçu. Il comprend les loyers (qui reviennent aux propriétaires) et le prix d'un bien vendu.
- **Revenu de MTM** : ce qui reste réellement à MTM.

| Activité | Revenu de MTM | Dépenses reprises |
| --- | --- | --- |
| Vente de biens (terrain en propre) | la **marge** du bien (fiche du bien), reconnue **au prorata de chaque paiement validé** : 5 M payés sur 10 M de prix = la moitié de la marge | commissions de commerciaux payées, remboursements de désistement |
| Vente de biens (**terrain confié** par un propriétaire) | la **commission de MTM** (fiche du bien), au prorata de chaque paiement validé ; le reste de l'argent encaissé revient au propriétaire | idem |
| Gestion locative | la **commission de gestion** (taux du bien, ou taux par défaut) sur les loyers et séjours encaissés | — |
| Démarches | les règlements reçus pour la prestation | frais de transfert (Wave, Orange Money, banque) |
| Construction | les **paiements du client** validés (fiche financière du chantier) et les recettes saisies | dépenses de chantier validées **payées par MTM** |
| Général | les autres recettes saisies | dépenses de fonctionnement saisies |

**Résultat = revenu − dépenses.** Un bien vendu sans marge renseignée compte pour zéro (le tableau de bord le signale) : renseignez prix d'acquisition et prix public dans la fiche du bien.

### Ce qui pèse (ou non) sur le résultat

Certains mouvements déplacent de l'argent **sans être une dépense ni un revenu** : ils comptent dans la trésorerie mais pas dans le résultat (`horsResultat` dans le journal).

| Mouvement | Trésorerie | Résultat |
| --- | --- | --- |
| Reversement à un propriétaire (argent d'un tiers) | oui | non |
| Avance de fonds, remboursement saisi (nature `avance` / `remboursement`) | oui | non |
| Remise de fonds, transfert entre comptes | oui (déplacement) | non |
| Matériaux achetés directement par le client (`payeParClient`) | **non** (jamais une sortie de MTM) | non |
| Remboursement d'un client qui se désiste | oui | oui (une sortie) |

## Ce qui est repris automatiquement (rien à ressaisir)

Paiements de vente **validés**, commissions **payées**, loyers **validés**, paiements de séjours, règlements de missions (avec leurs frais), dépenses de chantier **validées**, paiements du client de chantier **validés**, reversements **payés**, remboursements de désistement **payés**. Les paiements en attente, refusés ou contre-passés n'y figurent pas.

## Saisies manuelles (Finances › Saisies)

Pour ce qui n'a pas d'autre origine : loyer des bureaux, salaires, électricité… Catégories paramétrables. Chaque saisie a un **numéro unique** (`OP-2026-000123`). Une saisie est **validée par une autre personne que son auteur** avant de compter (réglable : `finances.doubleValidation`). Justificatif PDF ou image.

- **Type de dépense** : *définitive* (par défaut), *avance de fonds* ou *remboursement*. Seule une dépense définitive pèse sur le résultat.
- **Une dépense se valide toujours avec sa pièce justificative** (réglable : `finances.justificatifObligatoire`). Les dépenses sans pièce sont listées (onglet « Sans pièce », état « Opérations sans justificatif », tableau de bord).

### Seuils de validation des dépenses

Les seuils validés par la Direction (réglage `finances.seuilsValidation`, en FCFA) :

| Montant | Règle |
| --- | --- |
| 1 à 50 000 | la comptable paie seule, justificatif obligatoire (niveau 0) |
| 50 001 à 200 000 | **autorisation préalable** de la Direction (niveau 1) |
| 200 001 à 500 000 | autorisation **expresse et motivée**, justificatifs renforcés (niveau 2) |
| au-delà de 500 000 | autorisation expresse et **contrôle renforcé** : celui qui autorise n'est pas celui qui valide (niveau 3) |

L'autorisation précède la validation (`POST /finances/operations/:id/autoriser`). Elle est donnée par le droit **`finances:autoriser`** ou par une **délégation plafonnée** (réglage `finances.delegations` : identifiant de l'utilisateur → plafond en FCFA). On n'autorise jamais sa propre saisie. Modifier le montant d'une saisie annule l'autorisation donnée. Un paiement exceptionnel **autorisé à distance** (Direction en déplacement) exige un motif et laisse une trace d'audit (`finances.autorisation_distance`) visible du tableau de bord. Les seuils ne s'appliquent qu'aux dépenses courantes : un reversement à un propriétaire a ses propres règles.

### Corrections traçables, jamais de suppression

Une saisie **validée** ne se modifie ni ne se supprime. On la **corrige** (`POST /finances/operations/:id/corriger`) par une écriture liée : *annulation* (écriture inverse) ou *ajustement* (nouvelle écriture d'un montant précis), à la date du jour, avec un **motif obligatoire**. L'écriture d'origine reste consultable ; la correction la référence (`corrigeId`), demande l'autorisation de la Direction même sous le premier seuil, et ne se corrige pas elle-même. Une **tentative de suppression** d'une écriture validée (ou d'un mouvement de fonds confirmé) est refusée **et inscrite** au journal d'audit (`finances.suppression_refusee`). La pièce d'une écriture validée ne se remplace plus.

## Trésorerie (Finances › Trésorerie)

Chaque **compte** (caisse, banque, Wave, Orange Money) est suivi séparément ; une vue **consolidée** les additionne. Un compte déclare les **modes de paiement** qu'il sert (`especes`, `virement`, `wave`, `orange_money`…) : un mouvement se rattache au compte qui sert son mode (ou au compte imposé sur une saisie). Le mode historique `mobile_money`, sans opérateur, va sur Wave tant qu'il n'est pas précisé. Les mouvements sans compte reconnu sont comptés à part et signalés.

**Les soldes ne se saisissent jamais** : solde initial du compte (à une date) + entrées − sorties, à partir des mouvements validés et des mouvements de fonds confirmés. Le seed crée la caisse, la banque, Wave et Orange Money avec un solde initial à zéro : réglez-le à la mise en service. Créer et modifier un compte : `finances:administrer`.

### Remises de fonds, avances, remboursements, transferts

Un **mouvement de fonds** (`type` : `transfert`, `remise_fonds`, `avance`, `remboursement`) déplace de l'argent entre comptes ou entre personnes **sans être une dépense**. Chaque remise porte un **bordereau** : montant, date, origine des fonds, motif, celui qui remet et celui qui reçoit. Il ne compte qu'une fois **confirmé par une autre personne** que son auteur ; un mouvement confirmé ne se supprime pas (on saisit le mouvement inverse). Numéro `MF-2026-000123`.

### Clôture quotidienne de la caisse

La clôture est **obligatoire chaque jour d'activité, même sans opération**. Elle calcule le solde initial du jour, les encaissements, les décaissements et le **solde théorique** ; la comptable saisit le **montant réellement compté** ; l'**écart** est calculé. En cas d'écart, une explication est obligatoire, une pièce peut être jointe, et la **Direction décide** (accepter, ou renvoyer pour correction) : aucun écart n'est régularisé en silence. Les jours oubliés (15 derniers jours, hors dimanche) sont signalés au tableau de bord.

### Rapprochement bancaire (Finances › Rapprochement bancaire)

On importe le **relevé** de la banque (ou l'historique Wave / Orange Money) en **CSV** : séparateur `;`, `,` ou tabulation, une ligne d'en-tête avec `date`, `libellé`, `référence` (facultative) et soit `montant` (négatif pour une sortie), soit `débit` / `crédit`. Réimporter le même relevé ne crée aucun doublon ; une ligne illisible est signalée, jamais perdue. Chaque ligne est mise en face du mouvement du logiciel qu'elle confirme (même sens, **même montant**, date à moins de 5 jours) :

- **rapprochement automatique** : seulement sans ambiguïté (un seul candidat, ou une référence identique, et pas deux lignes sur le même mouvement) ;
- **manuel** : parmi les suggestions, ou n'importe quel mouvement de même montant ; un mouvement déjà rapproché ne se reprend pas ;
- **ignorer** une ligne sans mouvement (frais, intérêts…) avec un motif ; **annuler** un rapprochement.

Une transaction n'est pas tenue pour confirmée sur la seule foi d'une capture d'écran : ce qui n'est pas rapproché reste signalé (tableau de bord, page de rapprochement). Aucune intégration automatique avec Wave, Orange Money ou les banques n'existe : l'import CSV en tient lieu.

## Terrains confiés et reversements aux propriétaires (Finances › Propriétaires et reversements)

Un terrain est **confié** quand sa fiche a un **propriétaire**, une **commission de MTM** renseignée, et n'est pas un produit détenu en direct. MTM **encaisse d'abord, déduit sa commission contractuelle, puis reverse**. Pour une vente (exemple du cahier : 3 500 000 au client, 500 000 de commission, 3 000 000 au propriétaire) :

- **commission acquise** = commission × encaissé ÷ prix ; **dû au propriétaire** = prix − commission ;
- **exigible** selon le **mode de reversement** du mandat (`modeReversement`, modifiable avec `finances:administrer`) : `au_fur_et_a_mesure` (suit l'encaissé), `fin_paiement` (rien avant le solde du client), `echeancier` (suit l'encaissé, chaque reversement étant autorisé à la main).

Un **reversement** suit : *demande* (comptable) → *autorisation* de la Direction ou d'un délégué (jamais par l'auteur) → *preuve de paiement jointe* → *paiement* (mode, référence, date). Il porte un numéro `RP-2026-000123`, sort de la trésorerie, et **ne pèse jamais sur le résultat**. Un reversement dépassant l'exigible est refusé : il faut une **avance**. Une **avance** (avant que le client ait fini de payer) est interdite par défaut : motif précis (10 caractères au moins), plafond = dû restant, et **autorisation expresse de la Direction elle-même** (le droit `finances:autoriser`, une délégation ne suffit pas), tracée (`finances.avance_proprietaire_autorisee`). Le plafond est revérifié à l'autorisation et au paiement.

## Désistement et remboursement (Finances › Désistements)

Une demande enregistre sa date de réception, **vérifie le montant réellement encaissé** (paiements validés), calcule la **retenue sur l'avance** (par défaut 50 % de l'acompte de la réservation) et le **remboursable**, avec une **date limite** (par défaut 6 mois). La règle appliquée est **figée dans la demande**, avec la version du protocole. **La Direction décide**, puis le remboursement est payé avec sa preuve. Le réglage `finances.desistement` (`retenuePct`, `delaiMois`, `validee`, `version`) porte la règle ; **tant que `validee` est faux** (clause non validée juridiquement), une demande peut être instruite mais **pas acceptée**. Le remboursement payé est une sortie qui pèse sur le résultat ; un délai dépassé est signalé.

## Chantiers (Finances › Rentabilité des chantiers)

Chaque chantier a sa **fiche financière** : prix (devis), budget prévisionnel, **échéancier du client** (acompte d'environ 50 % puis paiements selon l'avancement, calendrier libre), **paiements du client** (saisis, puis validés par une autre personne), recettes confirmées, **coût réel** (dépenses validées payées par MTM), marge prévisionnelle (prix − budget), marge réelle (recettes − coût réel), coût final estimé (le plus haut du budget et de la projection sur l'avancement, dès 10 %), reste à engager, reste à collecter. Les **achats directs du client** (case « payé par le client » sur la dépense) sont suivis à part et ne sont jamais une sortie de MTM. Les dépenses se saisissent et se valident toujours dans le module Construction.

## Tableau de bord de la Direction (Finances)

À la période choisie (filtres : **activité**, **moyen de paiement**) : encaissements, revenu, dépenses, résultat avec comparaison. À la date du jour : **soldes** de chaque compte et consolidé, **créances clients**, **sommes à reverser aux propriétaires** (et exigibles), **reversements en attente d'autorisation**, **résultats des chantiers**, et les **points d'attention** : dépenses à autoriser, dépenses sans justificatif, écarts de caisse sans décision, jours de caisse non clôturés, lignes de relevé non rapprochées, remboursements hors délai, mouvements de fonds à confirmer, et les **anomalies du journal d'audit** (30 jours). Les filtres par chantier, lotissement et propriétaire ne sont pas proposés (voir « Hors périmètre »).

## États à la demande (Finances › États financiers)

Lisibles à l'écran et téléchargeables en CSV : journal de caisse, journal des banques et portefeuilles mobiles, dépenses par catégorie, recettes par activité, ventes au comptant et à moratoire, créances clients et impayés, commissions et revenus de MTM, sommes dues et reversées aux propriétaires, rentabilité de chaque chantier, opérations sans justificatif, journal des corrections, validations et annulations.

## Rapport financier quotidien (Finances › Rapport du soir)

Préparé par la comptable (brouillon), **vérifié** par une autre personne, puis **transmis** à la Direction (notification), en **PDF** (en-tête et coordonnées de l'entreprise). Contenu : date, préparateur, statut, solde initial et état de chaque caisse, encaissements du jour par moyen de paiement, dépenses payées avec autorisations et pièces, solde théorique / compté / écart et décision, ventes et paiements reçus, reversements et soldes dus, recettes et dépenses des chantiers, créances et retards, justificatifs manquants, opérations en attente, anomalies. **Même sans opération**, le rapport est produit et le dit, avec le statut de la clôture de caisse. Une fois transmis, il est **figé**.

## Clôture mensuelle (Finances › Clôtures)

Un mois passé se clôture (permission `finances:administrer`) : ses totaux sont figés et plus aucun mouvement daté de ce mois ne peut être ajouté, validé ou annulé — paiement de vente (validation, contre-passation), loyer (validation), règlement de mission ou de séjour, dépense de chantier (validation, suppression), saisie, mouvement de fonds, paiement de chantier, reversement, remboursement. Une correction se fait alors à la date du jour. Clôturer exige qu'aucune saisie du mois n'attende sa validation. Rouvrir un mois demande un motif, consigné dans le journal d'audit.

## Exports

Finances › Journal › « Exporter pour la comptabilité » (permission `finances:exporter`). Motif obligatoire, consigné dans le journal d'audit avec la période et le nombre de mouvements.

- **CSV** : le journal, UTF-8, séparateur « ; », virgule décimale — s'ouvre dans Excel en français.
- **Excel** : journal, synthèse par activité, par mois et sommes dues. Les cellules qui commencent par `=`, `+`, `-` ou `@` sont neutralisées (pas de formule exécutée à l'ouverture).

## Réglages (page Paramètres)

Ces réglages sont créés par le seed (la page Paramètres n'accepte que des clés en minuscules : elle ne pourrait pas créer `tauxGestionDefaut` à la main).

| Clé | Rôle | Défaut |
| --- | --- | --- |
| `finances.tauxGestionDefaut` | commission de gestion quand le bien n'a pas de taux, en % | 10 |
| `finances.categoriesDepenses` | catégories de dépenses saisies | salaires, loyer_bureaux, … |
| `finances.categoriesRecettes` | catégories de recettes saisies | recette_chantier, … |
| `finances.doubleValidation` | validation par une autre personne (saisies, mouvements de fonds, paiements de chantier, rapport) | oui |
| `finances.seuilsValidation` | seuils de validation des dépenses `{ palier1, palier2, palier3 }` en FCFA | 50 000 / 200 000 / 500 000 |
| `finances.justificatifObligatoire` | une dépense ne se valide qu'avec sa pièce | oui |
| `finances.delegations` | délégations de signature : identifiant utilisateur → plafond FCFA | `{}` |
| `finances.desistement` | règle de désistement `{ retenuePct, delaiMois, validee, version }` | 50 % / 6 mois / non validée |

Le taux d'un bien se règle dans sa fiche (« Commission de gestion (%) »). La commission de MTM sur un terrain confié se règle aussi dans sa fiche.

## Permissions

`finances:consulter` (tableau, journal, saisies, trésorerie, états), `creer` et `modifier` (saisies, mouvements, clôtures de caisse, import de relevés), `valider` (valider ou rejeter, rapprocher), **`autoriser`** (nouveau : autoriser une dépense au-delà du premier seuil, un reversement, une correction, un remboursement, un écart de caisse — la Direction), `payer` (payer un reversement ou un remboursement), `exporter`, `administrer` (clôturer, rouvrir, comptes, mode de reversement). Seed : la comptabilité saisit, valide, paie et exporte ; la direction a tout ; le manager consulte. **Les commerciaux n'ont aucun accès** à la comptabilité.

## Journal d'audit

Chaque geste sensible y est inscrit avec l'auteur, la date, l'objet et le motif : saisie, validation, rejet, autorisation (dont à distance), correction, **tentative de suppression refusée**, clôture (mensuelle et de caisse), écart de caisse et décision, mouvement de fonds, reversement (dont avance), remboursement, paiement de chantier, rapprochement, export, rapport transmis. L'application n'offre **aucune route** pour modifier ou effacer le journal. Voir « Hors périmètre » pour la protection côté base de données.

## Hors périmètre / à confirmer

Ce que le cahier du DG demande et que ce module **ne fait pas** (ou pas encore) :

- **Plan comptable SYSCOHADA, bilan, TVA** : le cahier les renvoie à une phase ultérieure, avec validation par un comptable. Les exports permettent la reprise externe.
- **Intégrations** WhatsApp (reçus, rappels), Wave, Orange Money, banques : aucune connexion automatique ; l'import CSV du relevé et la saisie manuelle en tiennent lieu. Ce module ne touche pas aux rappels d'échéance ni à l'envoi des reçus par WhatsApp (modules Ventes et Notifications, non vérifiés ici).
- **Reçu PDF de tout encaissement** : les ventes produisent leurs documents « reçu » et les démarches leur facture ; ce module n'ajoute pas de reçu pour une saisie de recette, ni pour un paiement de chantier. Les vérifications correspondantes n'ont pas été faites pour la gestion locative.
- **Filtres du tableau de bord par chantier, lotissement et propriétaire** : seuls la période, l'activité et le moyen de paiement filtrent.
- **Verrouillage du journal d'audit au niveau de la base** (interdire UPDATE/DELETE aux utilisateurs applicatifs) et politique de sauvegarde/restauration : à décider avec l'hébergeur ; l'application, elle, n'expose aucune modification.
- **Clause de désistement** : à valider juridiquement avant de passer `finances.desistement.validee` à vrai.
- **Jours d'activité de la caisse** : la clôture est attendue du lundi au samedi ; ajuster si MTM travaille le dimanche.
- **Commission d'un commercial payée** : datée du jour de son paiement (la date exacte n'est pas conservée par le module des ventes).
- **Marge d'un bien en propre** : lue sur la fiche au moment du calcul ; si elle change, le revenu des mois non clôturés change aussi.
