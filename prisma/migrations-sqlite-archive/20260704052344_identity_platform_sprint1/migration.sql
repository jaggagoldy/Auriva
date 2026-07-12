/*
  Warnings:

  - Added the required column `health_id` to the `Patient_Profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sessions" ADD COLUMN "active_healthcare_profile_id" TEXT;

-- CreateTable
CREATE TABLE "Contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "healthcare_profile_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "verified_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contacts_healthcare_profile_id_fkey" FOREIGN KEY ("healthcare_profile_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account_Profile_Links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_user_id" TEXT NOT NULL,
    "healthcare_profile_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "linked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_Profile_Links_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Account_Profile_Links_healthcare_profile_id_fkey" FOREIGN KEY ("healthcare_profile_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient_Profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "date_of_birth" DATETIME,
    "gender" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "chronic_conditions" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "health_id" TEXT NOT NULL,
    "guardian_name" TEXT,
    "guardian_relation" TEXT,
    "registered_by_clinic_id" TEXT,
    "verification_level" TEXT NOT NULL DEFAULT 'unverified',
    CONSTRAINT "Patient_Profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Patient_Profiles_registered_by_clinic_id_fkey" FOREIGN KEY ("registered_by_clinic_id") REFERENCES "Clinics" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Backfill health_id for pre-existing rows (APS-029/010 Part II §12: backfill
-- before the NOT NULL + UNIQUE constraint applies). New rows going forward
-- get a properly-alphabetted id from src/domain/health-id.ts; this inline
-- generator only needs to satisfy existing dev-seed rows once.
INSERT INTO "new_Patient_Profiles" ("allergies", "blood_group", "chronic_conditions", "date_of_birth", "emergency_contact_name", "emergency_contact_phone", "full_name", "gender", "id", "onboarding_completed", "user_id", "health_id", "verification_level") SELECT "allergies", "blood_group", "chronic_conditions", "date_of_birth", "emergency_contact_name", "emergency_contact_phone", "full_name", "gender", "id", "onboarding_completed", "user_id", 'AUR-' || upper(substr(hex(randomblob(4)), 1, 6)), (CASE WHEN "user_id" IS NOT NULL THEN 'phone_verified' ELSE 'unverified' END) FROM "Patient_Profiles";
DROP TABLE "Patient_Profiles";
ALTER TABLE "new_Patient_Profiles" RENAME TO "Patient_Profiles";
CREATE UNIQUE INDEX "Patient_Profiles_user_id_key" ON "Patient_Profiles"("user_id");
CREATE UNIQUE INDEX "Patient_Profiles_health_id_key" ON "Patient_Profiles"("health_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Contacts_type_value_idx" ON "Contacts"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Account_Profile_Links_account_user_id_healthcare_profile_id_key" ON "Account_Profile_Links"("account_user_id", "healthcare_profile_id");
