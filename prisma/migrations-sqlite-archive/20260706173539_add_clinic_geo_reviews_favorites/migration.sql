-- CreateTable
CREATE TABLE "Reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Patient_Favorite_Doctors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Patient_Favorite_Doctors_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Patient_Favorite_Doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "latitude" REAL,
    "longitude" REAL,
    CONSTRAINT "Clinics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clinics_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clinics" ("address", "allow_double_booking", "allow_walk_ins", "buffer_minutes", "cancellation_window_hours", "closes_at", "default_consultation_fee", "default_slot_duration_minutes", "id", "max_appointments_per_doctor_per_day", "name", "opens_at", "organization_id", "super_admin_id", "timezone", "working_days") SELECT "address", "allow_double_booking", "allow_walk_ins", "buffer_minutes", "cancellation_window_hours", "closes_at", "default_consultation_fee", "default_slot_duration_minutes", "id", "max_appointments_per_doctor_per_day", "name", "opens_at", "organization_id", "super_admin_id", "timezone", "working_days" FROM "Clinics";
DROP TABLE "Clinics";
ALTER TABLE "new_Clinics" RENAME TO "Clinics";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_Favorite_Doctors_patient_id_doctor_id_key" ON "Patient_Favorite_Doctors"("patient_id", "doctor_id");
