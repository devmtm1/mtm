/**
 * Sélection et protection de la base des tests e2e.
 *
 * Les suites e2e écrivent dans une vraie base PostgreSQL et la VIDENT avant
 * chaque scénario. Elles ne lisent donc jamais DATABASE_URL (celle du
 * développement) : la base de test vient exclusivement de E2E_DATABASE_URL,
 * et doit être locale avec un nom terminé par `_test`. Sans cela, les suites
 * sont ignorées avec un avertissement — jamais exécutées « au cas où ».
 */
export function resolveE2eDatabaseUrl(): string | null {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) return null;
  if (process.env.E2E_ALLOW_TRUNCATE === 'true') return url;
  try {
    const parsed = new URL(url);
    const isLocal = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    const name = parsed.pathname.replace(/^\//, '');
    return isLocal && name.endsWith('_test') ? url : null;
  } catch {
    return null;
  }
}

const e2eDatabaseUrl = resolveE2eDatabaseUrl();

if (!e2eDatabaseUrl) {
  console.warn(
    '[e2e] Suites ignorées : E2E_DATABASE_URL absente ou ne désigne pas une base locale jetable (nom en *_test). Voir docker-compose.test.yml.',
  );
}

/** `describe` si une base de test jetable est disponible, `describe.skip` sinon. */
export const describeE2e: jest.Describe = e2eDatabaseUrl
  ? describe
  : describe.skip;

export function e2eDatabaseUrlOrThrow(): string {
  if (!e2eDatabaseUrl) throw new Error('E2E_DATABASE_URL indisponible');
  return e2eDatabaseUrl;
}
