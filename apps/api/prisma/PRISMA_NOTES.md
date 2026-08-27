# Notes Prisma - validation de l'environnement

## Validation actuelle

- `npx prisma generate` reussit avec Prisma Client v6.19.3.
- `npx prisma migrate deploy` ne signale aucune migration en attente.
- Le seed et le build API reussissent contre PostgreSQL local.
- Les migrations et le schema sont conserves dans le depot.

## Reserve restante

Le parcours e2e critique utilise encore `FakePrismaService` pour isoler le
cablage HTTP. Un scenario CI separe sans override Prisma doit etre ajoute pour
certifier les requetes, contraintes et persistances SQL sur PostgreSQL de test.

## Verification de qualite

Le lint API termine avec 0 erreur. Des avertissements restent principalement
lies aux types de `supertest` dans le test e2e et aux mocks de test.

Commandes de non-regression :

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
npx eslint "src/**/*.ts" "test/**/*.ts"
npm run build
npx jest --runInBand
```

Le service API utilise `DATABASE_URL` et le service de sauvegarde Docker utilise
la meme base via le reseau Compose. Les secrets ne doivent jamais etre committe;
configurer les valeurs reelles dans l'environnement d'execution.
