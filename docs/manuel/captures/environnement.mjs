// Environnement jetable pour refaire les captures d'écran du guide.
//
// Démarre, sur ce poste et nulle part ailleurs :
//   - un PostgreSQL embarqué (répertoire temporaire détruit à l'arrêt) ;
//   - l'API MTM, migrée et initialisée (rôles, droits, compte administrateur) ;
//   - le back-office (build de développement) servi sur http://localhost:4200.
//
// Aucune base de dev ou de production n'est touchée : l'adresse de base de données est
// fabriquée ici et passée en variable d'environnement aux seuls processus lancés.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer as serveurHttp } from 'node:http';
import { connect as connecter, createServer as serveurTcp } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const API = join(RACINE, 'apps', 'api');
const FRONT = join(RACINE, 'apps', 'backoffice');

export const PORT_API = 3000; // celui de environment.ts (build de développement)
export const PORT_FRONT = 4300; // 4200 est souvent pris par un `ng serve` lancé à la main
export const MOT_DE_PASSE_ADMIN_INITIAL = 'Initial-Captures-2026!';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function lancer(commande, args, { cwd, env, silencieux = false } = {}) {
  return new Promise((resolve) => {
    const enfant = spawn(commande, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: silencieux ? 'ignore' : 'inherit',
      shell: process.platform === 'win32',
    });
    enfant.on('exit', (code) => resolve(code ?? 1));
  });
}

function portLibre() {
  return new Promise((resolve, reject) => {
    const serveur = serveurTcp();
    serveur.listen(0, '127.0.0.1', () => {
      const { port } = serveur.address();
      serveur.close(() => resolve(port));
    });
    serveur.on('error', reject);
  });
}

/** Un port est occupé si quelqu'un répond dessus, en IPv4 comme en IPv6 (`localhost` choisit l'un ou l'autre). */
async function portOccupe(port) {
  const repond = (hote) =>
    new Promise((resolve) => {
      const socket = connecter({ host: hote, port });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
  return (await repond('127.0.0.1')) || (await repond('::1'));
}

async function supprimerRepertoire(dir) {
  for (let essai = 0; essai < 10 && existsSync(dir); essai++) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* nouvel essai : Windows relâche les fichiers un instant après l'arrêt */
    }
    if (existsSync(dir)) await pause(500);
  }
}

async function attendre(url, delaiMs = 120_000) {
  const fin = Date.now() + delaiMs;
  let derniere = 'aucune réponse';
  while (Date.now() < fin) {
    try {
      const reponse = await fetch(url);
      if (reponse.ok) return;
      derniere = `HTTP ${reponse.status}`;
    } catch (erreur) {
      derniere = `${erreur.message} (${erreur.cause?.code ?? 'sans code'})`;
    }
    await pause(500);
  }
  throw new Error(`Délai dépassé en attendant ${url} : ${derniere}`);
}

