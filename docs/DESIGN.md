# Règles de design du back-office

Le back-office suit quelques règles communes, définies en **variables de style** dans `apps/backoffice/src/styles.scss`.
Un écran n'invente pas ses propres valeurs : il utilise celles-ci.

## Texte

| Variable | Taille | Usage |
| --- | --- | --- |
| `--mtm-fs-xs` | 12 px | légendes, étiquettes, pastilles (**jamais en dessous**) |
| `--mtm-fs-sm` | 13 px | tableaux, textes d'aide |
| `--mtm-fs-md` | 14 px | texte courant |
| `--mtm-fs-lg` | 16 px | sous-titres, champs de saisie |
| `--mtm-fs-xl` | 18 px | titres de carte |
| `--mtm-fs-2xl` | 22 px | grands chiffres |
| `--mtm-fs-3xl` | 26 px | titre de page |
| `--mtm-fs-4xl` | 32 px | chiffre vedette |

- **Titre de page** : `--mtm-title-page` (26 px sur grand écran), le même sur toutes les pages, fiches comprises.
- **Polices** : Plus Jakarta Sans pour le texte, Outfit pour les titres. Les tableaux (AG Grid) utilisent aussi Plus Jakarta Sans (réglé dans `core/ag-grid.config.ts`).
- **Couleur du texte** : `--mtm-text-dark` (principal), `--mtm-text-muted` (secondaire). Pas de noir pur.

## Formes

- **Coins arrondis** : `--mtm-radius-sm` (6 px : pastilles, cellules), `--mtm-radius-md` (10 px : champs, boutons, cartes), `--mtm-radius-lg` (14 px : grandes cartes, fenêtres), `--mtm-radius-pill`.
- **Boutons** : 40 px de haut. Un seul bouton plein (action principale) par zone ; les autres sont en contour.

## Structure d'une page

1. Un **surtitre** (`.eyebrow`) : la rubrique du menu (« Biens », « Services », « Mon travail »…). Sur une fiche, c'est « Fiche du prospect », et **le nom de la personne est le titre**.
2. Le **titre** (`.page-header__title`).
3. Une phrase d'explication au plus.
4. Quatre **chiffres clés** au plus, et seulement ceux qui demandent une action ou qui ne sont pas à zéro.
5. Les filtres, puis la liste.

## Vocabulaire (un mot par notion)

| Notion | Mot employé | À ne pas employer |
| --- | --- | --- |
| Ce qu'on vend (terrain, villa, appartement) | **bien à vendre** | « terrain » pour parler d'un bien quelconque |
| Villa divisée, résidence, immeuble confié à gérer | **immeuble** | « propriété » (proche de « propriétaire ») |
| Un logement loué | **bien en gestion** / logement | — |
| La personne qui confie un bien | **propriétaire** | — |

## Saisie rapide

Une fiche se crée avec **l'essentiel** (nom, téléphone, e-mail) ; l'état civil, l'adresse, la pièce d'identité et la personne à prévenir se déplient **à la demande**. Un nouveau rôle part des droits d'un rôle existant plutôt que de zéro. Un raccourci « + Nouveau » existe pour chaque création fréquente, y compris le protocole.

## À éviter

- Un onglet ou un raccourci qui répète un autre onglet de la même page.
- Un choix de filtre qui ne donnerait aucun résultat (on le masque, sauf s'il est sélectionné).
- Une liste native du navigateur (`<select>`) : utiliser les champs Material, comme partout.
- Une valeur de taille ou d'arrondi écrite en dur : prendre la variable.

## Vérifier

Les mesures (tailles de texte, couleurs, arrondis, hauteur des boutons, contrastes, débordements) se refont en parcourant toutes les pages avec un navigateur piloté ; la dernière mesure donne 13 tailles de texte distinctes (47 auparavant) et plus aucun onglet coupé.
