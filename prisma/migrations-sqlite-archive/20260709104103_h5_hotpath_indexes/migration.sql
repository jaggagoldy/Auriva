-- CreateIndex
CREATE INDEX "Appointments_clinic_id_scheduled_time_idx" ON "Appointments"("clinic_id", "scheduled_time");

-- CreateIndex
CREATE INDEX "Appointments_patient_id_idx" ON "Appointments"("patient_id");

-- CreateIndex
CREATE INDEX "Payments_clinic_id_received_at_idx" ON "Payments"("clinic_id", "received_at");
