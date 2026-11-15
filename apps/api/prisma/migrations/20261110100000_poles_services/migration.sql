-- Pôles d'activité de MTM : page « Nos services » du site public, page de chaque pôle et section de l'accueil.
CREATE TABLE "poles" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "accroche" TEXT,
  "description" TEXT,
  "points" TEXT[],
  "storageKey" TEXT,
  "resourceType" TEXT NOT NULL DEFAULT 'image',
  "imageDefaut" TEXT,
  "lienUrl" TEXT,
  "libelleLien" TEXT,
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "surAccueil" BOOLEAN NOT NULL DEFAULT false,
  "lies" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "poles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "poles_slug_key" ON "poles"("slug");
CREATE INDEX "poles_isActive_idx" ON "poles"("isActive");
CREATE INDEX "poles_ordre_idx" ON "poles"("ordre");

-- Contenu de départ, à modifier depuis le back-office (Site web → Pôles et services).
-- Les photos viennent du site tant qu'aucune n'est envoyée. « surAccueil » : les quatre pôles qui ont une page complète
-- sont montrés sur l'accueil ; « lies » : les pôles proposés en complément sur la page de chacun.
-- Les boutons mènent au formulaire de la page (ancre), et les trois pôles sans page dédiée ouvrent leur propre page.
INSERT INTO "poles" ("id", "slug", "nom", "accroche", "description", "points", "imageDefaut", "lienUrl", "libelleLien", "ordre", "surAccueil", "lies", "updatedAt") VALUES
  (gen_random_uuid()::text, 'transaction', 'MTM Transaction', 'Achat – Vente – Commercialisation',
   'Vente de terrains, maisons, villas et appartements, recherche de biens et commercialisation de programmes.',
   ARRAY['Vente de terrains, maisons, villas, appartements', 'Recherche et acquisition de biens', 'Commercialisation de programmes immobiliers', 'Intermédiation et accompagnement'],
   '/poles/transaction.jpg', '/terrains', 'Voir nos biens', 1, true, ARRAY['gestion', 'controle'], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'gestion', 'MTM Gestion', 'Gestion immobilière et locative',
   'Gestion de vos biens, sélection de locataires, suivi des loyers et des charges, valorisation du patrimoine.',
   ARRAY['Gestion de biens (maisons, villas, appartements, bureaux)', 'Recherche et sélection de locataires', 'Suivi des loyers et des charges', 'Entretien et valorisation du patrimoine'],
   '/poles/gestion.jpg', '/gestion-locative#confier', 'Confier mon bien', 2, true, ARRAY['maintenance', 'clean', 'conciergerie'], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'controle', 'MTM Contrôle', 'Vérification foncière et inspection',
   'Vérification des documents fonciers, contrôle auprès des administrations, visites et rapports photographiques.',
   ARRAY['Vérification de documents fonciers', 'Contrôle auprès des administrations', 'Visites et inspection immobilière', 'Constats et rapports photographiques', 'Évaluation des risques fonciers'],
   '/poles/controle.jpg', '/demarches-administratives#demande-verification', 'Faire vérifier un terrain', 3, true, ARRAY['transaction', 'btp'], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'clean', 'MTM Clean', 'Nettoyage et entretien',
   'Nettoyage de maisons, villas, appartements et bureaux, y compris après travaux ou déménagement.',
   ARRAY['Nettoyage de maisons, villas, appartements et bureaux', 'Entretien de résidences et locaux professionnels', 'Nettoyage après travaux ou déménagement', 'Services réalisés avec des prestataires qualifiés'],
   '/poles/clean.jpg', '/nos-services/clean', 'Demander un devis', 4, false, ARRAY['maintenance', 'conciergerie'], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'conciergerie', 'MTM Conciergerie', 'Accueil et assistance',
   'Accueil des clients et locataires, remise des clés, préparation des logements et coordination des interventions.',
   ARRAY['Accueil des clients et des locataires', 'Remise et récupération des clés', 'Assistance aux propriétaires et occupants', 'Préparation des logements (séjour, location, vente)', 'Coordination des interventions (clean, maintenance, etc.)'],
   '/poles/conciergerie.jpg', '/nos-services/conciergerie', 'Nous contacter', 5, false, ARRAY['clean', 'maintenance', 'gestion'], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'maintenance', 'MTM Maintenance', 'Entretien – Dépannage – Réparation',
   'Entretien et réparations courantes, plomberie, électricité, climatisation, interventions rapides.',
   ARRAY['Entretien et réparations courantes', 'Plomberie, électricité, climatisation', 'Peinture et travaux de finition', 'Dépannage et interventions rapides', 'Coordination avec des artisans qualifiés'],
   '/poles/maintenance.jpg', '/nos-services/maintenance', 'Demander une intervention', 6, false, ARRAY['clean', 'conciergerie', 'gestion'], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'btp', 'MTM BTP, Architecture & Topographie', 'Construction – Conception – Études topographiques',
   'Construction et rénovation, plans 2D/3D, études de faisabilité, permis de construire et relevés topographiques.',
   ARRAY['Construction de maisons, villas et immeubles', 'Rénovation et réhabilitation', 'Conception architecturale et plans 2D/3D', 'Études de faisabilité et permis de construire', 'Relevés topographiques, bornage et implantation'],
   '/poles/btp.jpg', '/construction#devis', 'Demander un devis', 7, true, ARRAY['controle', 'maintenance'], CURRENT_TIMESTAMP);
