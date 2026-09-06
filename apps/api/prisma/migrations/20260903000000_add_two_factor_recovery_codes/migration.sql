-- Added twoFactorRecoveryCodes to users table
-- Was present in prisma/schema.prisma but missing from migrations
ALTER TABLE "users" ADD COLUMN     "twoFactorRecoveryCodes" TEXT;
