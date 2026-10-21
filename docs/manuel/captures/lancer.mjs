// Refait toutes les captures d'écran du guide, de bout en bout.
//
//   npm run manuel:captures            (depuis la racine du dépôt)
//
// Base PostgreSQL jetable, API locale, back-office de développement, données fictives, un compte
// par métier, puis Chrome photographie chaque écran. Tout est détruit à la fin ; seules les images
// de apps/backoffice/public/manuel/img/ changent.
import { creerUtilisateurs, preparerAdministrateur } from './donnees.mjs';
import { demarrer } from './environnement.mjs';
import { peuplerDonnees } from './jeu-donnees.mjs';
import { peuplerSuite } from './jeu-donnees-suite.mjs';
import { photographier } from './photographier.mjs';

const garder = process.argv.includes('--sans-recompiler');
const env = await demarrer({ reconstruireFront: !garder });
let code = 0;
try {
  const { api, secretTotp } = await preparerAdministrateur(env.urlApi);
  const clients = await creerUtilisateurs(env.urlApi, api);
  const donnees = await peuplerDonnees({ admin: api, clients });
  const suite = await peuplerSuite({ admin: api, clients, donnees });

  const mandats = await clients.responsable.api.get('/mandats').catch(() => null);
  const listeMandats = Array.isArray(mandats) ? mandats : (mandats?.items ?? []);
  const ids = {
    prospectNegociation: donnees.prospects.find((p) => p.nom === 'Diouf')?.id,
    bien: donnees.terrains[0]?.id,
    venteReservee: suite.ventes.reservee?.id,
    mandat: listeMandats[0]?.id,
  };

  const { faites, echecs } = await photographier({ urlFront: env.urlFront, secretTotp, ids });
  console.log(`\n${faites.length} captures enregistrées.`);
  if (echecs.length) {
    console.warn(`${echecs.length} capture(s) en échec :\n  ${echecs.join('\n  ')}`);
    code = 1;
  }
} catch (erreur) {
  console.error(erreur);
  code = 1;
} finally {
  await env.arreter();
}
process.exit(code);
