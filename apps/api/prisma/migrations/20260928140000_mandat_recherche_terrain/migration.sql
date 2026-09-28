-- Mandat de recherche de terrain (formulaire papier « NS- »).
--
-- Le client décrit le terrain qu'il cherche et MTM prospecte pour lui. Les
-- critères prolongent la qualification du prospect plutôt que de vivre dans
-- une table séparée : le budget et la zone du client n'existent qu'une fois.
-- Toutes les colonnes sont facultatives, les prospects déjà saisis restent
-- valides sans reprise de données.

ALTER TABLE "prospects"
  ADD COLUMN "rechercheActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rechercheReference" TEXT,
  ADD COLUMN "rechercheStatut" TEXT,
  ADD COLUMN "profession" TEXT,
  ADD COLUMN "quartierRecherche" TEXT,
  ADD COLUMN "surfaceMin" INTEGER,
  ADD COLUMN "surfaceMax" INTEGER,
  ADD COLUMN "budgetIdeal" DECIMAL(15,2),
  ADD COLUMN "documentNonNegociable" BOOLEAN,
  ADD COLUMN "terrainBorne" TEXT,
  ADD COLUMN "accesVoirie" TEXT,
  ADD COLUMN "proximiteRoutePrincipale" TEXT,
  ADD COLUMN "constructibiliteUsage" TEXT,
  ADD COLUMN "delaiSouhaite" TEXT,
  ADD COLUMN "disponibiliteVisite" TEXT,
  ADD COLUMN "financement" TEXT,
  ADD COLUMN "preferenceVendeurDirect" TEXT,
  ADD COLUMN "accepteOpportunitesSimilaires" BOOLEAN;

CREATE UNIQUE INDEX "prospects_rechercheReference_key"
  ON "prospects" ("rechercheReference");

-- Vue de travail du conseiller : « quelles recherches sont en cours ».
CREATE INDEX "prospects_rechercheStatut_idx"
  ON "prospects" ("rechercheStatut");
