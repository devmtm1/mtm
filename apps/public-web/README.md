# MTM Immobilier — Site public

Site vitrine public (React + TypeScript + Vite), conforme à la Phase 1 du
cahier des charges (sections 5, 6, 7, 11) : accueil, catalogue de terrains,
fiche terrain détaillée (galerie, carte Leaflet, points d'intérêt), nos
réalisations, projets à venir, actualités, à propos, présentation des
services (gestion locative, construction, démarches administratives) et
contact (formulaire + demande de réservation).

## Démarrage

```bash
cp .env.example .env   # VITE_API_URL par défaut : http://localhost:3000/api
npm run dev             # http://localhost:5173
```

L'API doit tourner en parallèle (`npm run api:dev` à la racine du monorepo).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (`tsc -b && vite build`) |
| `npm run preview` | Sert le build de production en local |
| `npm run lint` | ESLint |
| `npm run test` | Tests Vitest |

## Architecture

- `src/api/` — un module par ressource (`terrains`, `content`, `showcase`,
  `contact`, `reservations`), tous passent par `src/api/client.ts` (fetch
  centralisé + gestion d'erreur uniforme).
- `src/hooks/` — un hook par domaine de données ; `useAsyncData` factorise
  le câblage loading/error commun aux hooks de lecture.
- `src/types/` — reflet strict des DTO publics du backend. Ne jamais y
  ajouter un champ interne (prix d'acquisition, marge, commission) : ces
  champs ne sont de toute façon jamais renvoyés par les endpoints publics.
- `src/components/ui/` — primitives réutilisables (Button, Modal, FormField...).
- `src/components/{terrains,showcase,contact,reservation,home,layout}/` —
  composants métier regroupés par domaine.
- `src/pages/` — une page par route, orchestration uniquement (peu de
  logique propre, délègue aux hooks/composants).

## Espace client

Connexion (`/espace-client/connexion`) + portail (`/espace-client`, protégé) :
dossiers, réservations, paiements, documents du client connecté. Gère aussi
la double authentification (si activée sur le compte), le changement de mot
de passe obligatoire au premier accès (`mustChangePassword`), et la
réinitialisation de mot de passe oublié.

Authentification : JWT en mémoire (jamais localStorage) + cookie httpOnly
pour le refresh token, reprise de session silencieuse au chargement de l'app
(`AuthProvider`). Toute la logique d'auth vit dans `src/contexts/`,
`src/api/auth.ts` et `src/components/auth/`.
