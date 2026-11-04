-- Programmes : ce que la comptabilité attend de chaque lot vendu (commission ou marge de MTM, produit direct).
ALTER TABLE "programmes_lotissement" ADD COLUMN "produitDirect" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "programmes_lotissement" ADD COLUMN "commissionLot" DECIMAL(15,2);
ALTER TABLE "programmes_lotissement" ADD COLUMN "margeLot" DECIMAL(15,2);
ALTER TABLE "categories_lot" ADD COLUMN "commission" DECIMAL(15,2);
ALTER TABLE "categories_lot" ADD COLUMN "marge" DECIMAL(15,2);
