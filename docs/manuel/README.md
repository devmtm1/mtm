# Guide d’utilisation de l’équipe MTM

Le guide est une **page web** servie par le back-office, à l’adresse **`/manuel/`** (menu *Mon compte › Guide d’utilisation*). Il s’adresse à toute l’équipe : commerciaux, responsables, direction, comptabilité, gestion locative, vérifications, chantiers, administration.

On peut aussi **double-cliquer sur `apps/backoffice/public/manuel/index.html`** pour l’ouvrir directement depuis le dépôt (les adresses du guide sont relatives). Il fonctionne dans n’importe quel navigateur, sans connexion au back-office, avec recherche, choix du métier (« Je suis… ») et lecture sur téléphone. Il s’imprime proprement (*Ctrl + P* → « Enregistrer au format PDF » donne tous les chapitres).

> La page est publique pour qui connaît l’adresse (elle n’est pas indexée par les moteurs de recherche). Elle ne contient ni donnée réelle ni secret : les captures montrent des données fictives.

## Ce qui est où

| Chemin | Rôle |
| --- | --- |
| `docs/manuel/chapitres/*.md` | Le **texte**, un fichier par chapitre (c’est ici qu’on corrige) |
| `docs/manuel/assets/` | La **feuille de style** et le **script** de la page (aucun script en ligne : la politique de sécurité du back-office n’autorise que `'self'`) |
| `docs/manuel/build.mjs` | Le **générateur** |
| `apps/backoffice/public/manuel/` | Le **résultat** (page, style, script) et les **captures** (`img/`) — servi tel quel par le back-office |

## Mettre à jour le guide

1. Modifiez le chapitre concerné dans `docs/manuel/chapitres/`.
2. `npm run manuel` (à la racine du dépôt) régénère `apps/backoffice/public/manuel/index.html`. Le générateur **signale toute image introuvable**.
3. Vérifiez dans le navigateur (`ng serve` puis `/manuel/`), puis commitez les chapitres **et** le résultat généré.

### En-tête d’un chapitre

```
---
id: gestion-locative          # sert dans l’adresse : /manuel/#gestion-locative
titre: La gestion locative
groupe: base | metier | reference
resume: Une phrase affichée sous le titre et sur les cartes de l’accueil.
roles: gestion_locative direction     # métiers pour qui le chapitre est signalé « pour vous »
---
```

Métiers reconnus dans `roles` : `tous`, `commercial`, `responsable_commercial`, `direction`, `comptabilite`, `gestion_locative`, `verifications`, `chantiers`, `administrateur`, `rh`.

### Écrire

- Markdown courant ; les images s’écrivent `![Légende](img/nom.png)` (un fichier dont le nom contient « telephone » s’affiche en petit, côte à côte).
- Un bloc `> **Attention** — …` ou `> **Important** — …` prend la couleur d’alerte.
- Phrases courtes, **vouvoiement**, et boutons nommés **exactement comme à l’écran**.

## Refaire les captures d’écran

Les captures montrent le back-office avec des **données fictives**. Pour les refaire après un changement d’interface :

1. Lancer l’API sur une **base jetable** (le test e2e utilise un PostgreSQL embarqué : `apps/api/test/e2e-runner.mjs`) — **jamais sur la base de dev ou de production**.
2. Y créer quelques comptes (un par rôle) et des dossiers fictifs, comme le font les scénarios e2e.
3. Construire le back-office en développement (`ng build --configuration development`), le servir, et photographier chaque écran avec le compte du rôle concerné (viewport 1366 × 820).
4. Optimiser les PNG (256 couleurs suffisent : de 10 Mo à 4 Mo pour l’ensemble).

Ne mettez **jamais** de donnée réelle (clients, montants, pièces d’identité) dans une capture : le dossier `test reel/` reste hors du dépôt.
