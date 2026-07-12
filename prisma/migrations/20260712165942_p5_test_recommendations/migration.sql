-- CreateTable
CREATE TABLE "Test_Recommendations" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "test_code" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prep_instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "report_url" TEXT,
    "recommended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_Recommendations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Test_Recommendations" ADD CONSTRAINT "Test_Recommendations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test_Recommendations" ADD CONSTRAINT "Test_Recommendations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test_Recommendations" ADD CONSTRAINT "Test_Recommendations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test_Recommendations" ADD CONSTRAINT "Test_Recommendations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
