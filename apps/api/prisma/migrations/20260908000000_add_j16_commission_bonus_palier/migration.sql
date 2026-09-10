-- J1.6 — ajout des règles avancées de commission (palier et bonus)

ALTER TABLE "commissions_vente"
  ADD COLUMN "palier" DECIMAL(15,2),
  ADD COLUMN "bonus" DECIMAL(15,2);
