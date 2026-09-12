/**
 * Lance les tests e2e sur une base PostgreSQL jetable.
 *
 * - Si E2E_DATABASE_URL est déjà définie (CI, base Docker locale), elle est
 *   utilisée telle quelle après application des migrations.
 * - Sinon, un PostgreSQL embarqué est démarré sur un port libre, dans un
 *   répertoire temporaire détruit à la fin : aucun Docker, aucune
 *   installation, et surtout aucun risque de toucher la base de dev.
 *
 * Usage : npm run test:e2e [-- <options jest>]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const jestArgs = process.argv.slice(2);

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/**
 * Sous Windows, le processus postgres relâche ses fichiers un instant après
 * l'arrêt : on réessaie quelques fois plutôt que de laisser un répertoire
 * temporaire derrière nous.
 */
async function removeDataDir(dir) {
  for (let attempt = 0; attempt < 10 && existsSync(dir); attempt++) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* nouvel essai */
    }
    if (existsSync(dir)) await sleep(500);
  }
  if (existsSync(dir)) console.warn(`[e2e] Répertoire temporaire non supprimé : ${dir}`);
}

async function main() {
  let databaseUrl = process.env.E2E_DATABASE_URL;
  let embedded = null;
  let dataDir = null;

  if (!databaseUrl) {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const port = await freePort();
    dataDir = mkdtempSync(join(tmpdir(), 'mtm-e2e-pg-'));
    embedded = new EmbeddedPostgres({
      databaseDir: dataDir,
      port,
      user: 'mtm_test',
      password: 'mtm_test',
      persistent: false,
      onLog: () => {},
      onError: (error) => console.error('[postgres embarqué]', error),
    });
    console.log(`[e2e] PostgreSQL embarqué sur le port ${port}…`);
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase('mtm_immobilier_test');
    databaseUrl = `postgresql://mtm_test:mtm_test@localhost:${port}/mtm_immobilier_test`;
  }

  let code = 1;
  try {
    console.log('[e2e] Application des migrations…');
    code = await run('npx', ['prisma', 'migrate', 'deploy'], {
      DATABASE_URL: databaseUrl,
    });
    if (code === 0) {
      code = await run(
        'npx',
        ['jest', '--config', './test/jest-e2e.json', '--runInBand', ...jestArgs],
        { E2E_DATABASE_URL: databaseUrl },
      );
    }
  } finally {
    if (embedded) {
      await embedded.stop().catch(() => {});
      if (dataDir) await removeDataDir(dataDir);
    }
  }
  process.exit(code);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
