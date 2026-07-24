-- DropIndex
DROP INDEX "Invoices_appointment_id_key";

-- AlterTable
ALTER TABLE "Service_Events" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
