-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reviews" ("comment", "created_at", "doctor_id", "id", "patient_id", "rating") SELECT "comment", "created_at", "doctor_id", "id", "patient_id", "rating" FROM "Reviews";
DROP TABLE "Reviews";
ALTER TABLE "new_Reviews" RENAME TO "Reviews";
CREATE UNIQUE INDEX "Reviews_appointment_id_key" ON "Reviews"("appointment_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
