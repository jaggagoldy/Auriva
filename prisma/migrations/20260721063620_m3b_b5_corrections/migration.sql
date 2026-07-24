-- CreateTable
CREATE TABLE "Credit_Notes" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credit_Notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refunds" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "credit_note_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Credit_Notes_invoice_id_idx" ON "Credit_Notes"("invoice_id");

-- CreateIndex
CREATE INDEX "Refunds_credit_note_id_idx" ON "Refunds"("credit_note_id");

-- AddForeignKey
ALTER TABLE "Credit_Notes" ADD CONSTRAINT "Credit_Notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refunds" ADD CONSTRAINT "Refunds_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "Credit_Notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
