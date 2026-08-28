-- AlterTable
ALTER TABLE "terrains" ADD COLUMN     "misEnAvant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "sujet" TEXT,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_terrainId_idx" ON "contacts"("terrainId");

-- CreateIndex
CREATE INDEX "contacts_lu_idx" ON "contacts"("lu");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_key_key" ON "content_blocks"("key");

-- CreateIndex
CREATE INDEX "content_blocks_type_idx" ON "content_blocks"("type");

-- CreateIndex
CREATE INDEX "content_blocks_isActive_idx" ON "content_blocks"("isActive");

-- CreateIndex
CREATE INDEX "content_blocks_ordre_idx" ON "content_blocks"("ordre");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
