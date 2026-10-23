-- Matricule des propriétaires (PRO-AAAA-NNNN) : le rang repart de 1 chaque année,
-- dans l'ordre de création des fiches existantes.
ALTER TABLE "proprietaires" ADD COLUMN "matricule" TEXT;

WITH numerotes AS (
  SELECT
    "id",
    EXTRACT(YEAR FROM "createdAt")::int AS annee,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM "createdAt")
      ORDER BY "createdAt", "id"
    ) AS rang
  FROM "proprietaires"
)
UPDATE "proprietaires" p
SET "matricule" = 'PRO-' || n.annee || '-' || LPAD(n.rang::text, 4, '0')
FROM numerotes n
WHERE n."id" = p."id";

ALTER TABLE "proprietaires" ALTER COLUMN "matricule" SET NOT NULL;
CREATE UNIQUE INDEX "proprietaires_matricule_key" ON "proprietaires"("matricule");
