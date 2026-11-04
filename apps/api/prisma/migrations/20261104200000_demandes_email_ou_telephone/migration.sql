-- Les demandes du site public (messages et demandes de réservation) s'envoient avec une adresse e-mail OU un
-- numéro de téléphone : au moins l'un des deux, plus l'e-mail seul.
ALTER TABLE "contacts" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "reservation_requests" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_email_ou_telephone"
  CHECK ("email" IS NOT NULL OR "telephone" IS NOT NULL);
ALTER TABLE "reservation_requests"
  ADD CONSTRAINT "reservation_requests_email_ou_telephone"
  CHECK ("email" IS NOT NULL OR "telephone" IS NOT NULL);
