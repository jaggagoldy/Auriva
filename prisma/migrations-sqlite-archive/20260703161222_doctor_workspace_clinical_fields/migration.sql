-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN "chief_complaint" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "diagnosis" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "follow_up_date" DATETIME;
ALTER TABLE "Appointments" ADD COLUMN "history_notes" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "prescription_medicines_json" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "prescription_notes" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "vitals_json" TEXT;

-- AlterTable
ALTER TABLE "Staff_Profiles" ADD COLUMN "bio" TEXT;
ALTER TABLE "Staff_Profiles" ADD COLUMN "consultation_fee" INTEGER;
ALTER TABLE "Staff_Profiles" ADD COLUMN "languages" TEXT;
ALTER TABLE "Staff_Profiles" ADD COLUMN "qualifications" TEXT;
ALTER TABLE "Staff_Profiles" ADD COLUMN "registration_number" TEXT;
ALTER TABLE "Staff_Profiles" ADD COLUMN "years_experience" INTEGER;
