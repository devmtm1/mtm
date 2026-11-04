-- Un espace client s'ouvre avec une adresse e-mail OU un numéro de téléphone : l'e-mail devient facultatif et
-- le numéro (format international, unique) sert d'identifiant de connexion.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN "telephoneConnexion" TEXT;

CREATE UNIQUE INDEX "users_telephoneConnexion_key" ON "users"("telephoneConnexion");

-- Jamais de compte sans identifiant : au moins l'un des deux doit être renseigné.
ALTER TABLE "users" ADD CONSTRAINT "users_identifiant_requis" CHECK ("email" IS NOT NULL OR "telephoneConnexion" IS NOT NULL);
