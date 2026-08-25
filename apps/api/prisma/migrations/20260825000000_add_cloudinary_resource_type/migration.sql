ALTER TABLE "terrain_medias" ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'image';
ALTER TABLE "terrain_documents" ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'raw';