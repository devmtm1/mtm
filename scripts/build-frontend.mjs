/**
 * Build des deux interfaces pour Cloudflare Pages.
 *
 * Pages n'a qu'une seule commande de build par projet, mais expose la branche
 * déployée dans CF_PAGES_BRANCH. On s'en sert pour choisir l'environnement :
 * « main » construit la production, toute autre branche construit la version
 * de test. En local, sans cette variable, on construit la production.
 *
 * Usage : node scripts/build-frontend.mjs backoffice|public-web
 */
import { spawnSync } from 'node:child_process';

const cible = process.argv[2];
if (!['backoffice', 'public-web'].includes(cible)) {
  console.error('Usage : node scripts/build-frontend.mjs backoffice|public-web');
  process.exit(1);
}

const branche = process.env.CF_PAGES_BRANCH ?? 'main';
const production = branche === 'main';
const environnement = production ? 'production' : 'test';
console.log(`Branche « ${branche} » → build de ${cible} en ${environnement}.`);

const commandes =
  cible === 'backoffice'
    ? [
        ['npm', ['install', '--workspace=apps/backoffice']],
        [
          'npm',
          [
            'run',
            'build',
            '--workspace=apps/backoffice',
            '--',
            `--configuration=${production ? 'production' : 'staging'}`,
          ],
        ],
      ]
    : [
        ['npm', ['install', '--workspace=apps/public-web']],
        ['npm', ['run', 'build', '--workspace=apps/public-web']],
      ];

for (const [commande, args] of commandes) {
  const resultat = spawnSync(commande, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (resultat.status !== 0) process.exit(resultat.status ?? 1);
}