/** Sert un dossier statique, avec repli sur index.html pour les routes de l'application. */
function servirDossier(dossier, port) {
  const serveur = serveurHttp((requete, reponse) => {
    const chemin = normalize(decodeURIComponent((requete.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
    let fichier = join(dossier, chemin);
    if (!fichier.startsWith(dossier) || !existsSync(fichier) || statSync(fichier).isDirectory()) {
      fichier = join(dossier, 'index.html');
    }
    reponse.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
    createReadStream(fichier).pipe(reponse);
  });
  return new Promise((resolve) => serveur.listen(port, '127.0.0.1', () => resolve(serveur)));
}

/**
 * @param {{ reconstruireFront?: boolean }} options
 * @returns {Promise<{ urlApi: string, urlFront: string, urlBase: string, arreter: () => Promise<void> }>}
 */
export async function demarrer({ reconstruireFront = true } = {}) {
  for (const port of [PORT_API, PORT_FRONT]) {
    if (await portOccupe(port)) {
      throw new Error(`Le port ${port} est déjà utilisé : arrêtez l'API ou le back-office lancés à la main.`);
    }
  }

  // 1. Base de données jetable.
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const port = await portLibre();
  const dataDir = mkdtempSync(join(tmpdir(), 'mtm-captures-pg-'));
  const base = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: 'mtm_captures',
    password: 'mtm_captures',
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    persistent: false,
    onLog: () => {},
    onError: (erreur) => console.error('[postgres embarqué]', erreur),
  });
  console.log(`[captures] PostgreSQL embarqué sur le port ${port}…`);
  await base.initialise();
  await base.start();
  await base.createDatabase('mtm_captures');
  const urlBase = `postgresql://mtm_captures:mtm_captures@localhost:${port}/mtm_captures`;

  let enfantApi = null;
  let serveurFront = null;
  const arreter = async () => {
    if (serveurFront) serveurFront.close();
    if (enfantApi) {
      // Sous Windows, tuer le shell ne tue pas toujours le processus node : on termine l'arbre.
      if (process.platform === 'win32') await lancer('taskkill', ['/pid', String(enfantApi.pid), '/T', '/F'], { silencieux: true });
      else enfantApi.kill('SIGTERM');
    }
    await base.stop().catch(() => {});
    await supprimerRepertoire(dataDir);
  };

  try {
    const env = {
      DATABASE_URL: urlBase,
      JWT_ACCESS_SECRET: 'captures-secret-acces-0123456789abcdef0123456789',
      JWT_REFRESH_SECRET: 'captures-secret-refresh-0123456789abcdef012345',
      SEED_ADMIN_PASSWORD: MOT_DE_PASSE_ADMIN_INITIAL,
      NODE_ENV: 'development',
      PORT: String(PORT_API),
      CORS_ORIGIN: `http://localhost:${PORT_FRONT}`,
      // Ici, des dizaines de connexions en quelques secondes sont normales : on relève les limites.
      LOGIN_RATE_LIMIT_MAX: '1000',
      GLOBAL_RATE_LIMIT_MAX: '100000',
      CONTACT_RATE_LIMIT_MAX: '1000',
    };

    // 2. Migrations et données de base (rôles, droits, compte administrateur).
    console.log('[captures] Migrations…');
    if ((await lancer('npx', ['prisma', 'migrate', 'deploy'], { cwd: API, env })) !== 0) throw new Error('Migrations en échec');
    console.log('[captures] Initialisation (rôles, droits, administrateur)…');
    if ((await lancer('npm', ['run', 'prisma:seed'], { cwd: API, env })) !== 0) throw new Error('Initialisation en échec');

    // 3. API.
    if (!existsSync(join(API, 'dist', 'main.js'))) {
      console.log("[captures] Compilation de l'API…");
      if ((await lancer('npm', ['run', 'build'], { cwd: API, env })) !== 0) throw new Error("Compilation de l'API en échec");
    }
    console.log(`[captures] API sur le port ${PORT_API}…`);
    enfantApi = spawn('node', ['dist/main.js'], { cwd: API, env: { ...process.env, ...env }, stdio: process.env.CAPTURES_DEBUG ? 'inherit' : 'ignore', shell: false });
    await attendre(`http://localhost:${PORT_API}/api/health/live`, 40_000);

    // 4. Back-office (build de développement : il parle à l'API locale).
    // Dossier à part : le build de développement ne doit jamais écraser le build de production.
    const dossierFront = join(FRONT, 'dist', 'captures', 'browser');
    if (reconstruireFront || !existsSync(join(dossierFront, 'index.html'))) {
      console.log('[captures] Compilation du back-office…');
      if ((await lancer('npx', ['ng', 'build', '--configuration', 'development', '--output-path', 'dist/captures'], { cwd: FRONT })) !== 0) {
        throw new Error('Compilation du back-office en échec');
      }
    }
    serveurFront = await servirDossier(dossierFront, PORT_FRONT);
    console.log(`[captures] Back-office sur http://localhost:${PORT_FRONT}`);

    return { urlApi: `http://localhost:${PORT_API}/api`, urlFront: `http://localhost:${PORT_FRONT}`, urlBase, arreter };
  } catch (erreur) {
    await arreter();
    throw erreur;
  }
}
