-- CreateTable
CREATE TABLE "Notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_profile_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_id" TEXT,
    "source_event_id" TEXT NOT NULL,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notifications_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "Patient_Profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Notifications_source_event_id_key" ON "Notifications"("source_event_id");

-- CreateIndex
CREATE INDEX "Notifications_patient_profile_id_created_at_idx" ON "Notifications"("patient_profile_id", "created_at");
