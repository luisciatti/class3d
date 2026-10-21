-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provider" TEXT DEFAULT 'local',
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "refreshTokenHash" TEXT;
