import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../src/database/prisma.service';
import { lireTableur } from '../src/modules/terrains/import/lecture-tableur';
import { preparerImport } from '../src/modules/terrains/import/terrain-import';
import {
  chargerOptionsImport,
  ecrireBiens,
  referencesExistantes,
} from '../src/modules/terrains/import/terrain-import-persist';

/**
 * Reprise du tableur « Bd terrains MTM IMMO » en ligne de commande. Le même
 * import est disponible dans le back-office (Biens → Importer) ; ce script
 * sert aux reprises en masse et aux essais depuis un poste de développement.
 *
 *   npm run import:terrains -- <fichier.xlsx|.csv> [options]
 *
 * Par défaut c'est un **essai à blanc** : rien n'est écrit. `--apply` écrit.
 *
 * Options
 *   --apply                  écrit en base (sans elle : essai à blanc)
 *   --feuille="BD officielle" onglet d'un classeur .xlsx (le premier par défaut)
 *   --archives               onglet ARCHIVES : les biens sont repris archivés
 *   --publier-disponibles    publie sur le site les lignes « Disponible »
 *                            (sinon tout est repris en « Brouillon »)
 *   --responsable=<email>    commercial responsable des biens repris
 *   --rapport=<fichier.json> écrit le rapport complet
 *
 * Idempotent : un bien dont la référence existe déjà n'est ni modifié ni
 * recréé. Aucune donnée n'est inventée : une valeur illisible est écartée,
 * rapportée, et conservée telle quelle dans les notes internes du bien.
 */

const prisma = new PrismaClient();
// Mêmes fonctions que l'API : PrismaService n'est qu'un PrismaClient géré par Nest.
const client = prisma as unknown as PrismaService;

function argument(nom: string): string | undefined {
  const prefixe = `--${nom}=`;
  return process.argv.find((a) => a.startsWith(prefixe))?.slice(prefixe.length);
}
const drapeau = (nom: string) => process.argv.includes(`--${nom}`);

async function main(): Promise<void> {
  const fichier = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!fichier) {
    console.error(
      'Usage : npm run import:terrains -- <fichier.xlsx|.csv> [--apply] [--archives]',
    );
    process.exit(1);
  }
  const appliquer = drapeau('apply');
  const archives = drapeau('archives');

  const tableur = await lireTableur(
    { buffer: readFileSync(fichier), originalname: basename(fichier) },
    argument('feuille'),
  );
  const rapport = preparerImport(
    tableur.lignes,
    await chargerOptionsImport(client, {
      publierDisponibles: drapeau('publier-disponibles'),
      archives,
    }),
  );
  const existantes = await referencesExistantes(client, rapport.biens);
  const aCreer = rapport.biens.filter(
    (b) => !existantes.has(b.referenceInterne),
  );

  let responsableId: string | null = null;
  const email = argument('responsable');
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`Responsable introuvable : ${email}`);
    responsableId = user.id;
  }

  console.log(
    `\nFichier : ${fichier} · onglet « ${tableur.feuille} » (${appliquer ? 'ÉCRITURE' : 'essai à blanc'})`,
  );
  console.log(`  à créer ................ ${aCreer.length}`);
  console.log(
    `  déjà présentes (ignorées) ${rapport.biens.length - aCreer.length}`,
  );
  console.log(`  refusées ............... ${rapport.refuses.length}`);
  console.log(`  avertissements ......... ${rapport.avertissements.length}`);
  console.log(`  lignes vides ........... ${rapport.ignorees}`);
  for (const r of rapport.refuses.slice(0, 50)) {
    console.log(`  ✗ ligne ${r.ligne} : ${r.raison}`);
  }
  for (const a of rapport.avertissements.slice(0, 50)) {
    console.log(`  ! ligne ${a.ligne} : ${a.message}`);
  }

  const chemin = argument('rapport');
  if (chemin) {
    writeFileSync(
      chemin,
      JSON.stringify({ ...rapport, aCreer: aCreer.length }, null, 2),
    );
    console.log(`\nRapport écrit : ${chemin}`);
  }

  if (!appliquer) {
    console.log(
      '\nEssai à blanc : rien n’a été écrit. Relancer avec --apply après relecture.',
    );
    return;
  }

  const crees = await ecrireBiens(client, aCreer, {
    responsableId,
    archiveParId: null,
  });
  await prisma.auditLog.create({
    data: {
      action: 'terrain.imported',
      entityType: 'Terrain',
      newValue: {
        fichier: basename(fichier),
        feuille: tableur.feuille,
        crees,
        refuses: rapport.refuses.length,
        archives,
      },
      justification: 'Reprise du tableur « Bd terrains MTM IMMO »',
    },
  });
  console.log(`\n${crees} bien(s) créé(s).`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
