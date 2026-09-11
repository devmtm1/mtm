import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Détecte les médias et documents référencés en base dont l'asset n'existe
 * plus dans le stockage Cloudinary.
 *
 * Ces « orphelins » apparaissent quand un asset est supprimé côté Cloudinary
 * (console, quota du plan gratuit, nettoyage manuel) sans passer par l'API :
 * la ligne subsiste alors en base et le site public tente d'afficher une URL
 * morte. Le front dégrade proprement (placeholder), mais la donnée reste
 * fausse — d'où ce contrôle.
 *
 * Le script est en lecture seule par défaut : il se contente de lister.
 * La suppression des lignes orphelines n'a lieu qu'avec DELETE_ORPHANS=true,
 * et chaque suppression est tracée dans le journal d'audit (section 17 CDC).
 *
 * Usage :
 *   ts-node scripts/check-orphan-medias.ts                      # rapport seul
 *   DELETE_ORPHANS=true ts-node scripts/check-orphan-medias.ts  # nettoyage tracé
 */

const prisma = new PrismaClient();

interface AssetRow {
  id: string;
  storageKey: string;
  resourceType: string;
  isPublic: boolean;
}

interface AssetDelegate {
  findMany(args: { select: Record<string, boolean> }): Promise<AssetRow[]>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

const ASSET_MODELS: Array<{ key: string; entityType: string }> = [
  { key: 'terrainMedia', entityType: 'TerrainMedia' },
  { key: 'terrainDocument', entityType: 'TerrainDocument' },
  { key: 'mandatDocument', entityType: 'MandatDocument' },
  { key: 'documentVente', entityType: 'DocumentVente' },
  { key: 'documentCrm', entityType: 'DocumentCrm' },
];

async function assetExists(asset: AssetRow): Promise<boolean> {
  try {
    await cloudinary.api.resource(asset.storageKey, {
      resource_type: asset.resourceType,
      type: asset.isPublic ? 'upload' : 'authenticated',
    });
    return true;
  } catch (error) {
    // Le SDK Cloudinary encapsule le statut HTTP dans `error.error.http_code`
    // pour l'Admin API, et l'expose à plat pour d'autres appels.
    const raw = error as {
      http_code?: number;
      error?: { http_code?: number };
    };
    const status = raw.error?.http_code ?? raw.http_code;
    if (status === 404) return false;
    // Toute autre erreur (réseau, quota API) ne prouve pas l'absence de
    // l'asset : on considère la ligne comme valide pour ne jamais supprimer
    // une donnée saine sur un simple incident de connexion.
    console.warn(
      `Vérification impossible pour ${asset.storageKey} (${String(status ?? 'erreur réseau')}) — ligne conservée.`,
    );
    return true;
  }
}

async function checkModel(
  entityType: string,
  key: string,
  deleteOrphans: boolean,
): Promise<number> {
  const delegate = (prisma as unknown as Record<string, AssetDelegate>)[key];
  if (!delegate) return 0;

  const rows = await delegate.findMany({
    select: { id: true, storageKey: true, resourceType: true, isPublic: true },
  });

  const orphans: AssetRow[] = [];
  for (const row of rows) {
    if (!(await assetExists(row))) orphans.push(row);
  }

  if (orphans.length === 0) {
    console.log(`${entityType} : ${rows.length} asset(s) vérifié(s), aucun orphelin.`);
    return 0;
  }

  console.log(
    `${entityType} : ${orphans.length} orphelin(s) sur ${rows.length} asset(s) —`,
  );
  for (const orphan of orphans) {
    console.log(`   ${orphan.id}  ${orphan.storageKey}`);
  }

  if (!deleteOrphans) {
    console.log(
      `   (lecture seule — relancer avec DELETE_ORPHANS=true pour nettoyer)`,
    );
    return orphans.length;
  }

  for (const orphan of orphans) {
    await prisma.auditLog.create({
      data: {
        action: 'media.orphan.delete',
        entityType,
        entityId: orphan.id,
        oldValue: { storageKey: orphan.storageKey, resourceType: orphan.resourceType },
        justification:
          'Nettoyage — asset absent du stockage Cloudinary (référence orpheline)',
      },
    });
    await delegate.delete({ where: { id: orphan.id } });
  }
  console.log(`   ${orphans.length} ligne(s) supprimée(s) et tracée(s).`);

  return orphans.length;
}

async function main(): Promise<void> {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error('Cloudinary non configuré : vérification impossible.');
    process.exitCode = 1;
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const deleteOrphans = process.env.DELETE_ORPHANS === 'true';
  console.log(
    deleteOrphans
      ? 'Contrôle des assets orphelins — mode nettoyage.'
      : 'Contrôle des assets orphelins — lecture seule.',
  );

  let total = 0;
  for (const { key, entityType } of ASSET_MODELS) {
    total += await checkModel(entityType, key, deleteOrphans);
  }

  console.log(`Total : ${total} référence(s) orpheline(s).`);
}

main()
  .catch((error) => {
    console.error('Échec du contrôle des assets orphelins :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
