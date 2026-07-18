-- AlterTable
ALTER TABLE "Sessions" ADD COLUMN     "active_membership_id" TEXT;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "last_workspace_id" TEXT,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password_set_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Organization_Members_user_id_idx" ON "Organization_Members"("user_id");
