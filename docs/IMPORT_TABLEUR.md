# Reprise du tableur « Bd terrains MTM IMMO »

Pour verser dans l'application les biens aujourd'hui suivis dans le Google
Sheet, **sans les saisir un par un**. L'import est sans risque par défaut : il
montre d'abord ce qu'il ferait, ne publie rien sur le site et ne touche jamais
à un bien déjà présent.

## 1. Depuis le back-office (méthode recommandée)

1. **Biens → Importer depuis Excel** (réservé aux utilisateurs qui peuvent
   créer des biens).
2. Déposer le fichier **.xlsx** (le classeur Excel ou Google Sheets
   téléchargé tel quel) ou **.csv**, 5 Mo et 5 000 lignes au maximum. Un
   classeur à plusieurs onglets propose de choisir l'onglet (« BD officielle »,
   puis « ARCHIVES » à part).
3. **Aperçu** : biens à créer, déjà présents, lignes refusées avec la raison,
   avertissements ligne par ligne (numéros de ligne tels que dans Excel).
   Rien n'est écrit à ce stade.
4. **Importer N biens** pour confirmer. Les biens sont créés en *Brouillon* ;
   les cases à cocher permettent de reprendre un onglet déjà archivé, ou
   (administrateur, direction) de publier les « Disponible ».

Téléchargement du classeur depuis Google Sheets : *Fichier → Télécharger →
Microsoft Excel (.xlsx)*. L'en-tête n'a pas à être en première ligne : il est
retrouvé sous les lignes de titre.

Les colonnes sont reconnues par leur titre (voir
`docs/modele-import-terrains.csv`) : MATRICUL, LOCALITE, Nbre T, TITRE
JURIDIQUE, PRIX DE CESSION, PRIX, PROPRIETAIRE/MANDATAIRE, TELEPHONE, VENDU,
SURFACE, MODALITE DE PAIEMENT, DATE ENTREE, DIRECT, PROTOCOLE D'ACCORD. L'ordre
importe peu, une colonne absente est ignorée. Seules **LOCALITE** et **TITRE
JURIDIQUE** sont indispensables.

Sécurité : seules les valeurs des cellules sont lues (jamais de formule ni de
macro exécutée) ; l'extension et la signature du fichier sont vérifiées ; chaque
import est consigné dans le journal d'audit (`terrain.imported`) ; un
commercial n'importe que des biens dont il devient responsable.

## 2. En ligne de commande (reprises en masse)

```bash
cd apps/api
# essai à blanc : rien n'est écrit
npm run import:terrains -- ../../tableur.xlsx --feuille="BD officielle" --rapport=rapport.json
# écriture
npm run import:terrains -- ../../tableur.xlsx --feuille="BD officielle" --apply
npm run import:terrains -- ../../tableur.xlsx --feuille="ARCHIVES" --archives --apply
```

Options : `--responsable=email` (affecte les biens à un commercial),
`--publier-disponibles`. Sur la production, faire l'essai à blanc, faire relire
le rapport par MTM, puis lancer `--apply` avec le `DATABASE_URL` de production.

## 3. Ce que fait l'import de chaque colonne

| Colonne du tableur | Devient | Remarques |
| --- | --- | --- |
| MATRICUL | Matricule **et** référence interne | Un matricule répété, ou vide, reçoit un suffixe de ligne (`TMB-L44`, `IMP-L12`) |
| LOCALITE | Nom du bien et localisation | |
| Nbre T | Nombre de lots | Valeur illisible (« ? », « 7 Ha ») : ignorée, gardée en note interne |
| TITRE JURIDIQUE | Statut juridique | « Deliberation », « DELIBERATION », « Délibération double tampon », « BAIL en cour », « Notification »… sont ramenés à la liste paramétrée. **Un titre inconnu (« DG ») refuse la ligne** |
| PRIX DE CESSION | Prix de cession (interne) | |
| PRIX | Prix public | « 2 million 700 » → 2 700 000. Intervalle (« 3 000 000/3 500 000 ») : première valeur, avertissement. Faute de frappe (« 3 500 00 ») : écarté, gardé en note |
| PROPRIETAIRE/MANDATAIRE, TELEPHONE | Vendeur / mandataire du bien | Un numéro invalide (« DG ») est écarté et gardé en note. Aucun propriétaire n'est créé : à rattacher plus tard |
| VENDU | Statut commercial et suivi de visite | « A VISITER DISPONIBLE » → visite « À visiter » ; « Vendu » → Vendu |
| SURFACE | Superficie (m²) | « 7 Ha » → 70 000 m² ; « 225m²/300m² » : première valeur, avertissement |
| MODALITE DE PAIEMENT | Modalité | cash → Cash, morato/moratoi → Moratoire |
| DATE ENTREE | Date d'entrée | jj/mm/aaaa |
| DIRECT, PROTOCOLE D'ACCORD | Produit direct, protocole signé | Case non vide / « oui » |
| images | — | Ignorée : les photos se déposent ensuite sur chaque fiche |

**Statut commercial.** Par défaut tout est repris en *Brouillon* : un bien du
tableur « Disponible » n'apparaît pas d'un coup sur le site sans photo ni
relecture. La case « Publier les Disponible » (ou `--publier-disponibles`) le
publie explicitement.

## 4. Rejouer un import

Relancer un fichier corrigé est sans danger : une référence déjà présente n'est
ni modifiée ni recréée. Seules les lignes qui manquaient sont ajoutées.

## 5. Après l'import

- Les lignes colorées du tableur (rouge, rose, bleu) ne sont pas reprises :
  leur sens n'est pas documenté. À faire préciser par MTM.
- Les notes internes de chaque bien contiennent la saisie d'origine de toute
  valeur écartée, pour la ressaisir sans retourner au tableur.
- Les mandataires ne sont pas rattachés à des fiches propriétaires.
