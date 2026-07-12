/*
  Warnings:

  - Added the required column `organization_id` to the `Clinics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinic_id` to the `Invitations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "owner_user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill (APS-029-style migration: preserve identity, not rewrite data):
-- every pre-existing Clinic gets an Organization row with THE SAME id. This
-- is what makes every existing organization_id value already stored in
-- Organization_Members/Invitations stay valid with zero rows rewritten, and
-- every existing single-clinic org behave identically to before this
-- migration. Only NEW clinics added to an org going forward (Sprint 3's
-- actual new capability) get an organization_id distinct from their own id.
INSERT INTO "Organizations" ("id", "name", "address", "owner_user_id", "created_at", "timezone")
SELECT "id", "name", "address", "super_admin_id", CURRENT_TIMESTAMP, 'Asia/Kolkata' FROM "Clinics";

-- CreateTable
CREATE TABLE "Departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "name" TEXT NOT NULL,
    "head_staff_id" TEXT,
    "default_consultation_fee" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Departments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Departments_head_staff_id_fkey" FOREIGN KEY ("head_staff_id") REFERENCES "Staff_Profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Doctor_Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Doctor_Availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Audit_Logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Audit_Logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clinics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "timezone" TEXT,
    "working_days" TEXT,
    "opens_at" TEXT,
    "closes_at" TEXT,
    "default_slot_duration_minutes" INTEGER DEFAULT 15,
    "buffer_minutes" INTEGER DEFAULT 0,
    "max_appointments_per_doctor_per_day" INTEGER,
    "allow_double_booking" BOOLEAN NOT NULL DEFAULT false,
    "allow_walk_ins" BOOLEAN NOT NULL DEFAULT true,
    "cancellation_window_hours" INTEGER,
    "default_consultation_fee" INTEGER,
    CONSTRAINT "Clinics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clinics_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clinics" ("address", "id", "name", "super_admin_id", "organization_id") SELECT "address", "id", "name", "super_admin_id", "id" FROM "Clinics";
DROP TABLE "Clinics";
ALTER TABLE "new_Clinics" RENAME TO "Clinics";
CREATE TABLE "new_Invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialty" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" DATETIME,
    CONSTRAINT "Invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- clinic_id backfills to organization_id: for every pre-existing invitation,
-- organization_id already equals the clinic id it was created for (the
-- pre-Sprint-3 world had exactly one clinic per organization).
INSERT INTO "new_Invitations" ("accepted_at", "created_at", "email", "full_name", "id", "organization_id", "clinic_id", "role", "specialty", "status", "token") SELECT "accepted_at", "created_at", "email", "full_name", "id", "organization_id", "organization_id", "role", "specialty", "status", "token" FROM "Invitations";
DROP TABLE "Invitations";
ALTER TABLE "new_Invitations" RENAME TO "Invitations";
CREATE UNIQUE INDEX "Invitations_token_key" ON "Invitations"("token");
CREATE TABLE "new_Organization_Members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_Members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Organization_Members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Organization_Members" ("created_at", "id", "organization_id", "role", "user_id") SELECT "created_at", "id", "organization_id", "role", "user_id" FROM "Organization_Members";
DROP TABLE "Organization_Members";
ALTER TABLE "new_Organization_Members" RENAME TO "Organization_Members";
CREATE UNIQUE INDEX "Organization_Members_organization_id_user_id_key" ON "Organization_Members"("organization_id", "user_id");
CREATE TABLE "new_Staff_Profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "specialty" TEXT,
    "full_name" TEXT NOT NULL,
    "bio" TEXT,
    "years_experience" INTEGER,
    "languages" TEXT,
    "qualifications" TEXT,
    "registration_number" TEXT,
    "consultation_fee" INTEGER,
    "follow_up_fee" INTEGER,
    "department_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Staff_Profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Staff_Profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Staff_Profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Staff_Profiles" ("bio", "clinic_id", "consultation_fee", "full_name", "id", "languages", "qualifications", "registration_number", "specialty", "user_id", "years_experience") SELECT "bio", "clinic_id", "consultation_fee", "full_name", "id", "languages", "qualifications", "registration_number", "specialty", "user_id", "years_experience" FROM "Staff_Profiles";
DROP TABLE "Staff_Profiles";
ALTER TABLE "new_Staff_Profiles" RENAME TO "Staff_Profiles";
CREATE UNIQUE INDEX "Staff_Profiles_user_id_key" ON "Staff_Profiles"("user_id");
CREATE TABLE "new_Users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Users" ("email", "id", "password_hash", "phone_number", "role") SELECT "email", "id", "password_hash", "phone_number", "role" FROM "Users";
DROP TABLE "Users";
ALTER TABLE "new_Users" RENAME TO "Users";
CREATE UNIQUE INDEX "Users_phone_number_key" ON "Users"("phone_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_Availability_doctor_id_day_of_week_key" ON "Doctor_Availability"("doctor_id", "day_of_week");
