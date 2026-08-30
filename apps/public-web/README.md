# public-web

Site public MTM Immobilier, implemente avec React, TypeScript, Vite, Tailwind
CSS et Lucide React.

## Developpement

Depuis la racine du monorepo :

```bash
npm run public-web:dev
```

Le site est disponible sur `http://localhost:5173`.

## Tests

```bash
npm test
```

Les tests couvrent le chargement et le filtrage du catalogue terrain ainsi que
les états de succès et d'erreur du formulaire de contact.

## Donnees publiques

Le catalogue appelle `GET /api/terrains/public`. Cette API ne renvoie que les
terrains disponibles et exclut les donnees internes (prix d'acquisition,
marges, commissions, notes et proprietaires). Les terrains affiches proviennent
exclusivement de cette API ; en cas d'indisponibilite, le catalogue reste vide.

La variable `VITE_API_URL` permet de remplacer l'URL par defaut
(`http://localhost:3001/api`).

Le bouton WhatsApp utilise la variable `VITE_WHATSAPP_NUMBER`, au format
international sans espaces ni signe `+` (par exemple `221770000000`).

La video du hero utilise `VITE_HERO_VIDEO_URL` pour remplacer la source video
distante par une source hebergee par le projet si necessaire.

## Architecture frontend

Le code est organise par responsabilite afin de garder les pages lisibles et
les features evolutives :

```text
src/
	components/       composants UI reutilisables et composants de feature
	domain/           contrats et donnees metier stables
	hooks/            etat, effets et orchestration reutilisable
	services/         acces API et transport uniquement
	pages/            pages composees par route (a ajouter avec les nouvelles routes)
	features/         modules fonctionnels autonomes lorsque leur perimetre grandit
```

Regles principales :

- `App` orchestre la page et ne definit pas les contrats API ;
- les composants recoivent leurs donnees et callbacks par props ;
- les hooks gerent les effets et etats d'interface, les services gerent `fetch` ;
- les donnees publiques restent encapsulees dans `domain/terrains` et viennent
	exclusivement du service API ;
- une nouvelle page doit etre creee dans `pages/` puis composee avec des
	composants de `components/` ou de sa feature, sans dupliquer l'acces API.
