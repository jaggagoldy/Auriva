-- AlterTable
ALTER TABLE "Clinics" ADD COLUMN     "billing_policy" TEXT NOT NULL DEFAULT 'postpaid';

-- AlterTable
ALTER TABLE "Services" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Consultation',
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'clinical',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Service_Events" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "service_id" TEXT,
    "service_version" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "needs_catalog_review" BOOLEAN NOT NULL DEFAULT false,
    "reversal_reason" TEXT,
    "added_by_user_id" TEXT,
    "added_by_role" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "Service_Events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "service_event_id" TEXT,
    "origin" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "qty" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "tax_amount" INTEGER,
    "discount_amount" INTEGER,
    "net_amount" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_Lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_Events_clinic_id_status_idx" ON "Service_Events"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "Service_Events_appointment_id_idx" ON "Service_Events"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_Lines_service_event_id_key" ON "Invoice_Lines"("service_event_id");

-- CreateIndex
CREATE INDEX "Invoice_Lines_invoice_id_idx" ON "Invoice_Lines"("invoice_id");

-- AddForeignKey
ALTER TABLE "Service_Events" ADD CONSTRAINT "Service_Events_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service_Events" ADD CONSTRAINT "Service_Events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service_Events" ADD CONSTRAINT "Service_Events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service_Events" ADD CONSTRAINT "Service_Events_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Lines" ADD CONSTRAINT "Invoice_Lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Lines" ADD CONSTRAINT "Invoice_Lines_service_event_id_fkey" FOREIGN KEY ("service_event_id") REFERENCES "Service_Events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
