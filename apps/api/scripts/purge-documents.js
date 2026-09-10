"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const cloudinary_1 = require("cloudinary");
const prisma = new client_1.PrismaClient();
const DOCUMENT_MODELS = [
    { key: 'terrainDocument', entityType: 'TerrainDocument' },
    { key: 'mandatDocument', entityType: 'MandatDocument' },
    { key: 'documentVente', entityType: 'DocumentVente' },
    { key: 'documentCrm', entityType: 'DocumentCrm' },
];
const ALL_TYPES = '*';
function parsePurgeableTypes(raw) {
    const byModel = new Map();
    if (!raw)
        return byModel;
    for (const entry of raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)) {
        const [modelName, type] = entry.split(':').map((value) => value?.trim());
        const config = DOCUMENT_MODELS.find((model) => model.entityType === modelName);
        if (!config || !type) {
            console.warn(`Entrée ignorée dans DOCUMENT_RETENTION_PURGEABLE_TYPES : "${entry}"`);
            continue;
        }
        const types = byModel.get(config.entityType) ?? new Set();
        types.add(type);
        byModel.set(config.entityType, types);
    }
    return byModel;
}
function isCloudinaryConfigured() {
    return Boolean(process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET);
}
async function destroyAsset(document) {
    if (!isCloudinaryConfigured())
        return;
    try {
        await cloudinary_1.v2.uploader.destroy(document.storageKey, {
            resource_type: document.resourceType,
            type: document.isPublic ? 'upload' : 'authenticated',
            invalidate: true,
        });
    }
    catch (error) {
        console.error(`Échec de suppression Cloudinary pour ${document.storageKey} (conservé en base annulé) :`, error);
    }
}
async function purgeModel(entityType, key, allowedTypes, cutoff, dryRun) {
    const delegate = prisma[key];
    const where = { createdAt: { lt: cutoff } };
    if (!allowedTypes.has(ALL_TYPES)) {
        where.type = { in: Array.from(allowedTypes) };
    }
    const candidates = await delegate.findMany({ where });
    if (candidates.length === 0)
        return 0;
    if (dryRun) {
        console.log(`[DRY_RUN] ${entityType} : ${candidates.length} document(s) seraient purgés.`);
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
                justification: 'Purge automatique — politique de rétention des documents (DOCUMENT_RETENTION_DAYS)',
            },
        });
        await delegate.delete({ where: { id: document.id } });
        await destroyAsset(document);
    }
    console.log(`${entityType} : ${candidates.length} document(s) purgé(s).`);
    return candidates.length;
}
async function main() {
    const retentionDays = Number(process.env.DOCUMENT_RETENTION_DAYS ?? 0);
    const purgeableTypes = parsePurgeableTypes(process.env.DOCUMENT_RETENTION_PURGEABLE_TYPES);
    const dryRun = process.env.DRY_RUN === 'true';
    if (!retentionDays || retentionDays < 1) {
        console.log('Rétention des documents désactivée (DOCUMENT_RETENTION_DAYS non défini ou invalide). Aucune action.');
        return;
    }
    if (purgeableTypes.size === 0) {
        console.log('Rétention des documents désactivée (DOCUMENT_RETENTION_PURGEABLE_TYPES vide — aucun type de document autorisé à la purge automatique). Aucune action.');
        return;
    }
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    console.log(`Purge des documents créés avant le ${cutoff.toISOString()} (rétention ${retentionDays} jours)${dryRun ? ' — DRY_RUN' : ''}.`);
    let total = 0;
    for (const { key, entityType } of DOCUMENT_MODELS) {
        const allowedTypes = purgeableTypes.get(entityType);
        if (!allowedTypes || allowedTypes.size === 0)
            continue;
        total += await purgeModel(entityType, key, allowedTypes, cutoff, dryRun);
    }
    console.log(dryRun
        ? `[DRY_RUN] Total : ${total} document(s).`
        : `Total purgé : ${total} document(s).`);
}
main()
    .catch((error) => {
    console.error('Échec de la purge des documents :', error);
    process.exitCode = 1;
})
    .finally(() => {
    void prisma.$disconnect();
});
//# sourceMappingURL=purge-documents.js.map