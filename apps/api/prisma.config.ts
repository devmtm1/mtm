import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Adresse utilisée par la ligne de commande Prisma (migrate, seed).
 *
 * Les migrations prennent un verrou de base (pg_advisory_lock) qui ne passe pas
 * par le « pooler » de Neon : le déploiement expirait avec l'erreur P1002.
 * On utilise donc une adresse directe : `DIRECT_URL` si elle est définie, sinon
 * `DATABASE_URL` privée de « -pooler » dans le nom d'hôte. L'application, elle,
 * garde `DATABASE_URL` (le pooler convient aux requêtes courantes).
 */
export function adresseMigration(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DIRECT_URL) return env.DIRECT_URL;
  const url = env.DATABASE_URL ?? '';
  return url.replace(/(@[^/?:]*?)-pooler(\.)/, '$1$2');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: adresseMigration(),
  },
});
