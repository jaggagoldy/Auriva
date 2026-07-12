-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient_Profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "date_of_birth" DATETIME,
    "gender" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Patient_Profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Patient_Profiles" ("blood_group", "date_of_birth", "full_name", "gender", "id", "user_id") SELECT "blood_group", "date_of_birth", "full_name", "gender", "id", "user_id" FROM "Patient_Profiles";
DROP TABLE "Patient_Profiles";
ALTER TABLE "new_Patient_Profiles" RENAME TO "Patient_Profiles";
CREATE UNIQUE INDEX "Patient_Profiles_user_id_key" ON "Patient_Profiles"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
