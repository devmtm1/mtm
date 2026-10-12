-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationsEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationsSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsWhatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telephone" TEXT;

-- CreateTable
CREATE TABLE "taches" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "priorite" TEXT NOT NULL DEFAULT 'moyenne',
    "statut" TEXT NOT NULL DEFAULT 'a_faire',
    "dateLimite" TIMESTAMP(3),
    "termineeLe" TIMESTAMP(3),
    "responsableId" TEXT NOT NULL,
    "creeParId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taches_historique" (
    "id" TEXT NOT NULL,
    "tacheId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taches_historique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements_agenda" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "lieu" TEXT,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "journeeEntiere" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'prevu',
    "visibilite" TEXT NOT NULL DEFAULT 'equipe',
    "createurId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "rappelMinutes" INTEGER,
    "rappelEnvoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evenements_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements_participants" (
    "evenementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "evenements_participants_pkey" PRIMARY KEY ("evenementId","userId")
);

-- CreateTable
CREATE TABLE "messages_dossier" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT,
    "auteurId" TEXT NOT NULL,
    "deClient" BOOLEAN NOT NULL DEFAULT false,
    "corps" TEXT NOT NULL,
    "visibleClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envois_canal" (
    "id" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "notificationId" TEXT,
    "statut" TEXT NOT NULL,
    "erreur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envois_canal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taches_responsableId_statut_idx" ON "taches"("responsableId", "statut");

-- CreateIndex
CREATE INDEX "taches_dateLimite_idx" ON "taches"("dateLimite");

-- CreateIndex
CREATE INDEX "taches_entityType_entityId_idx" ON "taches"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "taches_historique_tacheId_createdAt_idx" ON "taches_historique"("tacheId", "createdAt");

-- CreateIndex
CREATE INDEX "evenements_agenda_debut_idx" ON "evenements_agenda"("debut");

-- CreateIndex
CREATE INDEX "evenements_agenda_createurId_idx" ON "evenements_agenda"("createurId");

-- CreateIndex
CREATE INDEX "evenements_agenda_entityType_entityId_idx" ON "evenements_agenda"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "evenements_participants_userId_idx" ON "evenements_participants"("userId");

-- CreateIndex
CREATE INDEX "messages_dossier_entityType_entityId_createdAt_idx" ON "messages_dossier"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_dossier_auteurId_idx" ON "messages_dossier"("auteurId");

-- CreateIndex
CREATE INDEX "envois_canal_createdAt_idx" ON "envois_canal"("createdAt");

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_historique" ADD CONSTRAINT "taches_historique_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches_historique" ADD CONSTRAINT "taches_historique_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_agenda" ADD CONSTRAINT "evenements_agenda_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_participants" ADD CONSTRAINT "evenements_participants_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "evenements_agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenements_participants" ADD CONSTRAINT "evenements_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_dossier" ADD CONSTRAINT "messages_dossier_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
