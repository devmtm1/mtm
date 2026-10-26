/**
 * Teste le site public en local, sans rien pousser ni toucher à la production.
 *
 *   npm run dev:local
 *
 * Démarre, sur ce poste seulement :
 *   - un PostgreSQL embarqué jetable (détruit à l'arrêt) avec des données fictives (biens, locations…) ;
 *   - l'API MTM sur http://localhost:3000 (recompilée à chaque lancement) ;
 *   - le site public sur http://localhost:5173, qui se met à jour à chaque enregistrement d'un fichier.
 *
 * Aucune base réelle n'est utilisée : l'adresse de la base est fabriquée ici. Les images envoyées vont
 * dans un dossier Cloudinary de test (`mtm-local-test`), pas dans celui du site. Ctrl+C arrête tout.
 *
 * Pour essayer aussi le back-office sur cette même API, ouvrir un second terminal :
 *   npm run backoffice:dev        (http://localhost:4200)
 * puis se connecter avec  fatou.diop@mtm.test  /  Captures-2026!x   (compte commercial de démonstration).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerUtilisateurs, preparerAdministrateur } from '../docs/manuel/captures/donnees.mjs';
import { MOT_DE_PASSE } from '../docs/manuel/captures/comptes.mjs';
import { demarrer, PORT_API } from '../docs/manuel/captures/environnement.mjs';
import { peuplerDonnees } from '../docs/manuel/captures/jeu-donnees.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(RACINE, 'apps', 'public-web');

/** Premier port libre à partir de 5173 : un autre projet peut déjà occuper celui-là. */
async function premierPortLibre(depart) {
  for (let port = depart; port < depart + 20; port++) {
    const libre = await new Promise((resolve) => {
      const serveur = createServer();
      serveur.once('error', () => resolve(false));
      serveur.listen(port, '127.0.0.1', () => serveur.close(() => resolve(true)));
    });
    // Un serveur IPv6 seul (« localhost » de Vite) ne bloque pas le test IPv4 : on vérifie aussi ::1.
    const libreV6 = await new Promise((resolve) => {
      const serveur = createServer();
      serveur.once('error', () => resolve(false));
      serveur.listen(port, '::1', () => serveur.close(() => resolve(true)));
    });
    if (libre && libreV6) return port;
  }
  throw new Error('Aucun port libre entre 5173 et 5192 pour le site.');
}
const PORT_SITE = await premierPortLibre(5173);

console.log("Préparation de l'environnement local (première fois : 1 à 2 minutes)…");
const env = await demarrer({
  sansFront: true,
  reconstruireApi: true,
  // Les images envoyées pendant les essais ne se mélangent pas à celles du vrai site.
  envSupplementaire: {
    CLOUDINARY_FOLDER: 'mtm-local-test',
    // L'API accepte le site sur le port choisi, et le back-office lancé à la main (4200).
    CORS_ORIGIN: `http://localhost:${PORT_SITE},http://localhost:4200`,
  },
});

let site = null;
let arret = false;
async function arreter(code = 0) {
  if (arret) return;
  arret = true;
  console.log('\nArrêt…');
  if (site) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(site.pid), '/T', '/F'], { stdio: 'ignore' });
    else site.kill('SIGTERM');
  }
  await env.arreter();
  process.exit(code);
}
process.on('SIGINT', () => arreter(0));
process.on('SIGTERM', () => arreter(0));

try {
  console.log('Données de démonstration…');
  const { api } = await preparerAdministrateur(env.urlApi);
  const clients = await creerUtilisateurs(env.urlApi, api);
  await peuplerDonnees({ admin: api, clients });

  site = spawn('npm', ['run', 'dev', '--', '--port', String(PORT_SITE), '--strictPort', '--host', 'localhost'], {
    cwd: SITE,
    env: { ...process.env, VITE_API_URL: `http://localhost:${PORT_API}/api` },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  site.on('exit', () => arreter(0));

  console.log(`
────────────────────────────────────────────────────────────
  Site public : http://localhost:${PORT_SITE}
  API locale  : http://localhost:${PORT_API}/api   (base jetable, données fictives)
  Back-office : npm run backoffice:dev (autre terminal)
                fatou.diop@mtm.test / ${MOT_DE_PASSE}
  Ctrl+C pour tout arrêter (la base fictive est alors détruite).
────────────────────────────────────────────────────────────
`);
} catch (erreur) {
  console.error(erreur);
  await arreter(1);
}
