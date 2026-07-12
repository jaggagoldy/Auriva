-- CreateTable
CREATE TABLE "Doctor_Time_Blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME NOT NULL,
    "reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Doctor_Time_Blocks_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Doctor_Time_Blocks_doctor_id_start_at_idx" ON "Doctor_Time_Blocks"("doctor_id", "start_at");
