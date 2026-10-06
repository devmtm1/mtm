import 'reflect-metadata';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PERMISSIONS_KEY } from './decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AUTHENTICATED_KEY } from './decorators/authenticated.decorator';

/**
 * Contrat d'accès de l'API : chaque route déclare qui peut l'appeler. Le garde
 * refuse les routes muettes ; ce test les fait remonter à la compilation
 * des tests plutôt qu'en production.
 */
const SRC = resolve(__dirname, '../..');

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return controllerFiles(chemin);
    return nom.endsWith('.controller.ts') ? [chemin] : [];
  });
}

const METHODES_HTTP = new Set([0, 1, 2, 3, 4]); // GET, POST, PUT, DELETE, PATCH

describe('contrat d’accès des routes', () => {
  const muettes: string[] = [];
  let total = 0;

  beforeAll(() => {
    for (const fichier of controllerFiles(SRC)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require(fichier) as Record<string, unknown>;
      for (const exporte of Object.values(module)) {
        if (typeof exporte !== 'function') continue;
        const controleur = exporte as { prototype: Record<string, unknown> };
        if (!Reflect.getMetadata('path', exporte)) continue;
        for (const nom of Object.getOwnPropertyNames(controleur.prototype)) {
          const handler = controleur.prototype[nom];
          if (typeof handler !== 'function') continue;
          const methode = Reflect.getMetadata('method', handler);
          if (methode === undefined || !METHODES_HTTP.has(methode)) continue;
          total += 1;
          const cibles = [handler, exporte];
          const declare = [
            PERMISSIONS_KEY,
            IS_PUBLIC_KEY,
            AUTHENTICATED_KEY,
          ].some((cle) =>
            cibles.some((cible) => Reflect.getMetadata(cle, cible)),
          );
          if (!declare) {
            muettes.push(`${exporte.name}.${nom}`);
          }
        }
      }
    }
  });

  it('découvre bien les routes', () => {
    expect(total).toBeGreaterThan(150);
  });

  it('aucune route ne reste sans déclaration d’accès', () => {
    expect(muettes).toEqual([]);
  });
});
