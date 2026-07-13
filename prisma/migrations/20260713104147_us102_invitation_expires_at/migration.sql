-- AlterTable
ALTER TABLE "Invitations" ADD COLUMN     "expires_at" TIMESTAMP(3);

-- BRD-043 US-102: backfill existing 'pending' invitations to a real 72h
-- expiry window from their creation time (most already in the past — this
-- closes a real gap where pre-Sprint-1 invitations had no expiry at all).
-- 'accepted'/'revoked' rows stay NULL: expiry is meaningless once resolved.
UPDATE "Invitations"
SET "expires_at" = "created_at" + INTERVAL '72 hours'
WHERE "status" = 'pending';
