import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient, type Prisma } from '@prisma/client';
import {
  parserCsv,
  preparerImport,
  type BienImporte,
} from '../src/modules/terrains/import/terrain-import';
import { DEFAULT_TERRAIN_OPTIONS } from '../src/modules/terrains/terrains.service';

/**
 * Reprise du tableur « Bd terrains MTM IMMO » dans l'application.
 *
 *   npm run import:terrains -- <fichier.csv> [options]
 *
 * Export attendu : Google Sheets → Fichier → Télécharger → CSV, un onglet à la
 * fois (« BD officielle », puis « ARCHIVES » avec `--archives`).
 *
 * Par défaut c'est un **essai à blanc** : rien n'est écrit, le rapport dit ce
 * qui serait créé, écarté ou refusé. `--apply` écrit réellement.
 *
 * Options
 *   --apply                  écrit en base (sans elle : essai à blanc)
 *   --archives               onglet ARCHIVES : les biens sont repris archivés
 *   --publier-disponibles    publie sur le site les lignes « Disponible »
 *                            (sinon tout est repris en « Brouillon »)
 *   --responsable=<email>    commercial responsable des biens repris
 *   --rapport=<fichier.json> écrit le rapport complet
 *
 * Idempotent : un bien dont la référence existe déjà n'est ni modifié ni
 * recréé, relancer le script après correction du fichier est sans danger.
 * Aucune donnée n'est inventée : une valeur illisible est écartée, rapportée,
 * et conservée telle quelle dans les notes internes du bien.
 */

const prisma = new PrismaClient();

function argument(nom: string): string | undefined {
  const prefixe = `--${nom}=`;
  return process.argv.find((a) => a.startsWith(prefixe))?.slice(prefixe.length);
}
const drapeau = (nom: string) => process.argv.includes(`--${nom}`);

async function liste(
  cle: string,
  defaut: readonly string[],
): Promise<string[]> {
  const reglage = await prisma.systemSetting.findUnique({
    where: { key: cle },
  });
  const valeur = reglage?.value;
  const lue = Array.isArray(valeur)
    ? valeur.filter((v): v is string => typeof v === 'string')
    : [];
  return lue.length > 0 ? lue : [...defaut];
}

async function main(): Promise<void> {
  const fichier = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!fichier) {
    console.error(
      'Usage : npm run import:terrains -- <fichier.csv> [--apply] [--archives]',
    );
    process.exit(1);
  }
  const appliquer = drapeau('apply');
  const archives = drapeau('archives');
  const lignes = parserCsv(readFileSync(fichier, 'utf-8'));

  const rapport = preparerImport(lignes, {
    titresAutorises: await liste(
      'terrains.statutJuridique',
      DEFAULT_TERRAIN_OPTIONS.statutJuridique,
    ),
    modalitesAutorisees: await liste(
      'terrains.modalitePaiement',
      DEFAULT_TERRAIN_OPTIONS.modalitePaiement,
    ),
    statutsVisiteAutorises: await liste(
      'terrains.statutVisite',
      DEFAULT_TERRAIN_OPTIONS.statutVisite,
    ),
    publierDisponibles: drapeau('publier-disponibles'),
    archives,
  });

  const existants = new Set(
    (
      await prisma.terrain.findMany({
        where: {
          referenceInterne: {
            in: rapport.biens.map((b) => b.referenceInterne),
          },
        },
        select: { referenceInterne: true },
      })
    ).map((t) => t.referenceInterne),
  );
  const aCreer = rapport.biens.filter(
    (b) => !existants.has(b.referenceInterne),
  );
  const dejaPresents = rapport.biens.filter((b) =>
    existants.has(b.referenceInterne),
  );

  let responsableId: string | null = null;
  const email = argument('responsable');
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`Responsable introuvable : ${email}`);
    responsableId = user.id;
  }

  console.log(
    `\nFichier : ${fichier}  (${appliquer ? 'ÉCRITURE' : 'essai à blanc'})`,
  );
  console.log(`  lignes lues ............ ${lignes.length - 1}`);
  console.log(`  à créer ................ ${aCreer.length}`);
  console.log(`  déjà présentes (ignorées) ${dejaPresents.length}`);
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
      JSON.stringify(
        {
          ...rapport,
          aCreer: aCreer.length,
          dejaPresents: dejaPresents.length,
        },
        null,
        2,
      ),
    );
    console.log(`\nRapport écrit : ${chemin}`);
  }

  if (!appliquer) {
    console.log(
      '\nEssai à blanc : rien n’a été écrit. Relancer avec --apply après relecture.',
    );
    return;
  }

  const maintenant = new Date();
  await prisma.$transaction(
    async (tx) => {
      for (const bien of aCreer) {
        await tx.terrain.create({
          data: versDonnees(bien, responsableId, maintenant),
        });
      }
      await tx.auditLog.create({
        data: {
          action: 'terrain.imported',
          entityType: 'Terrain',
          newValue: {
            fichier,
            crees: aCreer.length,
            refuses: rapport.refuses.length,
            archives,
          },
          justification: 'Reprise du tableur « Bd terrains MTM IMMO »',
        },
      });
    },
    { maxWait: 15_000, timeout: 120_000 },
  );
  console.log(`\n${aCreer.length} bien(s) créé(s).`);
}

function versDonnees(
  bien: BienImporte,
  responsableId: string | null,
  maintenant: Date,
): Prisma.TerrainUncheckedCreateInput {
  return {
    referenceInterne: bien.referenceInterne,
    nom: bien.nom,
    parcelleMatricule: bien.parcelleMatricule,
    localisationDetail: bien.localisationDetail,
    statutJuridique: bien.statutJuridique,
    statutCommercial: bien.statutCommercial,
    niveauVerification: bien.niveauVerification,
    nombreLots: bien.nombreLots,
    superficie: bien.superficie,
    uniteSuperficie: bien.uniteSuperficie,
    prixCession: bien.prixCession,
    prixPublic: bien.prixPublic,
    contactVendeurNom: bien.contactVendeurNom,
    contactVendeurTelephone: bien.contactVendeurTelephone,
    modalitePaiement: bien.modalitePaiement,
    dateEntree: bien.dateEntree ? new Date(bien.dateEntree) : undefined,
    produitDirect: bien.produitDirect,
    protocoleAccord: bien.protocoleAccord,
    statutVisite: bien.statutVisite,
    notesInternes: bien.notesInternes,
    commercialResponsableId: responsableId ?? undefined,
    ...(bien.archive
      ? {
          archiveLe: maintenant,
          motifArchivage: 'Repris de l’onglet ARCHIVES du tableur',
        }
      : {}),
  };
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
