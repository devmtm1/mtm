import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Purge des documents métier (GED) selon une politique de rétention opt-in.
 *
 * À la différence du journal d'audit, les documents de la GED (titres,
 * contrats, quittances, justificatifs...) peuvent avoir une valeur légale
 * ou probatoire de longue durée (sections 17 et 28 du cahier des charges).
 * Ce script ne supprime donc RIEN par défaut : la purge automatique ne
 * s'applique qu'aux types de documents explicitement listés dans
 * DOCUMENT_RETENTION_PURGEABLE_TYPES, et uniquement au-delà de
 * DOCUMENT_RETENTION_DAYS. Les durées et la liste des types purgeables
 * doivent être validées par MTM (et un conseil juridique si nécessaire)
 * avant d'être activées en production — voir section 27 et 28 du CDC.
 *
 * Format de DOCUMENT_RETENTION_PURGEABLE_TYPES : liste "Modèle:type"
 * séparée par des virgules, "*" valant "tous les types" pour ce modèle.
 * Modèles valides : TerrainDocument, MandatDocument, DocumentVente, DocumentCrm.
 * Exemple : "DocumentVente:justificatif,MandatDocument:correspondance"
 *
 * Usage :
 *   DRY_RUN=true ts-node scripts/purge-documents.ts   # simulation (aucune suppression)
 *   ts-node scripts/purge-documents.ts                # purge réelle
 */

const prisma = new PrismaClient();

interface DocumentRow {
  id: string;
  type: string;
  storageKey: string;
  resourceType: string;
  isPublic: boolean;
  createdAt: Date;
}

interface DocumentDelegate {
  findMany(args: { where: Record<string, unknown> }): Promise<DocumentRow[]>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

const DOCUMENT_MODELS: Array<{ key: string; entityType: string }> = [
  { key: 'terrainDocument', entityType: 'TerrainDocument' },
  { key: 'mandatDocument', entityType: 'MandatDocument' },
  { key: 'documentVente', entityType: 'DocumentVente' },
  { key: 'documentCrm', entityType: 'DocumentCrm' },
];

const ALL_TYPES = '*';

function parsePurgeableTypes(
  raw: string | undefined,
): Map<string, Set<string>> {
  const byModel = new Map<string, Set<string>>();
  if (!raw) return byModel;

  for (const entry of raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)) {
    const [modelName, type] = entry.split(':').map((value) => value?.trim());
    const config = DOCUMENT_MODELS.find(
      (model) => model.entityType === modelName,
    );
    if (!config || !type) {
      console.warn(
        `Entrée ignorée dans DOCUMENT_RETENTION_PURGEABLE_TYPES : "${entry}"`,
      );
      continue;
    }
    const types = byModel.get(config.entityType) ?? new Set<string>();
    types.add(type);
    byModel.set(config.entityType, types);
  }

  return byModel;
}

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

async function destroyAsset(document: DocumentRow): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(document.storageKey, {
      resource_type: document.resourceType,
      type: document.isPublic ? 'upload' : 'authenticated',
      invalidate: true,
    });
  } catch (error) {
    console.error(
      `Échec de suppression Cloudinary pour ${document.storageKey} (conservé en base annulé) :`,
      error,
    );
  }
}

async function purgeModel(
  entityType: string,
  key: string,
  allowedTypes: Set<string>,
  cutoff: Date,
  dryRun: boolean,
): Promise<number> {
  const delegate = (prisma as unknown as Record<string, DocumentDelegate>)[key];
  const where: Record<string, unknown> = { createdAt: { lt: cutoff } };
  if (!allowedTypes.has(ALL_TYPES)) {
    where.type = { in: Array.from(allowedTypes) };
  }

  const candidates = await delegate.findMany({ where });
  if (candidates.length === 0) return 0;

  if (dryRun) {
    console.log(
      `[DRY_RUN] ${entityType} : ${candidates.length} document(s) seraient purgés.`,
    );
    return candidates.length;
  }

  for (const document of candidates) {
    await prisma.auditLog.create({
      data: {
        action: 'document.purge',
        entityType,
        entityId: document.id,
        oldValue: {
          type: document.type,
          storageKey: document.storageKey,
          createdAt: document.createdAt.toISOString(),
        },
        justification:
          'Purge automatique — politique de rétention des documents (DOCUMENT_RETENTION_DAYS)',
      },
    });
    await delegate.delete({ where: { id: document.id } });
    await destroyAsset(document);
  }

  console.log(`${entityType} : ${candidates.length} document(s) purgé(s).`);
  return candidates.length;
}

async function main(): Promise<void> {
  const retentionDays = Number(process.env.DOCUMENT_RETENTION_DAYS ?? 0);
  const purgeableTypes = parsePurgeableTypes(
    process.env.DOCUMENT_RETENTION_PURGEABLE_TYPES,
  );
  const dryRun = process.env.DRY_RUN === 'true';

  if (!retentionDays || retentionDays < 1) {
    console.log(
      'Rétention des documents désactivée (DOCUMENT_RETENTION_DAYS non défini ou invalide). Aucune action.',
    );
    return;
  }

  if (purgeableTypes.size === 0) {
    console.log(
      'Rétention des documents désactivée (DOCUMENT_RETENTION_PURGEABLE_TYPES vide — aucun type de document autorisé à la purge automatique). Aucune action.',
    );
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  console.log(
    `Purge des documents créés avant le ${cutoff.toISOString()} (rétention ${retentionDays} jours)${dryRun ? ' — DRY_RUN' : ''}.`,
  );

  let total = 0;
  for (const { key, entityType } of DOCUMENT_MODELS) {
    const allowedTypes = purgeableTypes.get(entityType);
    if (!allowedTypes || allowedTypes.size === 0) continue;
    total += await purgeModel(entityType, key, allowedTypes, cutoff, dryRun);
  }

  console.log(
    dryRun
      ? `[DRY_RUN] Total : ${total} document(s).`
      : `Total purgé : ${total} document(s).`,
  );
}

main()
  .catch((error) => {
    console.error('Échec de la purge des documents :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
