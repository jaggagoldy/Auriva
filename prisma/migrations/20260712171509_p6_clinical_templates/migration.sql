-- CreateTable
CREATE TABLE "Clinical_Templates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "advice" TEXT,
    "exercises" TEXT,
    "follow_up_days" INTEGER,
    "is_favourite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinical_Templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Clinical_Templates" ADD CONSTRAINT "Clinical_Templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinical_Templates" ADD CONSTRAINT "Clinical_Templates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
