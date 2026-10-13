-- Le journal des envois SMS/WhatsApp garde le prestataire qui a porté chaque
-- envoi. Colonne facultative : les envois déjà consignés n'en ont pas.

-- AlterTable
ALTER TABLE "envois_canal" ADD COLUMN     "fournisseur" TEXT;
