-- CreateTable
CREATE TABLE "Sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "Sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment_Events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "note" TEXT,
    "actor_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_Events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "scheduled_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "queue_number" INTEGER,
    "checked_in_at" DATETIME,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "walk_in" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "Appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Appointments" ("clinic_id", "doctor_id", "id", "patient_id", "scheduled_time", "status") SELECT "clinic_id", "doctor_id", "id", "patient_id", "scheduled_time", "status" FROM "Appointments";
DROP TABLE "Appointments";
ALTER TABLE "new_Appointments" RENAME TO "Appointments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_token_hash_key" ON "Sessions"("token_hash");
