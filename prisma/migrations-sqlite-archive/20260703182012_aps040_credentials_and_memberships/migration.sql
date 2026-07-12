-- AlterTable
ALTER TABLE "Users" ADD COLUMN "password_hash" TEXT;

-- CreateTable
CREATE TABLE "Organization_Members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_Members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Organization_Members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_Members_organization_id_user_id_key" ON "Organization_Members"("organization_id", "user_id");

-- APS-040 backfill: derive membership rows from existing data, applying the
-- specialty→role heuristic (src/domain/organization.ts) one final time.
-- After this migration, Organization_Members is the role source of truth.

-- Owners (implicit member from Clinics.super_admin_id)
INSERT INTO "Organization_Members" ("id", "organization_id", "user_id", "role")
SELECT lower(hex(randomblob(16))), c."id", c."super_admin_id", 'owner'
FROM "Clinics" c
WHERE NOT EXISTS (
  SELECT 1 FROM "Organization_Members" m
  WHERE m."organization_id" = c."id" AND m."user_id" = c."super_admin_id"
);

-- Staff (doctor if a specialty is set, receptionist otherwise) — skipping
-- anyone already inserted as owner above.
INSERT INTO "Organization_Members" ("id", "organization_id", "user_id", "role")
SELECT lower(hex(randomblob(16))), s."clinic_id", s."user_id",
       CASE WHEN s."specialty" IS NOT NULL AND s."specialty" != '' THEN 'doctor' ELSE 'receptionist' END
FROM "Staff_Profiles" s
WHERE NOT EXISTS (
  SELECT 1 FROM "Organization_Members" m
  WHERE m."organization_id" = s."clinic_id" AND m."user_id" = s."user_id"
);
