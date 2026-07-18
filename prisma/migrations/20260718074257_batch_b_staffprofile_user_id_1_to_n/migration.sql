-- DropIndex
DROP INDEX "Staff_Profiles_user_id_key";

-- CreateIndex
CREATE INDEX "Staff_Profiles_user_id_idx" ON "Staff_Profiles"("user_id");
