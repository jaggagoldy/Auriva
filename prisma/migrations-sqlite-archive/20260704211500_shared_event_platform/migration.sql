-- CreateTable
CREATE TABLE "Event_Logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_type" TEXT NOT NULL,
    "occurred_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "entity_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event_Handler_Logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_log_id" TEXT NOT NULL,
    "handler_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Event_Handler_Logs_event_log_id_fkey" FOREIGN KEY ("event_log_id") REFERENCES "Event_Logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_Handler_Logs_event_log_id_handler_name_key" ON "Event_Handler_Logs"("event_log_id", "handler_name");

