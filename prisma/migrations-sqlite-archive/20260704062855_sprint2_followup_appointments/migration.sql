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
    "chief_complaint" TEXT,
    "history_notes" TEXT,
    "vitals_json" TEXT,
    "diagnosis" TEXT,
    "prescription_notes" TEXT,
    "prescription_medicines_json" TEXT,
    "follow_up_date" DATETIME,
    "follow_up_source_appointment_id" TEXT,
    CONSTRAINT "Appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointments_follow_up_source_appointment_id_fkey" FOREIGN KEY ("follow_up_source_appointment_id") REFERENCES "Appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointments" ("checked_in_at", "chief_complaint", "clinic_id", "completed_at", "diagnosis", "doctor_id", "follow_up_date", "history_notes", "id", "notes", "patient_id", "prescription_medicines_json", "prescription_notes", "priority", "queue_number", "scheduled_time", "started_at", "status", "vitals_json", "walk_in") SELECT "checked_in_at", "chief_complaint", "clinic_id", "completed_at", "diagnosis", "doctor_id", "follow_up_date", "history_notes", "id", "notes", "patient_id", "prescription_medicines_json", "prescription_notes", "priority", "queue_number", "scheduled_time", "started_at", "status", "vitals_json", "walk_in" FROM "Appointments";
DROP TABLE "Appointments";
ALTER TABLE "new_Appointments" RENAME TO "Appointments";
CREATE UNIQUE INDEX "Appointments_follow_up_source_appointment_id_key" ON "Appointments"("follow_up_source_appointment_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
