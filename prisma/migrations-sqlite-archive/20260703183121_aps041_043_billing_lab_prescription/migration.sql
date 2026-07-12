-- CreateTable
CREATE TABLE "Prescriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "notes" TEXT,
    "medicines_json" TEXT NOT NULL,
    "follow_up_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lab_Orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "tests_json" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "clinical_note" TEXT,
    "result_values_json" TEXT,
    "result_notes" TEXT,
    "ordered_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resulted_at" DATETIME,
    "resulted_by_user_id" TEXT,
    CONSTRAINT "Lab_Orders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lab_Orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lab_Orders_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lab_Orders_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_number" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "items_json" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_at" DATETIME,
    "paid_at" DATETIME,
    "voided_at" DATETIME,
    CONSTRAINT "Invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoices_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_user_id" TEXT,
    CONSTRAINT "Payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Prescriptions_appointment_id_key" ON "Prescriptions"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_appointment_id_key" ON "Invoices"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_clinic_id_invoice_number_key" ON "Invoices"("clinic_id", "invoice_number");

-- APS-043 backfill: lift existing prescriptions out of the Appointments
-- columns into first-class rows. Legacy columns stay (unread) until a
-- cleanup migration drops them.
INSERT INTO "Prescriptions" ("id", "appointment_id", "patient_id", "doctor_id", "clinic_id", "notes", "medicines_json", "follow_up_date", "created_at", "updated_at")
SELECT lower(hex(randomblob(16))), a."id", a."patient_id", a."doctor_id", a."clinic_id",
       a."prescription_notes", COALESCE(a."prescription_medicines_json", '[]'),
       a."follow_up_date", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Appointments" a
WHERE (a."prescription_medicines_json" IS NOT NULL AND a."prescription_medicines_json" != '')
   OR (a."prescription_notes" IS NOT NULL AND a."prescription_notes" != '');
