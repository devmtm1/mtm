-- Fréquentation du site public : compteurs quotidiens anonymes.
CREATE TABLE "visites_quotidiennes" (
    "jour" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "cible" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "vues" INTEGER NOT NULL DEFAULT 0,
    "visiteurs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "visites_quotidiennes_pkey" PRIMARY KEY ("jour","type","cible","source")
);

CREATE INDEX "visites_quotidiennes_type_cible_jour_idx" ON "visites_quotidiennes"("type", "cible", "jour");

CREATE TABLE "empreintes_visiteurs" (
    "jour" DATE NOT NULL,
    "cle" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,

    CONSTRAINT "empreintes_visiteurs_pkey" PRIMARY KEY ("jour","cle","empreinte")
);
