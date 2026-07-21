-- CreateTable
CREATE TABLE "Documents" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "invoice_id" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "content_json" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by_user_id" TEXT,

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Documents_appointment_id_idx" ON "Documents"("appointment_id");

-- CreateIndex
CREATE INDEX "Documents_clinic_id_type_idx" ON "Documents"("clinic_id", "type");

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
