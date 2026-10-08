# Reprise du tableur « Bd terrains MTM IMMO »

Procédure pour verser dans l'application les biens aujourd'hui suivis dans le
Google Sheet. L'import est **sans risque par défaut** : il n'écrit rien tant
que `--apply` n'est pas passé, il ne publie rien sur le site, il ne touche
jamais à un bien déjà présent.

## 1. Préparer le fichier

1. Dans Google Sheets, ouvrir l'onglet à reprendre (« BD officielle », puis
   « ARCHIVES » séparément).
2. *Fichier → Télécharger → Valeurs séparées par des virgules (.csv)*.
3. Les colonnes sont reconnues par leur titre (voir `docs/modele-import-terrains.csv`) :
   N°, MATRICUL, LOCALITE, Nbre T, TITRE JURIDIQUE, images, PRIX DE CESSION,
   PRIX, PROPRIETAIRE/MANDATAIRE, TELEPHONE, VENDU, SURFACE, MODALITE DE
   PAIEMENT, DATE ENTREE, DIRECT, PROTOCOLE D'ACCORD. L'ordre importe peu, une
   colonne absente est simplement ignorée. Seules **LOCALITE** et **TITRE
   JURIDIQUE** sont indispensables.

## 2. Essai à blanc

```bash
cd apps/api
npm run import:terrains -- ../../tableur-bd-officielle.csv --rapport=rapport.json
```

Le rapport indique : biens à créer, déjà présents (ignorés), lignes refusées
avec la raison, avertissements. Rien n'est écrit.

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
relecture. `--publier-disponibles` le publie explicitement.

## 4. Écriture

```bash
npm run import:terrains -- ../../tableur-bd-officielle.csv --apply
npm run import:terrains -- ../../tableur-archives.csv --archives --apply
```

- `--archives` reprend les biens déjà archivés (motif « Repris de l'onglet ARCHIVES »).
- `--responsable=email` affecte les biens à un commercial (sans cela, seuls
  l'encadrement et l'administrateur les voient).
- Relancer le script après correction du fichier est sans danger : une
  référence déjà présente n'est ni modifiée ni recréée.
- Une ligne d'audit `terrain.imported` consigne chaque exécution.

Sur la production, exécuter d'abord l'essai à blanc, faire relire le rapport
par MTM, puis lancer `--apply` avec le `DATABASE_URL` de production.

## 5. Après l'import

- Les lignes colorées du tableur (rouge, rose, bleu) ne sont pas reprises :
  leur sens n'est pas documenté. À faire préciser par MTM.
- Les notes internes de chaque bien contiennent la saisie d'origine de toute
  valeur écartée, pour la ressaisir sans retourner au tableur.
- Les mandataires ne sont pas rattachés à des fiches propriétaires.
