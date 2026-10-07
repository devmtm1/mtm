-- Un bien vendu n'apparaît sur le site public que si MTM le décide (badge « Vendu »).
ALTER TABLE "terrains" ADD COLUMN "referenceVendue" BOOLEAN NOT NULL DEFAULT false;
