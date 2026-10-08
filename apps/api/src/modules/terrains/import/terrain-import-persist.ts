import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import { DEFAULT_TERRAIN_OPTIONS } from '../terrains.service';
import type { BienImporte, OptionsImport } from './terrain-import';

type Lecteur = PrismaService;

async function liste(
  prisma: Lecteur,
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

/** Listes paramétrées par MTM (titres, modalités, visites) qui bornent ce que l'import peut produire. */
export async function chargerOptionsImport(
  prisma: Lecteur,
  drapeaux: { publierDisponibles: boolean; archives: boolean },
): Promise<OptionsImport> {
  return {
    titresAutorises: await liste(
      prisma,
      'terrains.statutJuridique',
      DEFAULT_TERRAIN_OPTIONS.statutJuridique,
    ),
    modalitesAutorisees: await liste(
      prisma,
      'terrains.modalitePaiement',
      DEFAULT_TERRAIN_OPTIONS.modalitePaiement,
    ),
    statutsVisiteAutorises: await liste(
      prisma,
      'terrains.statutVisite',
      DEFAULT_TERRAIN_OPTIONS.statutVisite,
    ),
    ...drapeaux,
  };
}

/** Parmi ces biens, ceux dont la référence existe déjà (ni modifiés, ni recréés). */
export async function referencesExistantes(
  prisma: Lecteur,
  biens: BienImporte[],
): Promise<Set<string>> {
  if (biens.length === 0) return new Set();
  const trouves = await prisma.terrain.findMany({
    where: { referenceInterne: { in: biens.map((b) => b.referenceInterne) } },
    select: { referenceInterne: true },
  });
  return new Set(trouves.map((t) => t.referenceInterne));
}

export function versDonnees(
  bien: BienImporte,
  contexte: {
    responsableId: string | null;
    archiveParId: string | null;
    maintenant: Date;
  },
): Prisma.TerrainCreateManyInput {
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
    commercialResponsableId: contexte.responsableId ?? undefined,
    ...(bien.archive
      ? {
          archiveLe: contexte.maintenant,
          archiveParId: contexte.archiveParId ?? undefined,
          motifArchivage: 'Repris de l’onglet ARCHIVES du tableur',
        }
      : {}),
  };
}

/** Écrit les biens par lots dans une seule transaction : tout ou rien. */
export async function ecrireBiens(
  prisma: PrismaService,
  biens: BienImporte[],
  contexte: { responsableId: string | null; archiveParId: string | null },
): Promise<number> {
  const maintenant = new Date();
  const donnees = biens.map((b) => versDonnees(b, { ...contexte, maintenant }));
  let crees = 0;
  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < donnees.length; i += 500) {
        const lot = await tx.terrain.createMany({
          data: donnees.slice(i, i + 500),
          // Deux imports simultanés du même fichier : la base départage.
          skipDuplicates: true,
        });
        crees += lot.count;
      }
    },
    { maxWait: 15_000, timeout: 120_000 },
  );
  return crees;
}
