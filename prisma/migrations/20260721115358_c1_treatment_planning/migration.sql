-- CreateTable
CREATE TABLE "Treatment_Plans" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "origin_appointment_id" TEXT,
    "parent_plan_id" TEXT,
    "title" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "sessions_planned" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_Plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment_Plan_Sessions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "appointment_id" TEXT,
    "service_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treatment_Plan_Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Treatment_Plans_clinic_id_patient_id_idx" ON "Treatment_Plans"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "Treatment_Plan_Sessions_plan_id_idx" ON "Treatment_Plan_Sessions"("plan_id");

-- CreateIndex
CREATE INDEX "Treatment_Plan_Sessions_appointment_id_idx" ON "Treatment_Plan_Sessions"("appointment_id");

-- AddForeignKey
ALTER TABLE "Treatment_Plans" ADD CONSTRAINT "Treatment_Plans_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment_Plan_Sessions" ADD CONSTRAINT "Treatment_Plan_Sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Treatment_Plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
