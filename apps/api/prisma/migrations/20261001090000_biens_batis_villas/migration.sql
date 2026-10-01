-- MTM ne vend plus seulement du foncier : villas, appartements et studios
-- entrent au catalogue à côté des terrains nus.
--
-- Un champ discriminant plutôt qu'un second modèle : le partage entre un
-- terrain et une villa est d'environ 80 % (référence, propriétaire,
-- localisation, prix, mandats, dossiers de vente, visites, missions), et un
-- modèle séparé aurait obligé chaque relation de la chaîne commerciale à
-- porter « terrainId OU villaId ».
--
-- Toutes les colonnes du bâti sont nulles, et `typeBien` prend « terrain »
-- par défaut : les fiches déjà saisies restent exactes sans reprise.

ALTER TABLE "terrains"
  ADD COLUMN "typeBien" TEXT NOT NULL DEFAULT 'terrain',
  -- Surface habitable, distincte de la parcelle que porte « superficie ».
  -- Les confondre fausserait toute comparaison au catalogue : une villa de
  -- 120 m² habitables peut occuper une parcelle de 300 m².
  ADD COLUMN "surfaceHabitable" DECIMAL(10,2),
  ADD COLUMN "nombrePieces" TEXT,
  ADD COLUMN "nombreChambres" INTEGER,
  ADD COLUMN "nombreSallesEau" INTEGER,
  ADD COLUMN "niveaux" INTEGER,
  ADD COLUMN "anneeConstruction" INTEGER,
  ADD COLUMN "etatBien" TEXT;

-- Le catalogue public filtre par nature de bien dès la première requête.
CREATE INDEX "terrains_typeBien_idx" ON "terrains" ("typeBien");
