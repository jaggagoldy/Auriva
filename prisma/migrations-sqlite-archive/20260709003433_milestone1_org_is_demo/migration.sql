-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "archetype" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "owner_user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Organizations" ("address", "archetype", "contact_email", "contact_phone", "created_at", "id", "name", "owner_user_id", "timezone") SELECT "address", "archetype", "contact_email", "contact_phone", "created_at", "id", "name", "owner_user_id", "timezone" FROM "Organizations";
DROP TABLE "Organizations";
ALTER TABLE "new_Organizations" RENAME TO "Organizations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
