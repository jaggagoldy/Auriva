-- AlterTable
ALTER TABLE "Invitations" ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;
