/**
 * Compare les migrations versionnées au schéma Prisma et affiche le SQL qui
 * manque (vide = aucune dérive). Utilise un PostgreSQL embarqué comme base
 * fantôme : ni Docker ni base distante.
 *
 * Avec SHADOW_DATABASE_URL (la CI), cette base est utilisée à la place : elle doit
 * exister ; Prisma la réinitialise.
 *
 * Usage : node test/migration-diff.mjs
 * Sortie : le SQL manquant sur la sortie standard ; code 2 s'il y en a.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

const externe = process.env.SHADOW_DATABASE_URL;
const { default: EmbeddedPostgres } = externe
  ? { default: null }
  : await import('embedded-postgres');
const port = externe ? 0 : await freePort();
const dataDir = externe ? null : mkdtempSync(join(tmpdir(), 'mtm-diff-pg-'));
const pg = externe
  ? null
  : new EmbeddedPostgres({
      databaseDir: dataDir,
      port,
      user: 'mtm_test',
      password: 'mtm_test',
      persistent: false,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      onLog: () => {},
      onError: () => {},
    });
let code = 1;
try {
  if (pg) {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('shadow');
  }
  const result = spawnSync(
    'npx',
    [
      'prisma',
      'migrate',
      'diff',
      '--from-migrations',
      'prisma/migrations',
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--shadow-database-url',
      externe ?? `postgresql://mtm_test:mtm_test@localhost:${port}/shadow`,
      '--script',
    ],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    code = 1;
  } else {
    const sql = result.stdout.trim();
    if (sql === '-- This is an empty migration.' || sql === '') {
      console.log('Aucune dérive : les migrations correspondent au schéma.');
      code = 0;
    } else {
      console.log(sql);
      code = 2;
    }
  }
} finally {
  if (pg) await pg.stop().catch(() => {});
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}
process.exit(code);
