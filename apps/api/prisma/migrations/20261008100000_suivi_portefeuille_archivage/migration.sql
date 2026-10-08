-- Reprise du tableur « Bd terrains MTM IMMO » : suivi du portefeuille, titre
-- juridique structuré, archivage sans suppression, notes de suivi.
-- Tout est additif et nullable : aucune fiche existante n'est modifiée.

ALTER TABLE "terrains"
  ADD COLUMN "prixCession" DECIMAL(15,2),
  ADD COLUMN "nombreLots" INTEGER,
  ADD COLUMN "dateEntree" DATE,
  ADD COLUMN "modalitePaiement" TEXT,
  ADD COLUMN "dureeMoratoireMois" INTEGER,
  ADD COLUMN "acompteMontant" DECIMAL(15,2),
  ADD COLUMN "notesPaiement" TEXT,
  ADD COLUMN "produitDirect" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "protocoleAccord" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "statutVisite" TEXT,
  ADD COLUMN "contactVendeurNom" TEXT,
  ADD COLUMN "contactVendeurTelephone" TEXT,
  ADD COLUMN "referenceDocumentFoncier" TEXT,
  ADD COLUMN "dateDocumentFoncier" DATE,
  ADD COLUMN "commentaireAdministratif" TEXT,
  ADD COLUMN "archiveLe" TIMESTAMP(3),
  ADD COLUMN "archiveParId" TEXT,
  ADD COLUMN "motifArchivage" TEXT;

CREATE INDEX "terrains_archiveLe_idx" ON "terrains"("archiveLe");
CREATE INDEX "terrains_dateEntree_idx" ON "terrains"("dateEntree");

ALTER TABLE "terrains"
  ADD CONSTRAINT "terrains_archiveParId_fkey" FOREIGN KEY ("archiveParId")
  REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "terrain_notes" (
  "id" TEXT NOT NULL,
  "terrainId" TEXT NOT NULL,
  "auteurId" TEXT,
  "texte" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "terrain_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "terrain_notes_terrainId_createdAt_idx" ON "terrain_notes"("terrainId", "createdAt");

ALTER TABLE "terrain_notes"
  ADD CONSTRAINT "terrain_notes_terrainId_fkey" FOREIGN KEY ("terrainId")
  REFERENCES "terrains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "terrain_notes"
  ADD CONSTRAINT "terrain_notes_auteurId_fkey" FOREIGN KEY ("auteurId")
  REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Les titres relevés dans le tableur rejoignent la liste configurable des
-- statuts juridiques, sans retirer ni réordonner ce que MTM y a déjà mis.
UPDATE "system_settings"
SET "value" = "value" || (
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  FROM unnest(ARRAY['Bail individuel', 'Délibération double tampon', 'Délibération NICAD']) AS t
  WHERE NOT ("value" ? t)
)
WHERE "key" = 'terrains.statutJuridique' AND jsonb_typeof("value") = 'array';
