-- CreateTable
CREATE TABLE "Releases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "release_date" DATETIME,
    "summary" TEXT NOT NULL,
    "public_notes" TEXT NOT NULL,
    "internal_notes" TEXT,
    "breaking_changes" TEXT,
    "migration_notes" TEXT,
    "known_issues" TEXT,
    "aps_items" TEXT,
    "sprint_numbers" TEXT,
    "feature_flags" TEXT,
    "published_at" DATETIME,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Releases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Release_Highlights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "release_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Release_Highlights_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "Releases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Release_Views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "release_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Release_Views_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "Releases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Release_Views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sprints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "goal" TEXT NOT NULL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "aps_items" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Users" ("email", "id", "is_active", "password_hash", "phone_number", "role") SELECT "email", "id", "is_active", "password_hash", "phone_number", "role" FROM "Users";
DROP TABLE "Users";
ALTER TABLE "new_Users" RENAME TO "Users";
CREATE UNIQUE INDEX "Users_phone_number_key" ON "Users"("phone_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Releases_version_key" ON "Releases"("version");

-- CreateIndex
CREATE INDEX "Releases_status_idx" ON "Releases"("status");

-- CreateIndex
CREATE INDEX "Releases_published_at_idx" ON "Releases"("published_at");

-- CreateIndex
CREATE INDEX "Release_Highlights_release_id_idx" ON "Release_Highlights"("release_id");

-- CreateIndex
CREATE INDEX "Release_Views_user_id_idx" ON "Release_Views"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Release_Views_release_id_user_id_key" ON "Release_Views"("release_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Sprints_number_key" ON "Sprints"("number");
