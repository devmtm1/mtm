-- Courte durée (type Airbnb) : champs du bien
ALTER TABLE "biens_locatifs"
  ADD COLUMN "modeLocation" TEXT NOT NULL DEFAULT 'longue_duree',
  ADD COLUMN "prixNuit" DECIMAL(15,2),
  ADD COLUMN "cautionSejour" DECIMAL(15,2),
  ADD COLUMN "fraisMenage" DECIMAL(15,2),
  ADD COLUMN "nuitsMinimum" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "capaciteVoyageurs" INTEGER,
  ADD COLUMN "heureArrivee" TEXT,
  ADD COLUMN "heureDepart" TEXT;
CREATE INDEX "biens_locatifs_modeLocation_idx" ON "biens_locatifs"("modeLocation");

-- Séjours
CREATE TABLE "sejours_locatifs" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT NOT NULL,
    "bienLocatifId" TEXT NOT NULL,
    "locataireId" TEXT NOT NULL,
    "dateReservation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateArrivee" DATE NOT NULL,
    "dateDepart" DATE NOT NULL,
    "nuits" INTEGER NOT NULL,
    "nombreVoyageurs" INTEGER NOT NULL DEFAULT 1,
    "prixNuit" DECIMAL(15,2) NOT NULL,
    "fraisMenage" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remise" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montantTotal" DECIMAL(15,2) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'demande',
    "source" TEXT NOT NULL DEFAULT 'direct',
    "notes" TEXT,
    "cautionMontant" DECIMAL(15,2),
    "cautionStatut" TEXT NOT NULL DEFAULT 'non_versee',
    "cautionVerseeLe" TIMESTAMP(3),
    "cautionRetenue" DECIMAL(15,2),
    "cautionJustification" TEXT,
    "cautionRestitueeLe" TIMESTAMP(3),
    "annuleLe" TIMESTAMP(3),
    "motifAnnulation" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sejours_locatifs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sejours_locatifs_referenceInterne_key" ON "sejours_locatifs"("referenceInterne");
CREATE INDEX "sejours_locatifs_bienLocatifId_dateArrivee_idx" ON "sejours_locatifs"("bienLocatifId", "dateArrivee");
CREATE INDEX "sejours_locatifs_locataireId_idx" ON "sejours_locatifs"("locataireId");
CREATE INDEX "sejours_locatifs_statut_idx" ON "sejours_locatifs"("statut");
ALTER TABLE "sejours_locatifs" ADD CONSTRAINT "sejours_locatifs_bienLocatifId_fkey" FOREIGN KEY ("bienLocatifId") REFERENCES "biens_locatifs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sejours_locatifs" ADD CONSTRAINT "sejours_locatifs_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "locataires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Règlements de séjour
CREATE TABLE "paiements_sejour" (
    "id" TEXT NOT NULL,
    "sejourId" TEXT NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'acompte',
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_sejour_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "paiements_sejour_sejourId_datePaiement_idx" ON "paiements_sejour"("sejourId", "datePaiement");
ALTER TABLE "paiements_sejour" ADD CONSTRAINT "paiements_sejour_sejourId_fkey" FOREIGN KEY ("sejourId") REFERENCES "sejours_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- États des lieux (séjours et baux)
CREATE TABLE "etats_des_lieux" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sejourId" TEXT,
    "bailLocatifId" TEXT,
    "dateEtat" TIMESTAMP(3) NOT NULL,
    "pieces" JSONB NOT NULL DEFAULT '[]',
    "releveEau" TEXT,
    "releveElectricite" TEXT,
    "nombreCles" INTEGER,
    "observations" TEXT,
    "signataire" TEXT,
    "realiseParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etats_des_lieux_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "etats_des_lieux_sejourId_type_key" ON "etats_des_lieux"("sejourId", "type");
CREATE UNIQUE INDEX "etats_des_lieux_bailLocatifId_type_key" ON "etats_des_lieux"("bailLocatifId", "type");
ALTER TABLE "etats_des_lieux" ADD CONSTRAINT "etats_des_lieux_sejourId_fkey" FOREIGN KEY ("sejourId") REFERENCES "sejours_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "etats_des_lieux" ADD CONSTRAINT "etats_des_lieux_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "etats_des_lieux_photos" (
    "id" TEXT NOT NULL,
    "etatId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "legende" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etats_des_lieux_photos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "etats_des_lieux_photos_etatId_idx" ON "etats_des_lieux_photos"("etatId");
ALTER TABLE "etats_des_lieux_photos" ADD CONSTRAINT "etats_des_lieux_photos_etatId_fkey" FOREIGN KEY ("etatId") REFERENCES "etats_des_lieux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Demandes de résiliation de bail
CREATE TABLE "demandes_resiliation" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'portail',
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateDepartSouhaitee" DATE NOT NULL,
    "motif" TEXT,
    "message" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "dateDepartRetenue" DATE,
    "reponse" TEXT,
    "traiteeLe" TIMESTAMP(3),
    "traiteeParId" TEXT,
    "demandeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_resiliation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "demandes_resiliation_bailLocatifId_statut_idx" ON "demandes_resiliation"("bailLocatifId", "statut");
CREATE INDEX "demandes_resiliation_statut_idx" ON "demandes_resiliation"("statut");
ALTER TABLE "demandes_resiliation" ADD CONSTRAINT "demandes_resiliation_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
